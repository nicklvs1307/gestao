import { io, Socket } from 'socket.io-client';

function getSocketUrl(): string {
  if (window.location.hostname === 'localhost') {
    return window.location.origin;
  }
  return 'https://apikicardapio.towersfy.com';
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
    query: {
      restaurantId: restaurantId || '',
      token: token || '',
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
      token: token || '',
      timestamp: String(Date.now()),
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
