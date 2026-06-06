import React, { createContext, useState, useEffect, useRef, useMemo, useCallback, useContext, ReactNode } from 'react';
import { getAdminOrders, getTableRequests, getSettings, resolveTableRequest as apiResolveTableRequest } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import type { Order } from '../types';

const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || window.location.origin;
};

export interface NotificationContextType {
  allOrders: Order[];
  pendingOrders: Order[];
  pendingRequests: any[];
  notifCount: number;

  isOrderModalOpen: boolean;
  isRequestModalOpen: boolean;
  openOrderModal: () => void;
  closeOrderModal: () => void;
  openRequestModal: () => void;
  closeRequestModal: () => void;

  isAutoAccept: boolean;
  isAutoPrint: boolean;

  resolveRequest: (id: string) => Promise<void>;
  playNotificationSound: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { on, off } = useSocket();

  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isAutoAccept, setIsAutoAccept] = useState(false);
  const [isAutoPrint, setIsAutoPrint] = useState(true);

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const lastOrderIdsRef = useRef<Set<string>>(new Set());
  const pendingRequestsCountRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/notification.mp3');
      }
      audioRef.current.play().catch(() => {});
    } catch (e) {}
  }, []);

  const hasUser = useCallback(() => {
    const userStr = localStorage.getItem('user');
    const selectedRestaurantId = localStorage.getItem('selectedRestaurantId');
    if (!userStr) return false;
    const user = JSON.parse(userStr);
    if (user?.isSuperAdmin && !selectedRestaurantId) return false;
    if (!user?.restaurantId && !selectedRestaurantId) return false;
    return true;
  }, []);

  const openOrderModal = useCallback(() => setIsOrderModalOpen(true), []);
  const closeOrderModal = useCallback(() => setIsOrderModalOpen(false), []);
  const openRequestModal = useCallback(() => setIsRequestModalOpen(true), []);
  const closeRequestModal = useCallback(() => setIsRequestModalOpen(false), []);

  const resolveRequest = useCallback(async (id: string) => {
    try {
      await apiResolveTableRequest(id);
      setPendingRequests(prev => {
        const updated = prev.filter((r: any) => r.id !== id);
        pendingRequestsCountRef.current = updated.length;
        if (updated.length === 0) setIsRequestModalOpen(false);
        return updated;
      });
    } catch (e) {
      console.error(e);
      throw e;
    }
  }, []);

  // Load initial data + settings
  useEffect(() => {
    if (!hasUser()) return;

    const loadInitialData = async () => {
      try {
        const settingsData = await getSettings();
        setIsAutoAccept(settingsData?.settings?.autoAcceptOrders || false);
        setIsAutoPrint(settingsData?.settings?.autoPrintEnabled !== undefined ? settingsData?.settings?.autoPrintEnabled : true);

        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';

          if (isAdminOrStaff) {
            const ordersData = await getAdminOrders({ limit: 9999 });
            const ordersList = ordersData?.orders || [];
            setAllOrders(ordersList);
            lastOrderIdsRef.current = new Set(ordersList.map((o: Order) => o.id));
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        setAllOrders([]);
      }
    };

    loadInitialData();
  }, [hasUser]);

  // Polling for table requests
  useEffect(() => {
    if (!hasUser()) return;

    const fetchRequests = async () => {
      try {
        const requestsData = await getTableRequests();
        if (Array.isArray(requestsData)) {
          if (requestsData.length > pendingRequestsCountRef.current) {
            playNotificationSound();
            setIsRequestModalOpen(true);
          }
          pendingRequestsCountRef.current = requestsData.length;
          setPendingRequests(requestsData);
        } else {
          pendingRequestsCountRef.current = 0;
          setPendingRequests([]);
        }
      } catch (e) {
        console.warn("NotificationContext: Falha ao carregar chamados", e);
        setPendingRequests([]);
      }
    };

    fetchRequests();
    const requestInterval = setInterval(fetchRequests, 20000);
    return () => clearInterval(requestInterval);
  }, [hasUser, playNotificationSound]);

  // Socket.io - real-time order events
  useEffect(() => {
    if (!hasUser()) return;

    const handleOrderUpdate = (eventData: any) => {
      const updatedOrder = eventData.payload as Order;
      if (!updatedOrder || !updatedOrder.id) return;

      setAllOrders(prevOrders => {
        const currentOrders = Array.isArray(prevOrders) ? prevOrders : [];
        const newOrders = [...currentOrders];
        const existingOrderIndex = newOrders.findIndex(o => o.id === updatedOrder.id);

        if (existingOrderIndex > -1) {
          newOrders[existingOrderIndex] = updatedOrder;
        } else {
          newOrders.unshift(updatedOrder);
          lastOrderIdsRef.current.add(updatedOrder.id);
          playNotificationSound();
          if (!isAutoAccept && updatedOrder.status === 'PENDING') {
            setIsOrderModalOpen(true);
          }
        }
        return newOrders;
      });
    };

    const handleNewOrder = (eventData: any) => {
      const orderId = eventData.order || eventData.payload?.id;
      if (orderId) {
        fetch(`/api/admin/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
        .then(res => res.json())
        .then(order => {
          if (order && order.id) {
            setAllOrders(prevOrders => {
              const exists = prevOrders.some(o => o.id === order.id);
              if (!exists) {
                playNotificationSound();
                if (!isAutoAccept && order.status === 'PENDING') {
                  setIsOrderModalOpen(true);
                }
                return [order, ...prevOrders];
              }
              return prevOrders;
            });
          }
        })
        .catch(console.error);
      }
    };

    const handleCancelApplyRequest = (eventData: any) => {
      playNotificationSound();
    };

    const handleRefundApplyRequest = (eventData: any) => {
      playNotificationSound();
    };

    on('order_update', handleOrderUpdate);
    on('new_order', handleNewOrder);
    on('cancel_apply_request', handleCancelApplyRequest);
    on('refund_apply_request', handleRefundApplyRequest);

    return () => {
      off('order_update', handleOrderUpdate);
      off('new_order', handleNewOrder);
      off('cancel_apply_request', handleCancelApplyRequest);
      off('refund_apply_request', handleRefundApplyRequest);
    };
  }, [hasUser, isAutoAccept, on, off, playNotificationSound]);

  // SSE fallback
  useEffect(() => {
    if (!hasUser()) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelay = 5000;
    const MAX_RECONNECT_DELAY = 60000;

    const connectSSE = () => {
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) return;
        const user = JSON.parse(userStr);
        const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';

        if (!isAdminOrStaff) return;

        const token = localStorage.getItem('token');
        const restaurantId = localStorage.getItem('selectedRestaurantId') || user?.restaurantId;

        if (!token || !restaurantId) return;

        eventSource = new EventSource(`${getApiBaseUrl()}/api/admin/orders/events?token=${token}&restaurantId=${restaurantId}`);

        eventSource.onopen = () => {
          reconnectDelay = 5000;
        };

        eventSource.onmessage = (event) => {
          try {
            const eventData = JSON.parse(event.data);

            if (eventData.type === 'CONNECTION_ESTABLISHED') return;

            const updatedOrder = eventData.payload as Order;
            if (!updatedOrder || !updatedOrder.id) return;

            setAllOrders(prevOrders => {
              const currentOrders = Array.isArray(prevOrders) ? prevOrders : [];
              const newOrders = [...currentOrders];
              const existingOrderIndex = newOrders.findIndex(o => o.id === updatedOrder.id);

              if (existingOrderIndex > -1) {
                newOrders[existingOrderIndex] = updatedOrder;
              } else {
                newOrders.unshift(updatedOrder);
                lastOrderIdsRef.current.add(updatedOrder.id);
                playNotificationSound();
                if (!isAutoAccept && updatedOrder.status === 'PENDING') {
                  setIsOrderModalOpen(true);
                }
              }
              return newOrders;
            });
          } catch (err) {
            console.error('Erro ao processar mensagem SSE:', err);
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          reconnectTimeout = setTimeout(connectSSE, reconnectDelay);
          reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
        };
      } catch (err) {
        console.error('SSE Setup Error:', err);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [hasUser, isAutoAccept, playNotificationSound]);

  // Derived values
  const pendingOrders = useMemo(
    () => allOrders.filter(o => o.status === 'PENDING' && !o.cancellationRequested),
    [allOrders]
  );

  const notifCount = useMemo(
    () => pendingOrders.length + pendingRequests.length,
    [pendingOrders, pendingRequests]
  );

  const value = useMemo<NotificationContextType>(
    () => ({
      allOrders,
      pendingOrders,
      pendingRequests,
      notifCount,
      isOrderModalOpen,
      isRequestModalOpen,
      openOrderModal,
      closeOrderModal,
      openRequestModal,
      closeRequestModal,
      isAutoAccept,
      isAutoPrint,
      resolveRequest,
      playNotificationSound,
    }),
    [
      allOrders, pendingOrders, pendingRequests, notifCount,
      isOrderModalOpen, isRequestModalOpen,
      openOrderModal, closeOrderModal, openRequestModal, closeRequestModal,
      isAutoAccept, isAutoPrint,
      resolveRequest, playNotificationSound,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
