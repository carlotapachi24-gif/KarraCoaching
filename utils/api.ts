const rawApiBase = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const forceApiBase = String(import.meta.env.VITE_FORCE_API_BASE || '').trim().toLowerCase() === 'true';

export const IS_GITHUB_PAGES_HOST = window.location.hostname.endsWith('github.io');
export const API_BASE = IS_GITHUB_PAGES_HOST || forceApiBase ? rawApiBase : '';

export const apiUrl = (path: string) => {
  const normalizedPath = String(path || '').startsWith('/') ? String(path) : `/${String(path || '')}`;
  return API_BASE ? `${API_BASE}${normalizedPath}` : normalizedPath;
};
