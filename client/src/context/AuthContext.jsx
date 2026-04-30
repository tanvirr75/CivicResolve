import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '../services/api';
import i18n from '../i18n'; // adjust path if your i18n init file is elsewhere

// ─── Context ─────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ─── Helper: decode JWT payload without a library ────────────────────────────
function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    // atob handles base64; replace chars for URL-safe base64
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);   // full user object from /auth/me
  const [token, setToken]     = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Hydrate user from the server whenever we have a token
  const hydrateUser = useCallback(async (activeToken) => {
    if (!activeToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Quick sanity-check: if token is already expired, drop it immediately
    const decoded = decodeToken(activeToken);
    if (decoded?.exp && decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setLoading(false);
      return;
    }

    if (!user) setLoading(true);

    try {
      const res = await API.get('/auth/me');
      const userData = res.data.data.user; // { _id, name, email, role, wardId?, language?, ... }
      setUser(userData);
      // Sync UI language to user's stored preference (survives refresh)
      if (userData?.language && userData.language !== i18n.language) {
        i18n.changeLanguage(userData.language);
      }
    } catch (err) {
      // Token rejected by server — wipe everything
      console.warn('[AuthContext] Token rejected — clearing session.');
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount and whenever token changes, re-hydrate
  useEffect(() => {
    hydrateUser(token);
  }, [token, hydrateUser]);

  // Listen for 401 events fired by the Axios interceptor (avoids circular import)
  useEffect(() => {
    const handle = () => {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    };
    window.addEventListener('auth:logout', handle);
    return () => window.removeEventListener('auth:logout', handle);
  }, []);


  // ── login(jwtString) ───────────────────────────────────────────────────────
  // Call after a successful /auth/login or /auth/register response
  const login = useCallback((jwtToken, userData = null) => {
    localStorage.setItem('token', jwtToken);
    setToken(jwtToken);
    if (userData) setUser(userData);
    // hydrateUser will run automatically via the useEffect above
  }, []);

  // ── logout() ──────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  // ── isAuthenticated() ─────────────────────────────────────────────────────
  const isAuthenticated = useCallback(() => {
    if (!token || !user) return false;
    const decoded = decodeToken(token);
    return decoded?.exp ? decoded.exp * 1000 > Date.now() : false;
  }, [token, user]);

  // ── hasRole(role | role[]) ────────────────────────────────────────────────
  // Usage: hasRole('system_admin') or hasRole(['ward_official','system_admin'])
  const hasRole = useCallback((roles) => {
    if (!user?.role) return false;
    return Array.isArray(roles) ? roles.includes(user.role) : user.role === roles;
  }, [user]);

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated,
    hasRole,
    // expose setUser so components like Profile can patch it without a full refetch
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
