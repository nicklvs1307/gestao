import { useCallback, useEffect, useState } from 'react';
import { getSocket, connectSocket } from '../services/socket';

export const useSocket = () => {
  const socket = getSocket();
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    connectSocket();

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  const emit = useCallback((event: string, data: unknown) => {
    socket.emit(event, data);
  }, [socket]);

  const on = useCallback((event: string, callback: (...args: unknown[]) => void) => {
    socket.on(event, callback);
    return () => { socket.off(event, callback); };
  }, [socket]);

  const off = useCallback((event: string, callback?: (...args: unknown[]) => void) => {
    socket.off(event, callback);
  }, [socket]);

  return { socket, isConnected, emit, on, off };
};
