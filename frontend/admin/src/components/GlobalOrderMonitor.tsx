import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getAdminOrders, updateOrderStatus, getSettings, getTableRequests, resolveTableRequest, markOrderAsPrinted } from '../services/api';
import { printOrder } from '../services/printer';
import type { Order } from '../types';
import NewOrderAlert from './NewOrderAlert';
import TableRequestAlert from './TableRequestAlert';
import { Bell, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || window.location.origin;
};

const GlobalOrderMonitor: React.FC = () => {
  const location = useLocation();
  const isKdsPage = location.pathname === '/kds';

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

  // Effect for fetching initial data and settings
  useEffect(() => {
    if (isKdsPage || !hasUser()) return;

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
            const ordersData = await getAdminOrders();
            if (Array.isArray(ordersData)) {
              setAllOrders(ordersData);
              lastOrderIdsRef.current = new Set(ordersData.map((o: Order) => o.id));
              // Mark already-printed orders so autoPrint skips them
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

  // Effect for polling table requests - stable interval, no re-creation
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
      } catch (e) { 
        console.warn("Monitor: Falha ao carregar chamados", e); 
        setPendingRequests([]);
      }
    };
    
    fetchRequests();
    const requestInterval = setInterval(fetchRequests, 20000);
    return () => clearInterval(requestInterval);
  }, [isKdsPage, hasUser, playNotificationSound]);

  // SSE Effect - Socket.io is primary, SSE as backup with dedup
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
        
        eventSource = new EventSource(`${getApiBaseUrl()}/api/admin/orders/events?token=${token}&restaurantId=${restaurantId}`);

        eventSource.onopen = () => {
          reconnectDelay = 5000; // Reset backoff on successful connection
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
          // Exponential backoff: 5s -> 10s -> 20s -> 40s -> 60s max
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
  }, [isKdsPage, hasUser, isAutoAccept, playNotificationSound]);

  // --- MEMOIZED VALUES ---
  const pendingOrders = useMemo(() => allOrders.filter(o => o.status === 'PENDING'), [allOrders]);

  // --- PRINTING LOGIC - uses ref to avoid re-triggering on every allOrders change ---
  useEffect(() => {
    if (!isAutoPrint) return;

    const toPrintProduction = allOrders.filter(o => o.status === 'PREPARING' && !o.isPrinted && !printedIdsRef.current.has(o.id));
    const toPrintFinal = allOrders.filter(o => o.status === 'COMPLETED' && o.orderType === 'DELIVERY' && !o.isPrinted && !printedIdsRef.current.has(o.id));
    const allToPrint = [...toPrintProduction, ...toPrintFinal];

    if (allToPrint.length === 0) return;

    const processPrinting = async () => {
      for (const order of allToPrint) {
        // Mark immediately to prevent re-processing
        printedIdsRef.current.add(order.id);
        
        console.log(`[AUTOPRINT] Iniciando impressão automática: Pedido #${order.dailyOrderNumber || order.id.slice(-4)}`);
        try {
          const printerConfig = JSON.parse(localStorage.getItem('printer_config') || '{}');
          
          const sLayout = localStorage.getItem('receipt_layout');
          const sSettings = localStorage.getItem('receipt_settings');
          const receiptSettings = sLayout ? JSON.parse(sLayout) : (sSettings ? JSON.parse(sSettings) : {});

          const settingsData = await getSettings();
          const restaurantInfo = {
              name: settingsData.name, address: settingsData.address, phone: settingsData.phone,
              cnpj: settingsData.fiscalConfig?.cnpj, logoUrl: settingsData.logoUrl
          };
          
          await printOrder(order, printerConfig, receiptSettings, restaurantInfo);
          await markOrderAsPrinted(order.id);
          
          setAllOrders(prev => prev.map(o => o.id === order.id ? {...o, isPrinted: true} : o));
        } catch (printErr) {
          console.error("Falha na impressão:", printErr);
          // Remove from ref on failure so it can be retried
          printedIdsRef.current.delete(order.id);
          toast.error(`Falha ao imprimir pedido #${order.dailyOrderNumber || order.id.slice(-4)}`);
        }
      }
    };
    processPrinting();
  }, [allOrders, isAutoPrint]);

  const handleResolveRequest = useCallback(async (id: string) => {
    try {
        await resolveTableRequest(id);
        setPendingRequests(prev => {
            const updated = prev.filter(r => r.id !== id);
            pendingRequestsCountRef.current = updated.length;
            if (updated.length === 0) setIsRequestModalOpen(false);
            return updated;
        });
        toast.success("Chamado atendido!");
    } catch (e) {
        console.error(e);
        toast.error("Erro ao resolver chamado.");
    }
  }, []);

  const hasAlerts = (pendingOrders.length > 0 || pendingRequests.length > 0) && !isKdsPage;
  if (!hasAlerts) return null;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[150] flex flex-col items-end gap-3 pointer-events-auto">
        {pendingRequests.length > 0 && (
            <div onClick={() => setIsRequestModalOpen(true)} className="pointer-events-auto bg-indigo-600 text-white rounded-2xl shadow-xl border-2 border-white flex items-center gap-3 p-1.5 pr-4 animate-bounce-subtle cursor-pointer hover:scale-105 transition-all">
                <div className="bg-white text-indigo-600 p-2 rounded-xl"><UserCheck size={20} /></div>
                <div className="flex flex-col">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-100 leading-tight">Chamado</p>
                    <p className="text-sm font-bold italic leading-none">{pendingRequests.length} Mesa(s)</p>
                </div>
            </div>
        )}

        {pendingOrders.length > 0 && !isAutoAccept && (
            <div onClick={() => setIsOrderModalOpen(true)} className="pointer-events-auto bg-orange-600 text-white rounded-2xl shadow-xl border-2 border-white flex items-center gap-3 p-1.5 pr-4 animate-bounce-subtle cursor-pointer hover:scale-105 transition-all">
                <div className="bg-white text-orange-600 p-2 rounded-xl animate-ring"><Bell size={20} /></div>
                <div className="flex flex-col">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-orange-100 text-left leading-tight">Pedido</p>
                    <p className="text-sm font-bold italic text-left leading-none">{pendingOrders.length} Novo(s)</p>
                </div>
            </div>
        )}
      </div>

      <div className="fixed top-0 left-0 right-0 z-[200] pointer-events-none flex flex-col">
          {pendingRequests.length > 0 && <div className="bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-[0.2em] py-1 text-center shadow-lg animate-pulse">CHAMADO DE MESA PENDENTE</div>}
          {pendingOrders.length > 0 && !isAutoAccept && <div className="bg-red-600 text-white text-[10px] font-bold uppercase tracking-[0.2em] py-1 text-center shadow-lg animate-pulse">PEDIDO AGUARDANDO ACEITE</div>}
      </div>

      {isOrderModalOpen && (
          <NewOrderAlert 
            orders={pendingOrders}
            onAccept={async (id) => {
                await updateOrderStatus(id, 'PREPARING');
                if (pendingOrders.length <= 1) setIsOrderModalOpen(false);
            }}
            onReject={async (id) => {
                await updateOrderStatus(id, 'CANCELED');
                if (pendingOrders.length <= 1) setIsOrderModalOpen(false);
            }}
            onClose={() => setIsOrderModalOpen(false)}
          />
      )}

      {isRequestModalOpen && (
          <TableRequestAlert 
            requests={pendingRequests}
            onResolve={handleResolveRequest}
            onClose={() => setIsRequestModalOpen(false)}
          />
      )}
    </>
  );
};

export default GlobalOrderMonitor;
