import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getSettings, updateOrderStatus, markOrderAsPrinted } from '../services/api';
import { confirmIfoodOrder, rejectIfoodOrder, getIfoodCancellationReasons, confirmUairangoOrder, rejectUairangoOrder, getUairangoCancellationReasons, confirmFood99Order, rejectFood99Order } from '../services/api/integrations';
import { printOrder, checkAgentStatus, getPrinterConfigFromStorage } from '../services/printer';
import { useNotifications } from '../context/NotificationContext';
import type { Order } from '../types';
import NewOrderAlert from './NewOrderAlert';
import TableRequestAlert from './TableRequestAlert';
import Food99ApplyAlert from './Food99ApplyAlert';
import { Bell, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';

const GlobalOrderMonitor: React.FC = () => {
  const location = useLocation();
  const isKdsPage = location.pathname === '/kds';

  const {
    allOrders,
    pendingOrders,
    pendingRequests,
    isOrderModalOpen,
    isRequestModalOpen,
    openOrderModal,
    openRequestModal,
    closeOrderModal,
    closeRequestModal,
    isAutoAccept,
    isAutoPrint,
    resolveRequest,
    playNotificationSound,
  } = useNotifications();

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

  const printedIdsRef = useRef<Set<string>>(new Set());

  // Initialize printedIdsRef from existing orders
  useEffect(() => {
    allOrders.forEach((o: Order) => {
      if (o.isPrinted) printedIdsRef.current.add(o.id);
    });
  }, [allOrders]);

  // Auto-print logic
  useEffect(() => {
    if (!isAutoPrint) return;

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
      await resolveRequest(id);
      toast.success("Chamado atendido!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao resolver chamado.");
    }
  }, [resolveRequest]);

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
      if (pendingOrdersNow.length <= 1) closeOrderModal();
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
            <div onClick={openRequestModal} className="pointer-events-auto bg-indigo-600 text-white rounded-2xl shadow-xl border-2 border-white flex items-center gap-3 p-1.5 pr-4 animate-bounce-subtle cursor-pointer hover:scale-105 transition-all">
                <div className="bg-white text-indigo-600 p-2 rounded-xl"><UserCheck size={20} /></div>
                <div className="flex flex-col">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-100 leading-tight">Chamado</p>
                    <p className="text-sm font-bold italic leading-none">{pendingRequests.length} Mesa(s)</p>
                </div>
            </div>
        )}

        {pendingOrders.length > 0 && !isAutoAccept && (
            <div onClick={openOrderModal} className="pointer-events-auto bg-orange-600 text-white rounded-2xl shadow-xl border-2 border-white flex items-center gap-3 p-1.5 pr-4 animate-bounce-subtle cursor-pointer hover:scale-105 transition-all">
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
                if (pendingOrders.length <= 1) closeOrderModal();
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
                          closeOrderModal();
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
                  if (pendingOrders.length <= 1) closeOrderModal();
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
                      closeOrderModal();
                      setCancelModalOpen(true);
                    } else {
                      const result = await rejectUairangoOrder(id, 1, 'Cancelamento direto');
                      if (!result.success) {
                        toast.error(result.error || 'Erro ao recusar pedido no UaiRango');
                        return;
                      }
                      toast.success('Pedido cancelado!');
                      if (pendingOrders.length <= 1) closeOrderModal();
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
                  if (pendingOrders.length <= 1) closeOrderModal();
                  return;
                }
                await updateOrderStatus(id, 'CANCELED');
                if (pendingOrders.length <= 1) closeOrderModal();
              } catch (err: any) {
                toast.error(err?.message || 'Erro ao recusar pedido. Tente novamente.');
              } finally {
                setIsProcessing(false);
              }
            }}
            onClose={closeOrderModal}
          />
        )}

      {isRequestModalOpen && (
          <TableRequestAlert 
            requests={pendingRequests}
            onResolve={handleResolveRequest}
            onClose={closeRequestModal}
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
