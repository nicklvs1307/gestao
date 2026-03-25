import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace('/api', '') 
  : window.location.origin;

let socket: Socket | null = null;

export const getSocket = (restaurantId?: string): Socket => {
  // Levar o token do usuário para autenticação no handshake
  const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || '') : '';
  if (!socket) {
    socket = io(SOCKET_URL, {
      // Autenticação via auth para handshake
      auth: { token }, // token do usuário
      query: { restaurantId },
      transports: ['websocket', 'polling']
    });
    // Tenta conectar imediatamente
    try { socket.connect(); } catch (e) { /* ignore */ }
  } else if (restaurantId && socket.io.opts.query && (socket.io.opts.query as any).restaurantId !== restaurantId) {
    // Se o restaurantId mudou, reconecta com o novo ID
    socket.disconnect();
    socket = io(SOCKET_URL, {
      auth: { token },
      query: { restaurantId },
      transports: ['websocket', 'polling']
    });
    try { socket.connect(); } catch (e) { /* ignore */ }
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
