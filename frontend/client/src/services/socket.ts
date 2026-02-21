import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace('/api', '') 
  : window.location.origin;

let socket: Socket | null = null;

export const getSocket = (restaurantId?: string): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      query: { restaurantId },
      transports: ['websocket', 'polling']
    });
  } else if (restaurantId && socket.io.opts.query && (socket.io.opts.query as any).restaurantId !== restaurantId) {
    // Se o restaurantId mudou, reconecta com o novo ID
    socket.disconnect();
    socket = io(SOCKET_URL, {
      query: { restaurantId },
      transports: ['websocket', 'polling']
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
