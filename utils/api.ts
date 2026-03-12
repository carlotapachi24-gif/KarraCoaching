const rawApiBase = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const forceApiBase = String(import.meta.env.VITE_FORCE_API_BASE || '').trim().toLowerCase() === 'true';
const hasConfiguredApiBase = rawApiBase.length > 0;

export const IS_GITHUB_PAGES_HOST = window.location.hostname.endsWith('github.io');
const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const shouldUseConfiguredApiBase =
  hasConfiguredApiBase && (IS_GITHUB_PAGES_HOST || forceApiBase || !isLocalHost);

export const API_BASE = shouldUseConfiguredApiBase ? rawApiBase : '';

export const apiUrl = (path: string) => {
  const normalizedPath = String(path || '').startsWith('/') ? String(path) : `/${String(path || '')}`;
  return API_BASE ? `${API_BASE}${normalizedPath}` : normalizedPath;
};
