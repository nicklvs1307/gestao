import { useState, useEffect, useRef, useCallback } from 'react';
import type { Order } from '../types';
import { getAdminOrders, getSettings, getTableRequests } from '../services/api';

const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || window.location.origin;
};

interface UseOrderMonitorReturn {
  allOrders: Order[];
  pendingOrders: Order[];
  pendingRequests: any[];
  isAutoAccept: boolean;
  isAutoPrint: boolean;
  isOrderModalOpen: boolean;
  isRequestModalOpen: boolean;
  setIsOrderModalOpen: (open: boolean) => void;
  setIsRequestModalOpen: (open: boolean) => void;
  playNotificationSound: () => void;
  handleAcceptOrder: (id: string) => Promise<void>;
  handleRejectOrder: (id: string) => Promise<void>;
  handleResolveRequest: (id: string) => Promise<void>;
  hasAlerts: boolean;
}

export function useOrderMonitor(isKdsPage: boolean): UseOrderMonitorReturn {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isAutoAccept, setIsAutoAccept] = useState(false);
  const [isAutoPrint, setIsAutoPrint] = useState(true);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const lastOrderIdsRef = useRef<Set<string>>(new Set());
  const printedIdsRef = useRef<Set<string>>(new Set());
  const pendingRequestsCountRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/notification.mp3');
      }
      audioRef.current.play().catch(() => {});
    } catch { /* ignore */ }
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

  // Load initial data and settings
  useEffect(() => {
    if (isKdsPage || !hasUser()) return;

    const loadInitialData = async () => {
      try {
        const settingsData = await getSettings();
        setIsAutoAccept(settingsData?.settings?.autoAcceptOrders || false);
        setIsAutoPrint(settingsData?.settings?.autoPrintEnabled !== undefined
          ? settingsData?.settings?.autoPrintEnabled : true);

        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';

          if (isAdminOrStaff) {
            const ordersData = await getAdminOrders();
            if (Array.isArray(ordersData)) {
              setAllOrders(ordersData);
              lastOrderIdsRef.current = new Set(ordersData.map((o: Order) => o.id));
              ordersData.forEach((o: Order) => {
                if (o.isPrinted) printedIdsRef.current.add(o.id);
              });
            } else {
              setAllOrders([]);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        setAllOrders([]);
      }
    };

    loadInitialData();
  }, [isKdsPage, hasUser]);

  // Polling table requests
  useEffect(() => {
    if (isKdsPage || !hasUser()) return;

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
      } catch {
        setPendingRequests([]);
      }
    };

    fetchRequests();
    const requestInterval = setInterval(fetchRequests, 20000);
    return () => clearInterval(requestInterval);
  }, [isKdsPage, hasUser, playNotificationSound]);

  // SSE connection with exponential backoff
  useEffect(() => {
    if (isKdsPage || !hasUser()) return;

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

        eventSource = new EventSource(
          `${getApiBaseUrl()}/api/admin/orders/events?token=${token}&restaurantId=${restaurantId}`
        );

        eventSource.onopen = () => { reconnectDelay = 5000; };

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
      } catch { /* ignore */ }
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [isKdsPage, hasUser, isAutoAccept, playNotificationSound]);

  const pendingOrders = allOrders.filter(o => o.status === 'PENDING');
  const hasAlerts = (pendingOrders.length > 0 || pendingRequests.length > 0) && !isKdsPage;

  const handleAcceptOrder = useCallback(async (id: string) => {
    const { updateOrderStatus } = await import('../services/api');
    await updateOrderStatus(id, 'PREPARING');
    setIsOrderModalOpen(false);
  }, []);

  const handleRejectOrder = useCallback(async (id: string) => {
    const { updateOrderStatus } = await import('../services/api');
    await updateOrderStatus(id, 'CANCELED');
    setIsOrderModalOpen(false);
  }, []);

  const handleResolveRequest = useCallback(async (id: string) => {
    const { resolveTableRequest, toast } = await Promise.all([
      import('../services/api'),
      import('sonner'),
    ]);
    try {
      await resolveTableRequest(id);
      setPendingRequests(prev => {
        const updated = prev.filter(r => r.id !== id);
        pendingRequestsCountRef.current = updated.length;
        if (updated.length === 0) setIsRequestModalOpen(false);
        return updated;
      });
      toast.toast.success("Chamado atendido!");
    } catch {
      toast.toast.error("Erro ao resolver chamado.");
    }
  }, []);

  return {
    allOrders,
    pendingOrders,
    pendingRequests,
    isAutoAccept,
    isAutoPrint,
    isOrderModalOpen,
    isRequestModalOpen,
    setIsOrderModalOpen,
    setIsRequestModalOpen,
    playNotificationSound,
    handleAcceptOrder,
    handleRejectOrder,
    handleResolveRequest,
    hasAlerts,
  };
}
