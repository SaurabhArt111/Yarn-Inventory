import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { authApi } from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | anonymous

  const refresh = useCallback(async () => {
    try {
      const data = await authApi.me();
      setUser(data.user || null);
      setTenant(data.tenant || null);
      setStatus(data.user ? 'authenticated' : 'anonymous');
    } catch {
      setUser(null);
      setTenant(null);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (payload) => {
    const data = await authApi.login(payload);
    setUser(data.user);
    setTenant(data.tenant);
    setStatus('authenticated');
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await authApi.register(payload);
    setUser(data.user);
    setTenant(data.tenant);
    setStatus('authenticated');
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setTenant(null);
      setStatus('anonymous');
    }
  }, []);

  // Frontend permission checks are a UX convenience only (hide/show
  // screens and buttons) -- the backend re-checks every permission on
  // every request regardless of what this returns.
  const can = useCallback(
    (...permissions) => {
      if (!user) return false;
      return permissions.every((p) => user.permissions?.includes(p));
    },
    [user]
  );

  const value = useMemo(
    () => ({ user, tenant, status, login, register, logout, refresh, can }),
    [user, tenant, status, login, register, logout, refresh, can]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
