import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../lib/api';

const AuthContext = createContext(null);
const SESSION_KEY = 'undangan.id.session';

const readSession = () => {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);
  const [isChecking, setIsChecking] = useState(Boolean(readSession()?.access_token));

  useEffect(() => {
    if (!session?.access_token) return undefined;

    let active = true;
    authApi.currentUser(session.access_token)
      .then((result) => {
        if (active) setSession((current) => ({ ...current, user: result.user }));
      })
      .catch(() => {
        sessionStorage.removeItem(SESSION_KEY);
        if (active) setSession(null);
      })
      .finally(() => {
        if (active) setIsChecking(false);
      });

    return () => { active = false; };
  }, []);

  const saveSession = (result) => {
    const nextSession = { access_token: result.access_token, user: result.user };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
    setIsChecking(false);
    return result.user;
  };

  const login = async (credentials) => saveSession(await authApi.login(credentials));
  const register = async (details) => saveSession(await authApi.register(details));
  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  const value = useMemo(() => ({
    user: session?.user || null,
    token: session?.access_token || null,
    isChecking,
    login,
    register,
    logout,
  }), [session, isChecking]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
