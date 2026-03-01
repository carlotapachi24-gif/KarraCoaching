const rawApiBase = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

export const API_BASE = rawApiBase;
export const IS_GITHUB_PAGES_HOST = window.location.hostname.endsWith('github.io');

export const apiUrl = (path: string) => {
  const normalizedPath = String(path || '').startsWith('/') ? String(path) : `/${String(path || '')}`;
  return API_BASE ? `${API_BASE}${normalizedPath}` : normalizedPath;
};
