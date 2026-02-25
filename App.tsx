import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { HashRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ClientProfileData, UserRole } from './types';
import { Login } from './pages/Login';
import { deriveUserIdentity } from './utils/userIdentity';
import { WhatsAppFloatingButton } from './components/WhatsAppFloatingButton';

interface AuthUser {
  email: string;
  role: UserRole;
}

interface SessionResponse {
  user: AuthUser;
  profile?: ClientProfileData;
}

interface LoginResponse extends SessionResponse {
  token: string;
  profile?: ClientProfileData;
}

const TOKEN_STORAGE_KEY = 'karra_auth_token';
const AUTH_USER_STORAGE_KEY = 'karra_auth_user';
const PROFILE_CACHE_PREFIX = 'karra_profile_cache:';
const REQUEST_TIMEOUT_MS = 12000;
const LOGIN_TIMEOUT_MS = 60000;
const LOGIN_WARMUP_MAX_WAIT_MS = 90000;
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const IS_GITHUB_PAGES = window.location.hostname.endsWith('github.io');

const apiUrl = (path: string) => (API_BASE ? `${API_BASE}${path}` : path);
const normalizeEmail = (email: string) => String(email || '').trim().toLowerCase();

const fetchWithTimeout = async (url: string, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const mapNetworkErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'El backend esta tardando en despertar. Espera unos segundos y vuelve a intentarlo.';
  }
  if (error instanceof TypeError) {
    return 'No se pudo conectar con el backend.';
  }
  if (error instanceof Error && String(error.message || '').trim()) {
    return error.message;
  }
  return fallbackMessage;
};

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError';

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

const waitForBackendReady = async (maxWaitMs = LOGIN_WARMUP_MAX_WAIT_MS) => {
  const startedAt = Date.now();
  let attempt = 0;

  while (Date.now() - startedAt < maxWaitMs) {
    attempt += 1;
    try {
      const response = await fetchWithTimeout(apiUrl('/api/health'), {}, 10000);
      if (response.ok) {
        return true;
      }
    } catch {
      // ignore and retry
    }

    const backoffMs = Math.min(1500 + attempt * 500, 5000);
    await wait(backoffMs);
  }

  return false;
};

const safeJsonParse = <T,>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const readCachedUser = (): AuthUser | null => {
  const cached = safeJsonParse<{ email?: string; role?: string }>(
    window.localStorage.getItem(AUTH_USER_STORAGE_KEY),
  );
  const email = normalizeEmail(cached?.email || '');
  const role = String(cached?.role || '').toUpperCase();
  if (!email || (role !== UserRole.CLIENT && role !== UserRole.COACH)) {
    return null;
  }
  return {
    email,
    role: role as UserRole,
  };
};

const writeCachedUser = (user: AuthUser) => {
  window.localStorage.setItem(
    AUTH_USER_STORAGE_KEY,
    JSON.stringify({
      email: normalizeEmail(user.email),
      role: user.role,
    }),
  );
};

const clearCachedUser = () => {
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
};

const profileCacheKey = (email: string) => `${PROFILE_CACHE_PREFIX}${normalizeEmail(email)}`;

const readCachedProfile = (email: string): ClientProfileData | null => {
  const cached = safeJsonParse<ClientProfileData>(
    window.localStorage.getItem(profileCacheKey(email)),
  );
  if (!cached || typeof cached !== 'object') {
    return null;
  }
  return cached;
};

const writeCachedProfile = (email: string, profile: ClientProfileData) => {
  window.localStorage.setItem(profileCacheKey(email), JSON.stringify(profile));
};

const clearCachedProfile = (email: string) => {
  window.localStorage.removeItem(profileCacheKey(email));
};

