import { createServer } from 'node:http';
import { createHmac, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

const PORT = Number(process.env.PORT || 8787);
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-production';
const COACH_EMAIL = 'carlotaloopezcarracedo@gmail.com';
const COACH_PASSWORD = '123456';
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const sessions = new Map();

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function getCorsHeaders(req) {
  const requestOrigin = req.headers.origin || '';
  let allowOrigin = '*';

  if (ALLOWED_ORIGINS.length > 0) {
    allowOrigin = ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0];
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    Vary: 'Origin',
  };
}

function json(req, res, statusCode, body) {
  res.writeHead(statusCode, {
    ...getCorsHeaders(req),
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(body));
}

function signTokenId(tokenId) {
  return createHmac('sha256', SESSION_SECRET).update(tokenId).digest('hex');
}

function createAuthToken() {
  const tokenId = randomUUID();
  const signature = signTokenId(tokenId);
  return `${tokenId}.${signature}`;
}

function parseBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length).trim();
}

function readSession(req) {
  const token = parseBearerToken(req);
  if (!token) {
    return null;
  }

  const [tokenId, signature] = token.split('.');
  if (!tokenId || !signature) {
    return null;
  }

  if (signTokenId(tokenId) !== signature) {
    return null;
  }

  const session = sessions.get(tokenId);
  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    sessions.delete(tokenId);
    return null;
  }

  return { tokenId, ...session };
}

async function parseJsonBody(req) {
  let body = '';

  for await (const chunk of req) {
    body += chunk;

    if (body.length > 1_000_000) {
      throw new Error('Body too large');
    }
  }

  if (!body) {
    return {};
  }

  return JSON.parse(body);
}

function buildUserFromEmail(email) {
  const normalizedEmail = email.toLowerCase();
  const role = normalizedEmail === COACH_EMAIL ? 'COACH' : 'CLIENT';
  return {
    email: normalizedEmail,
    role,
  };
}

async function handleApi(req, res, pathname) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, getCorsHeaders(req));
    res.end();
    return;
  }

  if (pathname === '/api/login' && req.method === 'POST') {
    let body;

    try {
      body = await parseJsonBody(req);
    } catch {
      return json(req, res, 400, { message: 'Solicitud invalida' });
    }

    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password || !email.includes('@')) {
      return json(req, res, 400, { message: 'Correo y contrasena obligatorios' });
    }

    if (email === COACH_EMAIL && password !== COACH_PASSWORD) {
      return json(req, res, 401, { message: 'Credenciales incorrectas' });
    }

    const user = buildUserFromEmail(email);
    const token = createAuthToken();
    const [tokenId] = token.split('.');

    sessions.set(tokenId, {
      user,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });

    return json(req, res, 200, { user, token });
  }

  if (pathname === '/api/session' && req.method === 'GET') {
    const session = readSession(req);

    if (!session) {
      return json(req, res, 401, { message: 'No autenticado' });
    }

    return json(req, res, 200, { user: session.user });
  }

  if (pathname === '/api/logout' && req.method === 'POST') {
    const session = readSession(req);

    if (session) {
      sessions.delete(session.tokenId);
    }

    return json(req, res, 200, { success: true });
  }

  return json(req, res, 404, { message: 'Not found' });
}

async function serveStatic(res, pathname) {
  const relativePath = pathname === '/' ? '/index.html' : pathname;
  const targetPath = path.normalize(path.join(distDir, relativePath));

  if (!targetPath.startsWith(distDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const file = await readFile(targetPath);
    const extension = path.extname(targetPath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': contentTypes[extension] || 'application/octet-stream',
    });
    res.end(file);
  } catch {
    try {
      const indexFile = await readFile(path.join(distDir, 'index.html'));
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
      });
      res.end(indexFile);
    } catch {
      res.writeHead(500, {
        'Content-Type': 'text/plain; charset=utf-8',
      });
      res.end('Build not found. Run npm run build first.');
    }
  }
}

const server = createServer(async (req, res) => {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (requestUrl.pathname.startsWith('/api/')) {
    return handleApi(req, res, requestUrl.pathname);
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, {
      'Content-Type': 'application/json; charset=utf-8',
    });
    res.end(JSON.stringify({ message: 'Method not allowed' }));
    return;
  }

  await serveStatic(res, requestUrl.pathname);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Karra backend listening on http://localhost:${PORT}`);
});
