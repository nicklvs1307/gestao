import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import OrderKanbanBoard from './OrderKanbanBoard';
import OrderListView from './OrderListView';
import OrderEditor from './OrderEditor';
import DriverSelectionModal from './DriverSelectionModal';
import { getAdminOrders, updateOrderStatus, getOrder, assignDriver } from '../services/api';
import type { Order } from '@/types/index.ts';
import { Kanban, List, Search, Loader2, X, RefreshCw, ShoppingBag, Package, Timer, CheckCircle, Smartphone, ChevronRight, ChevronLeft, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { toast } from 'sonner';

type ViewMode = 'kanban' | 'list';
type OrderSegment = 'ALL' | 'TABLE' | 'DELIVERY' | 'PICKUP';

import { useSocket } from '../hooks/useSocket';

const ACTIVE_STATUSES = ['PENDING', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED'];

const STATUS_FLOW: Record<string, string> = {
  'PENDING': 'PREPARING',
  'PREPARING': 'READY',
  'READY': 'SHIPPED',
  'SHIPPED': 'DELIVERED',
  'DELIVERED': 'COMPLETED'
};

const STATUS_FLOW_BACK: Record<string, string> = {
  'PREPARING': 'PENDING',
  'READY': 'PREPARING',
  'SHIPPED': 'READY',
  'DELIVERED': 'SHIPPED',
  'COMPLETED': 'DELIVERED'
};

const OrderManagement: React.FC = () => {
  const navigate = useNavigate();
  const { on, off } = useSocket();
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [activeSegment, setActiveSegment] = useState<OrderSegment>('DELIVERY');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [orderIdPendingDriver, setOrderIdPendingDriver] = useState<string | null>(null);
  const [newStatusPendingDriver, setNewStatusPendingDriver] = useState<string | null>(null);
  const statusChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getAdminOrders();
      const deliveryOrders = data.filter((o: Order) => o.orderType === 'DELIVERY' || o.orderType === 'PICKUP');
      const sortedOrders = deliveryOrders.sort((a: Order, b: Order) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllOrders(sortedOrders);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao sincronizar pedidos.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleOpenOrder = useCallback(async (order: Order) => {
    try {
      if (Array.isArray(order.items) && order.items.length > 0) {
        setSelectedOrder(order);
        return;
      }
      const fullOrder = await getOrder(order.id);
      setSelectedOrder(fullOrder);
    } catch (error) {
      toast.error("Erro ao carregar detalhes do pedido.");
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    const handleOrderUpdate = (eventData: any) => {
      const updatedOrder = eventData.payload as Order;
      if (updatedOrder.orderType !== 'DELIVERY' && updatedOrder.orderType !== 'PICKUP') return;

      setAllOrders(prevOrders => {
        const newOrders = [...prevOrders];
        const index = newOrders.findIndex(o => o.id === updatedOrder.id);
        if (index > -1) {
          newOrders[index] = updatedOrder;
        } else {
          newOrders.unshift(updatedOrder);
        }
        return newOrders;
      });

      setSelectedOrder(current => {
        if (current && current.id === updatedOrder.id) {
          return updatedOrder;
        }
        return current;
      });
    };

    on('order_update', handleOrderUpdate);

    return () => {
      off('order_update', handleOrderUpdate);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [on, off, fetchOrders]);

  const handleStatusChange = useCallback(async (orderId: string, newStatus: string) => {
    if (statusChangeTimeoutRef.current) return;
    
    if (newStatus === 'SHIPPED') {
      const order = allOrders.find(o => o.id === orderId);
      const isDelivery = order?.orderType === 'DELIVERY' || !!order?.deliveryOrder;
      const isPickup = order?.deliveryOrder?.deliveryType === 'retirada' || order?.deliveryOrder?.deliveryType === 'pickup';
      
      if (isDelivery && !isPickup && !order?.deliveryOrder?.driverId) {
        setOrderIdPendingDriver(orderId);
        setNewStatusPendingDriver(newStatus);
        setIsDriverModalOpen(true);
        return;
      }
    }

    try {
      statusChangeTimeoutRef.current = setTimeout(() => {
        statusChangeTimeoutRef.current = null;
      }, 300);
      
      setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      setSelectedOrder(current => current && current.id === orderId ? { ...current, status: newStatus } : current);
      
      await updateOrderStatus(orderId, newStatus);
      toast.success(`Pedido #${orderId.slice(-4).toUpperCase()} atualizado!`);
    } catch (error) { 
      toast.error("Erro ao atualizar status");
      fetchOrders();
    } finally {
      if (statusChangeTimeoutRef.current) {
        clearTimeout(statusChangeTimeoutRef.current);
        statusChangeTimeoutRef.current = null;
      }
    }
  }, [allOrders, fetchOrders]);

  const handleDriverSelect = useCallback(async (driverId: string) => {
    if (!orderIdPendingDriver) return;
    
    try {
      setIsLoading(true);
      await assignDriver(orderIdPendingDriver, driverId);
      
      setAllOrders(prev => prev.map(o => o.id === orderIdPendingDriver ? { 
        ...o, 
        deliveryOrder: o.deliveryOrder ? { ...o.deliveryOrder, driverId } : { driverId } as any 
      } : o));

      toast.success("Entregador vinculado!");
      
      const targetStatus = newStatusPendingDriver;
      const targetId = orderIdPendingDriver;
      
      setIsDriverModalOpen(false);
      setOrderIdPendingDriver(null);
      setNewStatusPendingDriver(null);

      if (targetStatus) {
        await handleStatusChange(targetId, targetStatus);
      }
    } catch (error) {
      toast.error("Erro ao vincular entregador.");
    } finally {
      setIsLoading(false);
    }
  }, [orderIdPendingDriver, newStatusPendingDriver, handleStatusChange]);

  const handleBulkStatusChange = useCallback(async (newStatus: string) => {
    if (selectedOrderIds.length === 0) return;
    try {
      const idsToProcess = [...selectedOrderIds];
      setSelectedOrderIds([]); 
      
      if (newStatus === 'SHIPPED') {
        for (const id of idsToProcess) {
          await handleStatusChange(id, newStatus);
        }
      } else {
        setAllOrders(prev => prev.map(o => idsToProcess.includes(o.id) ? { ...o, status: newStatus } : o));
        await Promise.all(idsToProcess.map(id => updateOrderStatus(id, newStatus)));
        toast.success(`${idsToProcess.length} pedidos atualizados!`);
      }
    } catch (error) {
      fetchOrders();
    }
  }, [selectedOrderIds, handleStatusChange, fetchOrders]);

  const handleBulkAdvance = useCallback(async () => {
    if (selectedOrderIds.length === 0) return;
    const idsToProcess = [...selectedOrderIds];
    setSelectedOrderIds([]);

    for (const id of idsToProcess) {
      const order = allOrders.find(o => o.id === id);
      if (order) {
        const nextStatus = STATUS_FLOW[order.status];
        if (nextStatus) {
          await handleStatusChange(id, nextStatus);
        }
      }
    }
    toast.success("Ações em massa processadas!");
  }, [selectedOrderIds, allOrders, handleStatusChange]);

  const handleBulkBack = useCallback(async () => {
    if (selectedOrderIds.length === 0) return;
    const idsToProcess = [...selectedOrderIds];
    setSelectedOrderIds([]);

    for (const id of idsToProcess) {
      const order = allOrders.find(o => o.id === id);
      if (order) {
        const prevStatus = STATUS_FLOW_BACK[order.status];
        if (prevStatus) {
          await handleStatusChange(id, prevStatus);
        }
      }
    }
  }, [selectedOrderIds, allOrders, handleStatusChange]);

  const toggleSelectOrder = useCallback((id: string) => {
    setSelectedOrderIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const handleCancelOrder = useCallback(async (orderId: string) => {
    try {
      setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELED' } : o));
      setSelectedOrder(current => current && current.id === orderId ? { ...current, status: 'CANCELED' } : current);
      await updateOrderStatus(orderId, 'CANCELED');
      toast.success('Pedido cancelado!');
    } catch (error) {
      toast.error('Erro ao cancelar pedido');
      fetchOrders();
    }
  }, [fetchOrders]);

  // Memoized filtered orders
  const filteredOrders = useMemo(() => {
    return allOrders.filter(o => {
      const isStatusMatch = ACTIVE_STATUSES.includes(o.status);
      const isSegmentMatch = activeSegment === 'ALL' || o.orderType === activeSegment || 
        (activeSegment === 'DELIVERY' && o.orderType === 'PICKUP'); // Mostra pickup junto com delivery
      const isSearchMatch = !debouncedSearch || 
        o.id.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
        (o.customerName && o.customerName.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
        (o.deliveryOrder?.name && o.deliveryOrder.name.toLowerCase().includes(debouncedSearch.toLowerCase()));
      
      return isStatusMatch && isSegmentMatch && isSearchMatch;
    });
  }, [allOrders, activeSegment, debouncedSearch]);

  // Memoized counts
  const counts = useMemo(() => ({
    DELIVERY: allOrders.filter(o => (o.orderType === 'DELIVERY' || o.orderType === 'PICKUP') && ACTIVE_STATUSES.includes(o.status)).length,
  }), [allOrders]);

  if (isLoading && allOrders.length === 0) return (
    <div className="flex flex-col h-[60vh] items-center justify-center opacity-30 gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
      <span className="text-xs font-bold uppercase tracking-[0.2em]">Monitorando Pedidos em Tempo Real...</span>
    </div>
  );

  return (
    <div className="space-y-2 animate-in fade-in duration-500 -m-2">
      
      {/* Header Compacto */}
      <div className="flex flex-col lg:flex-row items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
        
        <div className="flex flex-1 w-full lg:w-auto items-center gap-2">
            <div className="relative flex-1 lg:max-w-[300px]">
                <input 
                    type="text" 
                    placeholder="BUSCAR PEDIDO..." 
                    className="w-full h-9 pl-9 pr-4 bg-slate-100 border-none rounded-xl text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-slate-400"
                    value={searchTerm}
                    onChange={handleSearchChange}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                {searchTerm && (
                    <button onClick={() => { setSearchTerm(''); setDebouncedSearch(''); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X size={12} />
                    </button>
                )}
            </div>

            {selectedOrderIds.length > 0 && (
                <div className="flex items-center gap-1.5 animate-in slide-in-from-left-4 duration-300 bg-orange-50 p-1 rounded-xl border border-orange-100 shadow-sm">
                    <span className="text-xs font-bold text-orange-600 px-2 uppercase italic">{selectedOrderIds.length}</span>
                    
                    <button onClick={handleBulkBack} className="h-8 w-8 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-orange-600 flex items-center justify-center transition-all" title="Recuar Status"><ChevronLeft size={14} /></button>
                    
                    <button onClick={handleBulkAdvance} className="h-8 px-3 rounded-lg bg-orange-500 text-white text-[10px] font-bold uppercase italic hover:bg-orange-600 transition-all flex items-center gap-1">AVANÇAR <ChevronRight size={10} /></button>
                    
                    <button onClick={() => handleBulkStatusChange('READY')} className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-[10px] font-bold uppercase hover:bg-emerald-500 italic transition-all">PRONTOS</button>
                    
                    <button onClick={() => handleBulkStatusChange('COMPLETED')} className="h-8 px-3 rounded-lg bg-slate-900 text-white text-[10px] font-bold uppercase italic transition-all">FINALIZAR</button>
                    
                    <button onClick={() => setSelectedOrderIds([])} className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-200 flex items-center justify-center transition-all"><X size={14} /></button>
                </div>
            )}
        </div>
        
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
            <div className="flex p-0.5 bg-slate-100 rounded-xl border border-slate-200 shadow-inner">
                {[
                    { id: 'DELIVERY', label: 'DELIVERY', icon: Package, count: counts.DELIVERY },
                    { id: 'PICKUP', label: 'RETIRADA', icon: ShoppingBag, count: counts.PICKUP }
                ].map(seg => (
                    <button 
                        key={seg.id}
                        className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap bg-white text-slate-900 shadow-sm"
                    >
                        <seg.icon size={10} /> 
                        {seg.label}
                        <span className="ml-0.5 px-1 py-0.2 rounded text-[10px] bg-slate-900 text-white">{seg.count}</span>
                    </button>
                ))}
            </div>

            <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200">
                <button onClick={() => setViewMode('kanban')} className={cn("p-1.5 rounded-lg transition-all", viewMode === 'kanban' ? "bg-white text-orange-600 shadow-sm" : "text-slate-400")}><Kanban size={14} /></button>
                <button onClick={() => setViewMode('list')} className={cn("p-1.5 rounded-lg transition-all", viewMode === 'list' ? "bg-white text-orange-600 shadow-sm" : "text-slate-400")}><List size={14} /></button>
            </div>

            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl bg-white border-slate-200" onClick={fetchOrders}><RefreshCw size={14} className={isLoading ? "animate-spin" : "text-slate-400"}/></Button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50 shadow-inner p-1">
        {viewMode === 'kanban' ? (
          <OrderKanbanBoard 
            orders={filteredOrders} 
            onStatusChange={handleStatusChange} 
            onOpenDetails={handleOpenOrder}
            onCancelOrder={handleCancelOrder}
            selectedOrderIds={selectedOrderIds}
            toggleSelectOrder={toggleSelectOrder}
          />
        ) : (
          <OrderListView 
            orders={allOrders} 
            onOpenDetails={handleOpenOrder}
            onCancelOrder={handleCancelOrder}
            selectedOrderIds={selectedOrderIds}
            toggleSelectOrder={toggleSelectOrder}
          />
        )}
      </div>

      {selectedOrder && (
        <OrderEditor 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
          onRefresh={fetchOrders}
        />
      )}

      <DriverSelectionModal 
        isOpen={isDriverModalOpen}
        onClose={() => {
          setIsDriverModalOpen(false);
          setOrderIdPendingDriver(null);
          setNewStatusPendingDriver(null);
        }}
        onSelect={handleDriverSelect}
        orderId={orderIdPendingDriver || undefined}
      />
    </div>
  );
};

export default OrderManagement;