const DashboardClient = lazy(() =>
  import('./pages/DashboardClient').then((module) => ({ default: module.DashboardClient })),
);
const DashboardCoach = lazy(() =>
  import('./pages/DashboardCoach').then((module) => ({ default: module.DashboardCoach })),
);
const CheckIn = lazy(() => import('./pages/CheckIn').then((module) => ({ default: module.CheckIn })));
const Plan = lazy(() => import('./pages/Plan').then((module) => ({ default: module.Plan })));
const Messages = lazy(() =>
  import('./pages/Messages').then((module) => ({ default: module.Messages })),
);
const Settings = lazy(() =>
  import('./pages/Settings').then((module) => ({ default: module.Settings })),
);
const Clients = lazy(() => import('./pages/Clients').then((module) => ({ default: module.Clients })));
const Reviews = lazy(() => import('./pages/Reviews').then((module) => ({ default: module.Reviews })));
const Library = lazy(() => import('./pages/Library').then((module) => ({ default: module.Library })));
const ProfilePage = lazy(() =>
  import('./pages/Profile').then((module) => ({ default: module.Profile })),
);
const Activities = lazy(() =>
  import('./pages/Activities').then((module) => ({ default: module.Activities })),
);

const PageLoadingFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <p className="font-display font-bold text-xl text-slate-500 uppercase tracking-wide">Cargando pagina...</p>
  </div>
);

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfileData | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  const buildDefaultProfile = useCallback((email: string): ClientProfileData => {
    const identity = deriveUserIdentity(email, UserRole.CLIENT);
    const parts = identity.fullName.split(' ');
    const [firstName = identity.firstName, ...rest] = parts;
    return {
      firstName,
      lastName: rest.join(' '),
      email,
      phone: '+34 600 000 000',
      birthDate: '1995-05-20',
      heightCm: 182,
      startWeightKg: 90.2,
      currentWeightKg: 83.5,
      bio: 'Quiero mejorar mi fuerza en basicos y bajar un 5% de grasa corporal para el verano.',
      injuries: [
        'Tendinopatia rotuliana leve (Rodilla derecha) - En rehabilitacion.',
        'Molestia hombro izquierdo en press vertical pesado.',
      ],
      avatarUrl: `https://picsum.photos/seed/${encodeURIComponent(email)}/150`,
    };
  }, []);

  const loadProfile = useCallback(
    async (email: string) => {
      const normalizedEmail = normalizeEmail(email);
      const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
      const fallbackProfile = buildDefaultProfile(normalizedEmail);
      const cachedProfile = readCachedProfile(normalizedEmail);

      if (cachedProfile) {
        setClientProfile({
          ...fallbackProfile,
          ...cachedProfile,
          email: normalizedEmail,
        });
      }

      if (!token) {
        if (!cachedProfile) {
          setClientProfile(fallbackProfile);
        }
        return;
      }

      try {
        const response = await fetchWithTimeout(apiUrl('/api/profile'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          if (!cachedProfile) {
            setClientProfile(fallbackProfile);
          }
          return;
        }

        const data = (await response.json()) as { profile: ClientProfileData };
        const resolvedProfile = {
          ...fallbackProfile,
          ...data.profile,
          email: normalizedEmail,
        };
        setClientProfile(resolvedProfile);
        writeCachedProfile(normalizedEmail, resolvedProfile);
      } catch {
        if (!cachedProfile) {
          setClientProfile(fallbackProfile);
        }
      }
    },
    [buildDefaultProfile],
  );

  const saveProfile = useCallback(async (email: string, profile: ClientProfileData) => {
    const normalizedEmail = normalizeEmail(email);
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      throw new Error('Sesion expirada');
    }

    const response = await fetchWithTimeout(apiUrl('/api/profile'), {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profile),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'No se pudo guardar el perfil' }));
      throw new Error(error.message || 'No se pudo guardar el perfil');
    }

    const data = (await response.json()) as { profile: ClientProfileData };
    const resolvedProfile = {
      ...buildDefaultProfile(normalizedEmail),
      ...data.profile,
      email: normalizedEmail,
    };
    setClientProfile(resolvedProfile);
    writeCachedProfile(normalizedEmail, resolvedProfile);
  }, [buildDefaultProfile]);

  const fetchSession = useCallback(async () => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    const cachedUser = readCachedUser();

    if (cachedUser) {
      setUser(cachedUser);
      setIsLoadingSession(false);
    }

    if (!token) {
      clearCachedUser();
      setUser(null);
      setIsLoadingSession(false);
      return;
    }

    try {
      const response = await fetchWithTimeout(apiUrl('/api/session'), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
          clearCachedUser();
          setUser(null);
        } else if (!cachedUser) {
          setUser(null);
        }
        return;
      }

      const sessionData = (await response.json()) as SessionResponse;
      setUser(sessionData.user);
      writeCachedUser(sessionData.user);

      if (sessionData.user.role === UserRole.CLIENT && sessionData.profile) {
        const normalizedEmail = normalizeEmail(sessionData.user.email);
        const resolvedProfile = {
          ...buildDefaultProfile(normalizedEmail),
          ...sessionData.profile,
          email: normalizedEmail,
        };
        setClientProfile(resolvedProfile);
        writeCachedProfile(normalizedEmail, resolvedProfile);
      }
    } catch {
      if (!cachedUser) {
        setUser(null);
      }
    } finally {
      if (!cachedUser) {
        setIsLoadingSession(false);
      }
    }
  }, [buildDefaultProfile]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (!user || user.role !== UserRole.CLIENT) {
      setClientProfile(null);
      return;
    }

    const normalizedEmail = normalizeEmail(user.email);
    if (clientProfile && normalizeEmail(clientProfile.email) === normalizedEmail) {
      return;
    }

    loadProfile(user.email);
  }, [clientProfile, loadProfile, user]);

  const handleLogin = async (email: string, password: string) => {
    if (IS_GITHUB_PAGES && !API_BASE) {
      throw new Error('Falta configurar VITE_API_BASE_URL en GitHub Actions (Variables).');
    }

    const requestLogin = async () => {
      const response = await fetchWithTimeout(apiUrl('/api/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      }, LOGIN_TIMEOUT_MS);

      if (!response.ok) {
        const rawText = await response.text();
        let message = 'No se pudo iniciar sesion';

        try {
          const parsed = JSON.parse(rawText) as { message?: string };
          message = parsed.message || message;
        } catch {
          if (response.status === 404) {
            message = `Backend no disponible en ${apiUrl('/api/login')}`;
          } else {
            message = `Error ${response.status} en ${apiUrl('/api/login')}`;
          }
        }

        throw new Error(message);
      }

      return (await response.json()) as LoginResponse;
    };

    try {
      let loginData: LoginResponse;
      try {
        loginData = await requestLogin();
      } catch (error) {
        if (!isAbortError(error)) {
          throw error;
        }

        const isReady = await waitForBackendReady();
        if (!isReady) {
          throw error;
        }

        loginData = await requestLogin();
      }

      window.localStorage.setItem(TOKEN_STORAGE_KEY, loginData.token);
      setUser(loginData.user);
      writeCachedUser(loginData.user);

      const normalizedEmail = normalizeEmail(loginData.user.email || email);
      if (loginData.user.role === UserRole.CLIENT && loginData.profile) {
        const resolvedProfile = {
          ...buildDefaultProfile(normalizedEmail),
          ...loginData.profile,
          email: normalizedEmail,
        };
        setClientProfile(resolvedProfile);
        writeCachedProfile(normalizedEmail, resolvedProfile);
      }
    } catch (error) {
      throw new Error(mapNetworkErrorMessage(error, 'No se pudo conectar con el backend'));
    }
  };

  const handleLogout = async () => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    const cachedUser = readCachedUser() || user;

    try {
      if (token) {
        await fetchWithTimeout(apiUrl('/api/logout'), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } finally {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      clearCachedUser();
      if (cachedUser?.role === UserRole.CLIENT) {
        clearCachedProfile(cachedUser.email);
      }
      setClientProfile(null);
      setUser(null);
    }
  };

  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="font-display font-bold text-xl text-slate-500 uppercase tracking-wide">Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const userIdentity =
    user.role === UserRole.CLIENT && clientProfile
      ? {
          firstName: clientProfile.firstName || 'Cliente',
          fullName: `${clientProfile.firstName} ${clientProfile.lastName}`.trim(),
        }
      : deriveUserIdentity(user.email, user.role);

  return (
    <Router>
      <div className="flex min-h-screen bg-background font-sans text-text">
        <Sidebar role={user.role} email={user.email} displayName={userIdentity.fullName} onLogout={handleLogout} />

        <main className="flex-1 p-4 md:p-8 lg:p-10 pt-20 md:pt-10 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
                <Route
                  path="/"
                  element={
                    user.role === UserRole.CLIENT ? (
                      <DashboardClient
                        currentClientName={userIdentity.firstName}
                        currentClientFullName={userIdentity.fullName}
                        currentClientEmail={user.email}
                        currentClientAvatarUrl={clientProfile?.avatarUrl}
                        currentClientBio={clientProfile?.bio}
                        currentClientBirthDate={clientProfile?.birthDate}
                        currentClientHeightCm={clientProfile?.heightCm}
                        currentClientStartWeightKg={clientProfile?.startWeightKg}
                        currentClientCurrentWeightKg={clientProfile?.currentWeightKg}
                        currentClientInjuries={clientProfile?.injuries}
                      />
                    ) : (
                      <DashboardCoach />
                    )
                  }
                />

                <Route
                  path="/client/:clientId"
                  element={user.role === UserRole.COACH ? <DashboardClient /> : <Navigate to="/" replace />}
                />
                <Route
                  path="/profile"
                  element={
                    user.role === UserRole.CLIENT ? (
                      <ProfilePage
                        clientName={userIdentity.fullName}
                        clientEmail={user.email}
                        avatarUrl={clientProfile?.avatarUrl}
                        objectiveText={clientProfile?.bio}
                        birthDate={clientProfile?.birthDate}
                        heightCm={clientProfile?.heightCm}
                        startWeightKg={clientProfile?.startWeightKg}
                        currentWeightKg={clientProfile?.currentWeightKg}
                        injuries={clientProfile?.injuries}
                      />
                    ) : (
                      <Navigate to="/" replace />
                    )
                  }
                />
                <Route
                  path="/checkin"
                  element={user.role === UserRole.CLIENT ? <CheckIn /> : <Navigate to="/" replace />}
                />
                <Route
                  path="/plan"
                  element={<Plan currentUserRole={user.role} currentUserEmail={user.email} />}
                />
                <Route
                  path="/activities"
                  element={user.role === UserRole.CLIENT ? <Activities /> : <Navigate to="/" replace />}
                />
                <Route path="/messages" element={<Messages currentUserEmail={user.email} currentUserRole={user.role} />} />
                <Route
                  path="/settings"
                  element={
                    user.role === UserRole.CLIENT ? (
                      <Settings
                        userName={userIdentity.fullName}
                        userEmail={user.email}
                        initialProfile={clientProfile || buildDefaultProfile(user.email)}
                        onSaveProfile={(updated) => saveProfile(user.email, updated)}
                        onLogout={handleLogout}
                      />
                    ) : (
                      <Settings userName="Carlota" userEmail={user.email} onLogout={handleLogout} />
                    )
                  }
                />
                <Route
                  path="/clients"
                  element={user.role === UserRole.COACH ? <Clients /> : <Navigate to="/" replace />}
                />
                <Route
                  path="/reviews"
                  element={user.role === UserRole.COACH ? <Reviews /> : <Navigate to="/" replace />}
                />
                <Route
                  path="/library"
                  element={user.role === UserRole.COACH ? <Library /> : <Library readOnly />}
                />

                <Route
                  path="*"
                  element={
                    <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
                      <span className="font-display text-2xl font-bold mb-2">Proximamente</span>
                      <p>Esta pagina esta en construccion.</p>
                    </div>
                  }
                />
              </Routes>
            </Suspense>
          </div>
        </main>
        {user.role === UserRole.CLIENT && <WhatsAppFloatingButton />}
      </div>
    </Router>
  );
}

export default App;
