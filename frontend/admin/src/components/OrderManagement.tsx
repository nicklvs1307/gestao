import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OrderKanbanBoard from './OrderKanbanBoard';
import OrderListView from './OrderListView';
import OrderDetailModal from './OrderDetailModal';
import { getAdminOrders, updateOrderStatus } from '../services/api';
import type { Order } from '@/types/index.ts';
import { Kanban, List, Loader2, X, RefreshCw, ShoppingBag, Package, Timer, CheckCircle, Smartphone } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { toast } from 'sonner';

type ViewMode = 'kanban' | 'list';
type OrderSegment = 'ALL' | 'TABLE' | 'DELIVERY';

const OrderManagement: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [activeSegment, setActiveSegment] = useState<OrderSegment>('ALL');
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const data = await getAdminOrders();
      const sortedOrders = data.sort((a: Order, b: Order) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllOrders(sortedOrders);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao sincronizar pedidos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // SSE for real-time updates in this view
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const restaurantId = localStorage.getItem('selectedRestaurantId') || user?.restaurantId;
    
    const eventSource = new EventSource(`${window.location.origin}/api/admin/orders/events?token=${token}&restaurantId=${restaurantId}`);

    eventSource.onmessage = (event) => {
      const eventData = JSON.parse(event.data);
      if (eventData.type === 'CONNECTION_ESTABLISHED') return;

      const updatedOrder = eventData.payload as Order;
      
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
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      // Optimistic update
      setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
      
      await updateOrderStatus(orderId, newStatus);
      // No need to fetchOrders(), SSE will handle the confirmation from server
      toast.success(`Pedido #${orderId.slice(-4).toUpperCase()} atualizado!`);
    } catch (error) { 
      toast.error("Erro ao atualizar status");
      fetchOrders(); // Revert on error
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
      if (selectedOrderIds.length === 0) return;
      try {
          setAllOrders(prev => prev.map(o => selectedOrderIds.includes(o.id) ? { ...o, status: newStatus } : o));
          const idsToProcess = [...selectedOrderIds];
          setSelectedOrderIds([]); 
          await Promise.all(idsToProcess.map(id => updateOrderStatus(id, newStatus)));
          toast.success(`${idsToProcess.length} pedidos atualizados!`);
      } catch (error) {
          fetchOrders();
      }
  };

  const toggleSelectOrder = (id: string) => {
      setSelectedOrderIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const filteredOrders = allOrders.filter(o => {
      const isStatusMatch = ['PENDING', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED'].includes(o.status);
      const isSegmentMatch = activeSegment === 'ALL' || o.orderType === activeSegment;
      return isStatusMatch && isSegmentMatch;
  });

  const counts = {
      ALL: allOrders.filter(o => ['PENDING', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED'].includes(o.status)).length,
      TABLE: allOrders.filter(o => o.orderType === 'TABLE' && ['PENDING', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED'].includes(o.status)).length,
      DELIVERY: allOrders.filter(o => o.orderType === 'DELIVERY' && ['PENDING', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED'].includes(o.status)).length,
  };

  if (isLoading && allOrders.length === 0) return (
    <div className="flex flex-col h-[60vh] items-center justify-center opacity-30 gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Monitorando Pedidos em Tempo Real...</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 -m-2">
      
      {/* Header Gestão de Pedidos */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-5">
            <div className="p-3.5 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-200">
                <ShoppingBag size={28} />
            </div>
            <div>
                <h1 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">Gestão de Pedidos</h1>
                <div className="flex items-center gap-2 mt-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{counts.ALL} Pedidos em Produção</span>
                </div>
            </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
            {/* Ações em Massa */}
            {selectedOrderIds.length > 0 && (
                <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-300 bg-orange-50 p-1.5 rounded-2xl border border-orange-100 shadow-lg">
                    <span className="text-[10px] font-black text-orange-600 px-3 uppercase italic">{selectedOrderIds.length} Selecionados</span>
                    <Button onClick={() => handleBulkStatusChange('READY')} size="sm" className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 italic">PRONTOS</Button>
                    <Button onClick={() => handleBulkStatusChange('COMPLETED')} size="sm" className="h-9 px-4 rounded-xl bg-slate-900 italic">FINALIZAR</Button>
                    <Button onClick={() => setSelectedOrderIds([])} variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-400"><X size={16} /></Button>
                </div>
            )}

            {/* Filtro de Segmento */}
            <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
                {[
                    { id: 'ALL', label: 'TUDO', icon: List },
                    { id: 'DELIVERY', label: 'DELIVERY/BALCÃO', icon: Package },
                    { id: 'TABLE', label: 'MESAS', icon: Smartphone }
                ].map(seg => (
                    <button 
                        key={seg.id}
                        onClick={() => seg.id === 'TABLE' ? navigate('/tables') : setActiveSegment(seg.id as any)}
                        className={cn(
                            "px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2",
                            activeSegment === seg.id ? "bg-white text-slate-900 shadow-md scale-[1.02]" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <seg.icon size={12} /> {seg.label}
                    </button>
                ))}
            </div>

            {/* Alternador de Visão */}
            <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200">
                <button onClick={() => setViewMode('kanban')} className={cn("p-2.5 rounded-xl transition-all", viewMode === 'kanban' ? "bg-white text-orange-600 shadow-md" : "text-slate-400")}><Kanban size={18} /></button>
                <button onClick={() => setViewMode('list')} className={cn("p-2.5 rounded-xl transition-all", viewMode === 'list' ? "bg-white text-orange-600 shadow-md" : "text-slate-400")}><List size={18} /></button>
            </div>

            <Button variant="outline" size="icon" className="h-11 w-11 rounded-2xl bg-white border-slate-200" onClick={fetchOrders}><RefreshCw size={18} className={isLoading ? "animate-spin" : "text-slate-400"}/></Button>
        </div>
      </div>

      {/* Conteúdo Principal (Kanban ou Lista) */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-[2.5rem] border-2 border-slate-100 bg-slate-50/50 shadow-inner p-2">
        {viewMode === 'kanban' ? (
          <OrderKanbanBoard 
            orders={filteredOrders} 
            onStatusChange={handleStatusChange} 
            onOpenDetails={setSelectedOrder}
            selectedOrderIds={selectedOrderIds}
            toggleSelectOrder={toggleSelectOrder}
          />
        ) : (
          <OrderListView 
            orders={allOrders} 
            onOpenDetails={setSelectedOrder}
            selectedOrderIds={selectedOrderIds}
            toggleSelectOrder={toggleSelectOrder}
          />
        )}
      </div>

      {selectedOrder && (
        <OrderDetailModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
          onStatusChange={handleStatusChange} 
        />
      )}
    </div>
  );
};

export default OrderManagement;