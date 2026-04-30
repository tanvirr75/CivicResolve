/**
 * client/src/services/socket.js
 *
 * Singleton Socket.io client.
 * Connects once on first import; subsequent imports return the same instance.
 * Auth token is sent in the handshake so the server can authenticate the socket.
 */
import { io } from 'socket.io-client';
import { useEffect, useRef } from 'react';

// ─── Singleton instance ───────────────────────────────────────────────────────
// We lazy-init so the token is fresh when first used (not at module parse time).
let _socket = null;

export function getSocket() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  if (_socket) return _socket;

  const baseUrl = import.meta.env.VITE_SOCKET_URL ||
                 (import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace('/api', '') : undefined);

  _socket = io(baseUrl, {
    transports: ['websocket'],
    auth: { token },
    reconnection:       true,
    reconnectionDelay:  1000,
    reconnectionDelays: 5000,
  });

  _socket.on('connect', () => {
    const stored = localStorage.getItem('token');
    if (stored) {
      try {
        const payload = JSON.parse(atob(stored.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload?.id) _socket.emit('joinRoom', payload.id);
      } catch { /* silent */ }
    }
  });

  return _socket;
}

/**
 * Destroy the singleton (call on logout so a fresh socket
 * is created for the next authenticated session).
 */
export function destroySocket() {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}

/**
 * useSocket() — React hook.
 * Returns the singleton socket. Joins the user's private room on mount.
 *
 * @param {string} [userId]  — if provided, emits joinRoom immediately.
 * @param {Object} [events]  — { eventName: handler } map — registered on mount, cleaned on unmount.
 */
export function useSocket(userId, events = {}) {
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    if (userId) socket.emit('joinRoom', userId);

    const handlers = { ...eventsRef.current };
    Object.entries(handlers).forEach(([evt, fn]) => socket.on(evt, fn));

    return () => {
      Object.entries(handlers).forEach(([evt, fn]) => socket.off(evt, fn));
    };
  }, [userId]);  // eslint-disable-line react-hooks/exhaustive-deps

  return getSocket();
}
