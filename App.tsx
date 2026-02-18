import React, { useCallback, useEffect, useState } from 'react';
import { HashRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { DashboardClient } from './pages/DashboardClient';
import { DashboardCoach } from './pages/DashboardCoach';
import { CheckIn } from './pages/CheckIn';
import { Plan } from './pages/Plan';
import { Messages } from './pages/Messages';
import { Settings } from './pages/Settings';
import { Clients } from './pages/Clients';
import { Reviews } from './pages/Reviews';
import { Library } from './pages/Library';
import { Profile } from './pages/Profile';
import { Activities } from './pages/Activities';
import { UserRole } from './types';
import { Login } from './pages/Login';

interface AuthUser {
  email: string;
  role: UserRole;
}

interface SessionResponse {
  user: AuthUser;
}

interface LoginResponse extends SessionResponse {
  token: string;
}

const TOKEN_STORAGE_KEY = 'karra_auth_token';
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const IS_GITHUB_PAGES = window.location.hostname.endsWith('github.io');

const apiUrl = (path: string) => (API_BASE ? `${API_BASE}${path}` : path);

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  const fetchSession = useCallback(async () => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);

    if (!token) {
      setUser(null);
      setIsLoadingSession(false);
      return;
    }

    try {
      const response = await fetch(apiUrl('/api/session'), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        setUser(null);
        return;
      }

      const sessionData = (await response.json()) as SessionResponse;
      setUser(sessionData.user);
    } catch {
      setUser(null);
    } finally {
      setIsLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleLogin = async (email: string, password: string) => {
    if (IS_GITHUB_PAGES && !API_BASE) {
      throw new Error('Falta configurar VITE_API_BASE_URL en GitHub Actions (Variables).');
    }

    try {
      const response = await fetch(apiUrl('/api/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

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

      const loginData = (await response.json()) as LoginResponse;
      window.localStorage.setItem(TOKEN_STORAGE_KEY, loginData.token);
      setUser(loginData.user);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('No se pudo conectar con el backend');
    }
  };

  const handleLogout = async () => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);

    try {
      if (token) {
        await fetch(apiUrl('/api/logout'), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } finally {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
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

  return (
    <Router>
      <div className="flex min-h-screen bg-background font-sans text-text">
        <Sidebar role={user.role} email={user.email} onLogout={handleLogout} />

        <main className="flex-1 p-4 md:p-8 lg:p-10 pt-20 md:pt-10 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route
                path="/"
                element={user.role === UserRole.CLIENT ? <DashboardClient /> : <DashboardCoach />}
              />

              <Route
                path="/client/:clientId"
                element={user.role === UserRole.COACH ? <DashboardClient /> : <Navigate to="/" replace />}
              />
              <Route
                path="/profile"
                element={user.role === UserRole.CLIENT ? <Profile /> : <Navigate to="/" replace />}
              />
              <Route
                path="/checkin"
                element={user.role === UserRole.CLIENT ? <CheckIn /> : <Navigate to="/" replace />}
              />
              <Route
                path="/plan"
                element={user.role === UserRole.CLIENT ? <Plan /> : <Navigate to="/" replace />}
              />
              <Route
                path="/activities"
                element={user.role === UserRole.CLIENT ? <Activities /> : <Navigate to="/" replace />}
              />
              <Route path="/messages" element={<Messages />} />
              <Route path="/settings" element={<Settings />} />
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
                element={user.role === UserRole.COACH ? <Library /> : <Navigate to="/" replace />}
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
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
