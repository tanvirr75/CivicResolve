import axios from 'axios';

// ─── Axios instance ───────────────────────────────────────────────────────────
// Falls back to '/api' so the Vite dev proxy still works without a .env entry.
const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
});

// ─── Request interceptor: inject JWT ─────────────────────────────────────────
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor: handle 401 ────────────────────────────────────────
// We can't call useAuth() here (hooks are React-only), so we fire a custom
// browser event that AuthContext listens to, then hard-redirect to /login.
// This avoids circular imports and works outside React render trees.
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Notify any listener (e.g. AuthContext) to clear state
      window.dispatchEvent(new Event('auth:logout'));
      // Hard redirect so the router cleans up completely
      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default API;
