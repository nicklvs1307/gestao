import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OrderKanbanBoard from './OrderKanbanBoard';
import OrderListView from './OrderListView';
import OrderDetailModal from './OrderDetailModal';
import OrderEditor from './OrderEditor';
import { getAdminOrders, updateOrderStatus } from '../services/api';
import type { Order } from '@/types/index.ts';
import { Kanban, List, Search, Loader2, X, RefreshCw, ShoppingBag, Package, Timer, CheckCircle, Smartphone } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { toast } from 'sonner';

type ViewMode = 'kanban' | 'list';
type OrderSegment = 'ALL' | 'TABLE' | 'DELIVERY';

import { useSocket } from '../hooks/useSocket';

const OrderManagement: React.FC = () => {
  const navigate = useNavigate();
  const { on, off } = useSocket();
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [activeSegment, setActiveSegment] = useState<OrderSegment>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
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

    // Socket.io for real-time updates
    on('order_update', (eventData: any) => {
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

      // Atualiza o pedido selecionado se for o mesmo que mudou, usando a forma funcional
      setSelectedOrder(current => {
        if (current && current.id === updatedOrder.id) {
          return updatedOrder;
        }
        return current;
      });
    });

    return () => {
      off('order_update');
    };
  }, [on, off]); // Removido selectedOrder para evitar loops

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
      const isSearchMatch = !searchTerm || 
        o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (o.customerName && o.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.deliveryOrder?.name && o.deliveryOrder.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.tableNumber && o.tableNumber.toString().includes(searchTerm));
      
      return isStatusMatch && isSegmentMatch && isSearchMatch;
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
    <div className="space-y-2 animate-in fade-in duration-500 -m-2">
      
      {/* Header Compacto com Ferramentas */}
      <div className="flex flex-col lg:flex-row items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
        
        <div className="flex flex-1 w-full lg:w-auto items-center gap-2">
            {/* Search Bar */}
            <div className="relative flex-1 lg:max-w-[300px]">
                <input 
                    type="text" 
                    placeholder="BUSCAR PEDIDO OU MESA..." 
                    className="w-full h-9 pl-9 pr-4 bg-slate-100 border-none rounded-xl text-[9px] font-black uppercase tracking-widest focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-slate-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X size={12} />
                    </button>
                )}
            </div>

            {/* Ações em Massa - Compactas */}
            {selectedOrderIds.length > 0 && (
                <div className="flex items-center gap-1.5 animate-in slide-in-from-left-4 duration-300 bg-orange-50 p-1 rounded-xl border border-orange-100 shadow-sm">
                    <span className="text-[9px] font-black text-orange-600 px-2 uppercase italic">{selectedOrderIds.length}</span>
                    <button onClick={() => handleBulkStatusChange('READY')} className="h-7 px-3 rounded-lg bg-emerald-600 text-white text-[8px] font-black uppercase hover:bg-emerald-500 italic transition-all">PRONTOS</button>
                    <button onClick={() => handleBulkStatusChange('COMPLETED')} className="h-7 px-3 rounded-lg bg-slate-900 text-white text-[8px] font-black uppercase italic transition-all">FINALIZAR</button>
                    <button onClick={() => setSelectedOrderIds([])} className="h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-200 flex items-center justify-center transition-all"><X size={14} /></button>
                </div>
            )}
        </div>
        
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
            {/* Filtro de Segmento - Compacto */}
            <div className="flex p-0.5 bg-slate-100 rounded-xl border border-slate-200 shadow-inner">
                {[
                    { id: 'ALL', label: 'TUDO', icon: List, count: counts.ALL },
                    { id: 'DELIVERY', label: 'DELIVERY/BALCÃO', icon: Package, count: counts.DELIVERY },
                    { id: 'TABLE', label: 'MESAS', icon: Smartphone, count: counts.TABLE }
                ].map(seg => (
                    <button 
                        key={seg.id}
                        onClick={() => seg.id === 'TABLE' ? navigate('/tables') : setActiveSegment(seg.id as any)}
                        className={cn(
                            "px-3 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap",
                            activeSegment === seg.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <seg.icon size={10} /> 
                        {seg.label}
                        <span className={cn(
                            "ml-0.5 px-1 py-0.2 rounded text-[7px]",
                            activeSegment === seg.id ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
                        )}>{seg.count}</span>
                    </button>
                ))}
            </div>

            {/* Alternador de Visão - Compacto */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200">
                <button onClick={() => setViewMode('kanban')} className={cn("p-1.5 rounded-lg transition-all", viewMode === 'kanban' ? "bg-white text-orange-600 shadow-sm" : "text-slate-400")}><Kanban size={14} /></button>
                <button onClick={() => setViewMode('list')} className={cn("p-1.5 rounded-lg transition-all", viewMode === 'list' ? "bg-white text-orange-600 shadow-sm" : "text-slate-400")}><List size={14} /></button>
            </div>

            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl bg-white border-slate-200" onClick={fetchOrders}><RefreshCw size={14} className={isLoading ? "animate-spin" : "text-slate-400"}/></Button>
        </div>
      </div>

      {/* Conteúdo Principal (Kanban ou Lista) */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50 shadow-inner p-1">
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
        <OrderEditor 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
          onRefresh={fetchOrders}
        />
      )}
    </div>
  );
};

export default OrderManagement;