import { io, Socket } from 'socket.io-client';

function getSocketUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return apiUrl.replace(/\/api\/?$/, '');
  }
  return window.location.origin;
}

function getSocketConfig() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const restaurantId = localStorage.getItem('selectedRestaurantId') || user?.restaurantId;
  return { token, restaurantId };
}

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;

  const { token, restaurantId } = getSocketConfig();

  socket = io(getSocketUrl(), {
    // Envia token via auth para autenticação no handshake do Socket.IO
    auth: {
      token: token || ''
    },
    // Mantém o restaurantId no query para join na sala correta no servidor
    query: {
      restaurantId: restaurantId || '',
      timestamp: String(Date.now()),
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    autoConnect: false,
  });

  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    const { token, restaurantId } = getSocketConfig();
    s.io.opts.query = {
      restaurantId: restaurantId || '',
      timestamp: String(Date.now()),
    };
    s.io.opts.auth = {
      token: token || ''
    };
    s.connect();
  }
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
