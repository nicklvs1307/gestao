import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getAdminOrders, updateOrderStatus, getSettings, getTableRequests, resolveTableRequest, markOrderAsPrinted } from '../services/api';
import { confirmIfoodOrder, rejectIfoodOrder, getIfoodCancellationReasons, confirmUairangoOrder, rejectUairangoOrder, getUairangoCancellationReasons, requestUairangoCancellation, confirmFood99Order, rejectFood99Order } from '../services/api/integrations';
import { printOrder, checkAgentStatus, getPrinterConfigFromStorage } from '../services/printer';
import type { Order } from '../types';
import NewOrderAlert from './NewOrderAlert';
import TableRequestAlert from './TableRequestAlert';
import Food99ApplyAlert from './Food99ApplyAlert';
import { useSocket } from '../hooks/useSocket';
import { Bell, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';

const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || window.location.origin;
};

const GlobalOrderMonitor: React.FC = () => {
  const location = useLocation();
  const isKdsPage = location.pathname === '/kds';
  const { on, off, isConnected } = useSocket();

  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isAutoAccept, setIsAutoAccept] = useState(false);
  const [isAutoPrint, setIsAutoPrint] = useState(true);
  
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancellationReasons, setCancellationReasons] = useState<{cancelCodeId: string; description: string}[]>([]);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [isLoadingReasons, setIsLoadingReasons] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [food99ApplyOpen, setFood99ApplyOpen] = useState(false);
  const [food99ApplyType, setFood99ApplyType] = useState<'cancel' | 'refund'>('cancel');
  const [food99ApplyOrderId, setFood99ApplyOrderId] = useState<number>(0);
  const [food99ApplyId, setFood99ApplyId] = useState<number>(0);
  const [food99ApplyReason, setFood99ApplyReason] = useState<string>('');
  
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

  // Socket.io Effect - Primary real-time connection
  useEffect(() => {
    if (isKdsPage || !hasUser()) return;

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
      const { orderId, applyId, reason } = eventData;
      if (orderId && applyId) {
        playNotificationSound();
        setFood99ApplyType('cancel');
        setFood99ApplyOrderId(orderId);
        setFood99ApplyId(applyId);
        setFood99ApplyReason(reason || 'Não informado');
        setFood99ApplyOpen(true);
      }
    };

    const handleRefundApplyRequest = (eventData: any) => {
      const { orderId, applyId, reason } = eventData;
      if (orderId && applyId) {
        playNotificationSound();
        setFood99ApplyType('refund');
        setFood99ApplyOrderId(orderId);
        setFood99ApplyId(applyId);
        setFood99ApplyReason(reason || 'Não informado');
        setFood99ApplyOpen(true);
      }
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
  }, [isKdsPage, hasUser, isAutoAccept, on, off, playNotificationSound]);

  // SSE Effect - Fallback when socket fails
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
  // Não mostra solicitações de cancelamento do cliente no NewOrderAlert - elas aparecem no OrderEditor
  const pendingOrders = useMemo(() => allOrders.filter(o => o.status === 'PENDING' && !o.cancellationRequested), [allOrders]);

  // --- PRINTING LOGIC - uses ref to avoid re-triggering on every allOrders change ---
  useEffect(() => {
    if (!isAutoPrint) return;

    // Imprime quando o pedido muda para PREPARING (aceito)
    const toPrint = allOrders.filter(o => o.status === 'PREPARING' && !o.isPrinted && !printedIdsRef.current.has(o.id));

    if (toPrint.length === 0) return;

    const processPrinting = async () => {
      const agentAvailable = await checkAgentStatus();
      if (!agentAvailable) return;

      const printerConfig = getPrinterConfigFromStorage();
      const hasPrinters = printerConfig.kitchenPrinters?.some(k => k.printer) || printerConfig.barPrinters?.some(b => b.printer);
      if (!hasPrinters) return;

      for (const order of toPrint) {
        printedIdsRef.current.add(order.id);
        
        try {
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
          printedIdsRef.current.delete(order.id);
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

  const handleConfirmCancellation = async () => {
    if (!cancelOrderId || !selectedReason) return;
    
    setIsProcessing(true);
    try {
      const order = allOrders.find(o => o.id === cancelOrderId);
      const isUairango = order?.uairangoOrderId;

      if (isUairango) {
        const reasonObj = cancellationReasons.find(r => r.cancelCodeId === selectedReason);
        const result = await rejectUairangoOrder(
          cancelOrderId,
          parseInt(selectedReason),
          reasonObj?.description || 'Cancelamento solicitado'
        );
        if (!result.success) {
          toast.error(result.error || 'Erro ao cancelar pedido no UaiRango');
          return;
        }
        toast.success('Pedido cancelado no UaiRango!');
      } else {
        const result = await rejectIfoodOrder(cancelOrderId, selectedReason, true);
        if (!result.success) {
          toast.error(result.error || 'iFood recusou o cancelamento. O pedido continua ativo.');
          return;
        }
        
        if (result.pendingConfirmation) {
          toast.info('Solicitação de cancelamento enviada. Aguardando confirmação do iFood...');
        } else {
          toast.success('Pedido cancelado com sucesso!');
        }
      }
      
      setCancelModalOpen(false);
      setCancelOrderId(null);
      setSelectedReason('');
      
      const pendingOrdersNow = allOrders.filter(o => o.status === 'PENDING');
      if (pendingOrdersNow.length <= 1) setIsOrderModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao cancelar pedido');
    } finally {
      setIsProcessing(false);
    }
  };

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
            isProcessing={isProcessing}
            onAccept={async (id, order) => {
              setIsProcessing(true);
              try {
                if (order.ifoodOrderId) {
                  const result = await confirmIfoodOrder(id);
                  if (!result.success) {
                    toast.error(result.error || 'Erro ao aceitar pedido no iFood');
                    return;
                  }
                } else if (order.uairangoOrderId) {
                  const result = await confirmUairangoOrder(id);
                  if (!result.success) {
                    toast.error(result.error || 'Erro ao aceitar pedido no UaiRango');
                    return;
                  }
                } else if (order.food99OrderId) {
                  const result = await confirmFood99Order(id);
                  if (!result.success) {
                    toast.error(result.error || 'Erro ao aceitar pedido no 99Food');
                    return;
                  }
                }
                await updateOrderStatus(id, 'PREPARING');
                if (pendingOrders.length <= 1) setIsOrderModalOpen(false);
              } catch (err: any) {
                toast.error(err?.message || 'Erro ao aceitar pedido. Tente novamente.');
              } finally {
                setIsProcessing(false);
              }
            }}
            onReject={async (id, order) => {
              setIsProcessing(true);
              try {
                if (order.ifoodOrderId) {
                  const result = await rejectIfoodOrder(id, '501');
                  if (!result.success) {
                    if (result.alreadyAccepted) {
                      try {
                        setIsLoadingReasons(true);
                        const reasonsResult = await getIfoodCancellationReasons(id);
                        
                        const reasons = Array.isArray(reasonsResult.reasons) 
                          ? reasonsResult.reasons 
                          : [];
                        
                        if (reasonsResult.success && reasons.length > 0) {
                          setCancellationReasons(reasons);
                          setCancelOrderId(id);
                          setSelectedReason(reasons[0]?.cancelCodeId || '');
                          setIsOrderModalOpen(false);
                          setCancelModalOpen(true);
                        } else {
                          toast.error('Não foi possível buscar os motivos de cancelamento');
                        }
                      } catch (err) {
                        toast.error('Erro ao buscar motivos de cancelamento');
                      } finally {
                        setIsLoadingReasons(false);
                      }
                      return;
                    } else {
                      toast.error(result.error || 'Erro ao recusar pedido no iFood');
                      return;
                    }
                  }
                  if (result.pendingConfirmation) {
                    toast.info('Solicitação de cancelamento enviada. Aguardando confirmação do iFood...');
                  } else {
                    toast.success('Pedido cancelado!');
                  }
                  if (pendingOrders.length <= 1) setIsOrderModalOpen(false);
                  return;
                } else if (order.uairangoOrderId) {
                  setIsLoadingReasons(true);
                  try {
                    const reasonsResult = await getUairangoCancellationReasons(id);

                    const reasons = Array.isArray(reasonsResult)
                      ? reasonsResult
                      : Array.isArray(reasonsResult.reasons)
                        ? reasonsResult.reasons
                        : [];

                    if (reasons.length > 0) {
                      setCancellationReasons(reasons);
                      setCancelOrderId(id);
                      setSelectedReason(reasons[0]?.cancelCodeId || '');
                      setIsOrderModalOpen(false);
                      setCancelModalOpen(true);
                    } else {
                      const result = await rejectUairangoOrder(id, 1, 'Cancelamento direto');
                      if (!result.success) {
                        toast.error(result.error || 'Erro ao recusar pedido no UaiRango');
                        return;
                      }
                      toast.success('Pedido cancelado!');
                      if (pendingOrders.length <= 1) setIsOrderModalOpen(false);
                    }
                  } catch (err) {
                    toast.error('Erro ao buscar motivos de cancelamento');
                  } finally {
                    setIsLoadingReasons(false);
                  }
                  return;
                } else if (order.food99OrderId) {
                  const result = await rejectFood99Order(id, 'Pedido recusado pelo restaurante');
                  if (!result.success) {
                    toast.error(result.error || 'Erro ao recusar pedido no 99Food');
                    return;
                  }
                  toast.success('Pedido cancelado no 99Food!');
                  if (pendingOrders.length <= 1) setIsOrderModalOpen(false);
                  return;
                }
                await updateOrderStatus(id, 'CANCELED');
                if (pendingOrders.length <= 1) setIsOrderModalOpen(false);
              } catch (err: any) {
                toast.error(err?.message || 'Erro ao recusar pedido. Tente novamente.');
              } finally {
                setIsProcessing(false);
              }
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

      {cancelModalOpen && (
        <Dialog
          isOpen={cancelModalOpen}
          onClose={() => {
            setCancelModalOpen(false);
            setCancelOrderId(null);
            setSelectedReason('');
          }}
          title="Selecione o motivo do cancelamento"
          size="sm"
          footer={
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setCancelModalOpen(false);
                  setCancelOrderId(null);
                  setSelectedReason('');
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmCancellation}
                disabled={!selectedReason || isLoadingReasons}
              >
                Confirmar Cancelamento
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione o motivo do cancelamento:
            </p>
            <div className="space-y-2">
              {cancellationReasons.map((reason) => (
                <div
                  key={reason.cancelCodeId}
                  onClick={() => setSelectedReason(reason.cancelCodeId)}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedReason === reason.cancelCodeId
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                    selectedReason === reason.cancelCodeId
                      ? 'border-orange-500 bg-orange-500'
                      : 'border-slate-300'
                  }`}>
                    {selectedReason === reason.cancelCodeId && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-slate-700">{reason.description}</span>
                </div>
              ))}
            </div>
            {isLoadingReasons && (
              <p className="text-sm text-muted-foreground">Carregando motivos...</p>
            )}
          </div>
        </Dialog>
      )}

      <Food99ApplyAlert
        isOpen={food99ApplyOpen}
        type={food99ApplyType}
        orderId={food99ApplyOrderId}
        applyId={food99ApplyId}
        reason={food99ApplyReason}
        onClose={() => setFood99ApplyOpen(false)}
        onResolved={() => {
          toast.success('Solicitação processada com sucesso!');
        }}
      />
    </>
  );
};

export default GlobalOrderMonitor;
