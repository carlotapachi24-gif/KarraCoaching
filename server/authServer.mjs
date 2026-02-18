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
const CLIENT_CREDENTIALS = process.env.CLIENT_CREDENTIALS || '';
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const sessions = new Map();
const messagesStore = new Map();
const reviewsStore = [];

function parseClientCredentials(rawValue) {
  return rawValue
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((credentials, entry) => {
      const [emailPart, ...passwordParts] = entry.split(':');
      const email = (emailPart || '').trim().toLowerCase();
      const password = passwordParts.join(':').trim();

      if (!email || !password) {
        return credentials;
      }

      credentials.set(email, password);
      return credentials;
    }, new Map());
}

const clientCredentialsMap = parseClientCredentials(CLIENT_CREDENTIALS);

function conversationKey(emailA, emailB) {
  return [emailA.toLowerCase(), emailB.toLowerCase()].sort().join('|');
}

function displayNameFromEmail(email) {
  const localPart = (email.split('@')[0] || '').trim();
  if (!localPart) return 'Cliente';
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function ensureClientExists(email) {
  if (!clientCredentialsMap.has(email)) {
    clientCredentialsMap.set(email, '');
  }
}

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

async function handleApi(req, res, requestUrl) {
  const pathname = requestUrl.pathname;
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

    // If CLIENT_CREDENTIALS is configured, only listed client users can log in.
    if (email !== COACH_EMAIL && clientCredentialsMap.size > 0) {
      const expectedPassword = clientCredentialsMap.get(email);
      if (!expectedPassword || expectedPassword !== password) {
        return json(req, res, 401, { message: 'Credenciales incorrectas' });
      }
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

  if (pathname === '/api/clients' && req.method === 'GET') {
    const session = readSession(req);
    if (!session) {
      return json(req, res, 401, { message: 'No autenticado' });
    }
    if (session.user.role !== 'COACH') {
      return json(req, res, 403, { message: 'Solo coach' });
    }

    const fromConfigured = Array.from(clientCredentialsMap.keys());
    const fromSessions = Array.from(sessions.values())
      .map((item) => item.user)
      .filter((user) => user.role === 'CLIENT')
      .map((user) => user.email);
    const uniqueEmails = Array.from(new Set([...fromConfigured, ...fromSessions]));
    const clients = uniqueEmails.map((email) => ({
      email,
      name: displayNameFromEmail(email),
    }));
    return json(req, res, 200, { clients });
  }

  if (pathname === '/api/messages' && req.method === 'GET') {
    const session = readSession(req);
    if (!session) {
      return json(req, res, 401, { message: 'No autenticado' });
    }

    const partnerEmail =
      session.user.role === 'COACH'
        ? String(requestUrl.searchParams.get('with') || '').trim().toLowerCase()
        : COACH_EMAIL;

    if (!partnerEmail || !partnerEmail.includes('@')) {
      return json(req, res, 400, { message: 'Falta parametro "with"' });
    }

    const key = conversationKey(session.user.email, partnerEmail);
    const messages = messagesStore.get(key) || [];
    return json(req, res, 200, { messages });
  }

  if (pathname === '/api/messages' && req.method === 'POST') {
    const session = readSession(req);
    if (!session) {
      return json(req, res, 401, { message: 'No autenticado' });
    }

    let body;
    try {
      body = await parseJsonBody(req);
    } catch {
      return json(req, res, 400, { message: 'Solicitud invalida' });
    }

    const toEmail = String(body.toEmail || '').trim().toLowerCase();
    const text = String(body.text || '').trim();
    if (!toEmail || !text) {
      return json(req, res, 400, { message: 'toEmail y text son obligatorios' });
    }

    if (session.user.role === 'CLIENT' && toEmail !== COACH_EMAIL) {
      return json(req, res, 403, { message: 'Un cliente solo puede escribir al coach' });
    }

    if (session.user.role === 'COACH' && toEmail === COACH_EMAIL) {
      return json(req, res, 403, { message: 'Destino invalido' });
    }

    const key = conversationKey(session.user.email, toEmail);
    const previous = messagesStore.get(key) || [];
    const message = {
      id: randomUUID(),
      senderEmail: session.user.email,
      senderRole: session.user.role,
      text,
      createdAt: new Date().toISOString(),
    };
    const updated = [...previous, message];
    messagesStore.set(key, updated);
    return json(req, res, 201, { message });
  }

  if (pathname === '/api/checkins' && req.method === 'POST') {
    const session = readSession(req);
    if (!session) {
      return json(req, res, 401, { message: 'No autenticado' });
    }
    if (session.user.role !== 'CLIENT') {
      return json(req, res, 403, { message: 'Solo clientes' });
    }

    let body;
    try {
      body = await parseJsonBody(req);
    } catch {
      return json(req, res, 400, { message: 'Solicitud invalida' });
    }

    const review = {
      id: randomUUID(),
      clientEmail: session.user.email,
      clientName: displayNameFromEmail(session.user.email),
      submittedAt: new Date().toISOString(),
      status: 'pending',
      weightKg: Number(body.weightKg || 0),
      energy: Number(body.energy || 0),
      sleep: Number(body.sleep || 0),
      stress: Number(body.stress || 0),
      adherence: Number(body.adherence || 0),
      comments: String(body.comments || '').trim(),
      feedback: '',
      reviewedAt: null,
      reviewedBy: null,
    };

    if (!review.weightKg || review.energy < 1 || review.sleep < 1 || review.stress < 1 || review.adherence < 1) {
      return json(req, res, 400, { message: 'Faltan datos del check-in' });
    }

    reviewsStore.unshift(review);
    ensureClientExists(session.user.email);
    return json(req, res, 201, { review });
  }

  if (pathname === '/api/reviews' && req.method === 'GET') {
    const session = readSession(req);
    if (!session) {
      return json(req, res, 401, { message: 'No autenticado' });
    }

    if (session.user.role === 'COACH') {
      return json(req, res, 200, { reviews: reviewsStore });
    }

    const ownReviews = reviewsStore.filter((review) => review.clientEmail === session.user.email);
    return json(req, res, 200, { reviews: ownReviews });
  }

  const reviewFeedbackMatch = pathname.match(/^\/api\/reviews\/([^/]+)\/feedback$/);
  if (reviewFeedbackMatch && req.method === 'POST') {
    const session = readSession(req);
    if (!session) {
      return json(req, res, 401, { message: 'No autenticado' });
    }
    if (session.user.role !== 'COACH') {
      return json(req, res, 403, { message: 'Solo coach' });
    }

    let body;
    try {
      body = await parseJsonBody(req);
    } catch {
      return json(req, res, 400, { message: 'Solicitud invalida' });
    }

    const feedback = String(body.feedback || '').trim();
    if (!feedback) {
      return json(req, res, 400, { message: 'Feedback obligatorio' });
    }

    const reviewId = reviewFeedbackMatch[1];
    const targetReview = reviewsStore.find((review) => review.id === reviewId);
    if (!targetReview) {
      return json(req, res, 404, { message: 'Revision no encontrada' });
    }

    targetReview.feedback = feedback;
    targetReview.status = 'completed';
    targetReview.reviewedAt = new Date().toISOString();
    targetReview.reviewedBy = session.user.email;

    return json(req, res, 200, { review: targetReview });
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
    return handleApi(req, res, requestUrl);
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
