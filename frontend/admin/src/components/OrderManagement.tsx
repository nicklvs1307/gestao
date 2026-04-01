import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import OrderKanbanBoard from './OrderKanbanBoard';
import OrderListView from './OrderListView';
import OrderEditor from './OrderEditor';
import DriverSelectionModal from './DriverSelectionModal';
import { getAdminOrders, updateOrderStatus, getOrder, assignDriver } from '../services/api';
import type { Order } from '@/types/index.ts';
import { Kanban, List, Search, Loader2, X, RefreshCw, ShoppingBag, Package, Timer, CheckCircle, Smartphone, ChevronRight, ChevronLeft, Trash2, TrendingUp, DollarSign, Clock, Truck } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

type ViewMode = 'kanban' | 'list';
type OrderSegment = 'ALL' | 'TABLE' | 'DELIVERY';

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
      const deliveryOrders = data.filter((o: Order) => o.orderType === 'DELIVERY');
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
      if (updatedOrder.orderType !== 'DELIVERY') return;

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
    if (newStatus === 'SHIPPED') {
      const order = allOrders.find(o => o.id === orderId);
      const isDelivery = order?.orderType === 'DELIVERY' || !!order?.deliveryOrder;
      const isPickup = order?.deliveryOrder?.deliveryType === 'pickup';
      
      if (isDelivery && !isPickup && !order?.deliveryOrder?.driverId) {
        setOrderIdPendingDriver(orderId);
        setNewStatusPendingDriver(newStatus);
        setIsDriverModalOpen(true);
        return;
      }
    }

    try {
      setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      setSelectedOrder(current => current && current.id === orderId ? { ...current, status: newStatus } : current);
      
      await updateOrderStatus(orderId, newStatus);
      toast.success(`Pedido #${orderId.slice(-4).toUpperCase()} atualizado!`);
    } catch (error) { 
      toast.error("Erro ao atualizar status");
      fetchOrders();
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

  // Memoized filtered orders
  const filteredOrders = useMemo(() => {
    return allOrders.filter(o => {
      const isStatusMatch = ACTIVE_STATUSES.includes(o.status);
      const isSegmentMatch = activeSegment === 'ALL' || o.orderType === activeSegment;
      const isSearchMatch = !debouncedSearch || 
        o.id.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
        (o.customerName && o.customerName.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
        (o.deliveryOrder?.name && o.deliveryOrder.name.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
        (o.tableNumber && o.tableNumber.toString().includes(debouncedSearch));
      
      return isStatusMatch && isSegmentMatch && isSearchMatch;
    });
  }, [allOrders, activeSegment, debouncedSearch]);

  // Memoized counts
  const counts = useMemo(() => ({
    DELIVERY: allOrders.filter(o => o.orderType === 'DELIVERY' && ACTIVE_STATUSES.includes(o.status)).length,
  }), [allOrders]);

  // KPI calculations
  const kpis = useMemo(() => {
    const activeOrders = allOrders.filter(o => ACTIVE_STATUSES.includes(o.status));
    const totalRevenue = activeOrders.reduce((sum, o) => sum + o.total + (o.deliveryOrder?.deliveryFee || 0), 0);
    const avgTicket = activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0;
    const pending = activeOrders.filter(o => o.status === 'PENDING').length;
    const preparing = activeOrders.filter(o => o.status === 'PREPARING').length;
    const ready = activeOrders.filter(o => o.status === 'READY').length;
    const shipped = activeOrders.filter(o => o.status === 'SHIPPED').length;
    return { totalActive: activeOrders.length, totalRevenue, avgTicket, pending, preparing, ready, shipped };
  }, [allOrders]);

  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  if (isLoading && allOrders.length === 0) return (
    <div className="flex flex-col h-[60vh] items-center justify-center opacity-30 gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
      <span className="text-xs font-bold uppercase tracking-[0.2em]">Monitorando Pedidos em Tempo Real...</span>
    </div>
  );

  return (
    <motion.div 
      className="flex flex-col gap-4 -m-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      
      {/* HEADER ERP Premium */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
            <ShoppingBag size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none flex items-center gap-2">
              Monitor de Pedidos
            </h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
              Controle em Tempo Real • Delivery
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          <div className="relative flex-1 lg:max-w-[280px]">
            <input
              type="text"
              placeholder="BUSCAR PEDIDO, CLIENTE..."
              className="w-full h-10 pl-10 pr-8 bg-slate-100 border-none rounded-xl text-[10px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-slate-400"
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            {searchTerm && (
              <button onClick={() => { setSearchTerm(''); setDebouncedSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>

          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-white border-slate-200" onClick={fetchOrders}><RefreshCw size={14} className={isLoading ? "animate-spin" : "text-slate-400"}/></Button>
        </div>
      </div>

      {/* BULK ACTIONS BAR */}
      {selectedOrderIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          className="flex items-center gap-1.5 bg-orange-50 p-2 rounded-xl border border-orange-100 shadow-sm animate-in slide-in-from-left-4 duration-300"
        >
          <span className="text-xs font-bold text-orange-600 px-2 uppercase italic">{selectedOrderIds.length} selecionados</span>
          <button onClick={handleBulkBack} className="h-8 w-8 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-orange-600 flex items-center justify-center transition-all" title="Recuar Status"><ChevronLeft size={14} /></button>
          <button onClick={handleBulkAdvance} className="h-8 px-3 rounded-lg bg-orange-500 text-white text-[10px] font-bold uppercase italic hover:bg-orange-600 transition-all flex items-center gap-1">AVANÇAR <ChevronRight size={10} /></button>
          <button onClick={() => handleBulkStatusChange('READY')} className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-[10px] font-bold uppercase hover:bg-emerald-500 italic transition-all">PRONTOS</button>
          <button onClick={() => handleBulkStatusChange('COMPLETED')} className="h-8 px-3 rounded-lg bg-slate-900 text-white text-[10px] font-bold uppercase italic transition-all">FINALIZAR</button>
          <button onClick={() => setSelectedOrderIds([])} className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-200 flex items-center justify-center transition-all"><X size={14} /></button>
        </motion.div>
      )}

      {/* KPIs DENSOS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag size={14} className="text-orange-400" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Pedidos Ativos</span>
          </div>
          <p className="text-lg font-black italic tracking-tighter">{kpis.totalActive}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[7px] font-bold text-orange-400 uppercase">{kpis.shipped} em rota</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={14} className="text-emerald-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Faturamento</span>
          </div>
          <p className="text-lg font-black italic tracking-tighter text-emerald-600">{formatCurrency(kpis.totalRevenue)}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[7px] font-bold text-slate-400 uppercase">Pedidos ativos</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-blue-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Ticket Médio</span>
          </div>
          <p className="text-lg font-black italic tracking-tighter text-blue-600">{formatCurrency(kpis.avgTicket)}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[7px] font-bold text-slate-400 uppercase">Por pedido</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-rose-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Pendentes</span>
          </div>
          <p className="text-lg font-black italic tracking-tighter text-rose-600">{kpis.pending}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[7px] font-bold text-slate-400 uppercase">Aguardando</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Truck size={14} className="text-blue-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Em Preparo</span>
          </div>
          <p className="text-lg font-black italic tracking-tighter text-blue-600">{kpis.preparing}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[7px] font-bold text-slate-400 uppercase">Cozinha ativa</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={14} className="text-emerald-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Prontos</span>
          </div>
          <p className="text-lg font-black italic tracking-tighter text-emerald-600">{kpis.ready}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[7px] font-bold text-slate-400 uppercase">Aguardando entrega</span>
          </div>
        </Card>
      </div>

      {/* TOOLBAR: View Mode */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2">
          <Package size={14} className="text-rose-500" />
          <span className="text-[10px] font-black text-slate-900 uppercase italic tracking-tighter">
            DELIVERY
          </span>
          <span className="ml-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-slate-900 text-white">
            {counts.DELIVERY}
          </span>
        </div>

        <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200">
          <button onClick={() => setViewMode('kanban')} className={cn("p-2 rounded-lg transition-all", viewMode === 'kanban' ? "bg-white text-orange-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}>
            <Kanban size={16} />
          </button>
          <button onClick={() => setViewMode('list')} className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-white text-orange-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}>
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50 shadow-inner p-1">
        {viewMode === 'kanban' ? (
          <OrderKanbanBoard
            orders={filteredOrders}
            onStatusChange={handleStatusChange}
            onOpenDetails={handleOpenOrder}
            selectedOrderIds={selectedOrderIds}
            toggleSelectOrder={toggleSelectOrder}
          />
        ) : (
          <OrderListView
            orders={allOrders}
            onOpenDetails={handleOpenOrder}
            selectedOrderIds={selectedOrderIds}
            toggleSelectOrder={toggleSelectOrder}
          />
        )}
      </div>

      {/* STATUS BAR */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sistema Online</span>
          </div>
          <div className="w-px h-4 bg-slate-200" />
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
            {filteredOrders.length} visíveis • {allOrders.length} total
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
            WebSocket ativo • Tempo real
          </span>
        </div>
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
    </motion.div>
  );
};

export default OrderManagement;
