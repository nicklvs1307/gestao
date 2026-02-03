import React, { useState, useEffect } from 'react';
import OrderKanbanBoard from './OrderKanbanBoard';
import OrderListView from './OrderListView';
import OrderDetailModal from './OrderDetailModal';
import { getAdminOrders, updateOrderStatus } from '../services/api';
import type { Order } from '@/types/index.ts';
import { Kanban, List, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

type ViewMode = 'kanban' | 'list';
type OrderSegment = 'ALL' | 'TABLE' | 'DELIVERY';

const OrderManagement: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [activeSegment, setActiveSegment] = useState<OrderSegment>('ALL');
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  const fetchOrders = async () => {
    try {
      const data = await getAdminOrders();
      const sortedOrders = data.sort((a: Order, b: Order) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllOrders(sortedOrders);
      setError(null);
    } catch (err) {
      setError('Não foi possível carregar os pedidos.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // Polling de 10s para manter Kanban atualizado
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      // Se o pedido alterado for o que está aberto no modal, atualiza ele também
      if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
      await updateOrderStatus(orderId, newStatus);
    } catch (error) { 
      console.error('Falha ao atualizar status:', error);
      fetchOrders(); 
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
      if (selectedOrderIds.length === 0) return;
      
      const confirmMsg = newStatus === 'COMPLETED' ? `Deseja finalizar ${selectedOrderIds.length} pedidos?` : `Deseja mover ${selectedOrderIds.length} pedidos para a próxima etapa?`;
      if (!window.confirm(confirmMsg)) return;

      try {
          // Otimista: Atualiza localmente
          setAllOrders(prev => prev.map(o => selectedOrderIds.includes(o.id) ? { ...o, status: newStatus } : o));
          const idsToProcess = [...selectedOrderIds];
          setSelectedOrderIds([]); // Limpa seleção

          // Dispara as atualizações em paralelo
          await Promise.all(idsToProcess.map(id => updateOrderStatus(id, newStatus)));
      } catch (error) {
          console.error("Erro na atualização em massa", error);
          fetchOrders();
      }
  };

  const toggleSelectOrder = (id: string) => {
      setSelectedOrderIds(prev => 
          prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
  };

  const openDetailsModal = (order: Order) => setSelectedOrder(order);
  const closeDetailsModal = () => setSelectedOrder(null);

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
    <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] space-y-3 relative px-2">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-1">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 italic uppercase tracking-tighter">
            Gestão de Pedidos
            <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest">{counts.ALL} ativos</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-medium uppercase tracking-widest">Fluxo de produção e entregas em tempo real.</p>
        </div>
        
        <div className="flex items-center gap-3">
            {selectedOrderIds.length > 0 && (
                <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-[9px] font-black text-primary bg-primary/5 px-2 py-1.5 rounded-lg mr-1 uppercase italic">
                        {selectedOrderIds.length} Selecionados
                    </span>
                    <button 
                        onClick={() => handleBulkStatusChange('READY')}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-md transition-all"
                    >
                        Prontos
                    </button>
                    <button 
                        onClick={() => handleBulkStatusChange('COMPLETED')}
                        className="bg-slate-900 hover:bg-black text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-md transition-all"
                    >
                        Finalizar
                    </button>
                    <button 
                        onClick={() => setSelectedOrderIds([])}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1.5"
                        title="Limpar Seleção"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <button 
                    onClick={() => setActiveSegment('DELIVERY')}
                    className={cn("px-3 py-1 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all", activeSegment === 'DELIVERY' || activeSegment === 'ALL' ? "bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white" : "text-slate-400 hover:text-slate-600")}
                >
                    Delivery / Balcão <span className="opacity-50 ml-1">({counts.DELIVERY})</span>
                </button>
                <button 
                    onClick={() => navigate('/tables')}
                    className="px-3 py-1 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all text-slate-400 hover:text-primary hover:bg-white"
                >
                    Ir para Mesas (Salão)
                </button>
            </div>

            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <button 
                    onClick={() => setViewMode('kanban')} 
                    className={cn("p-1.5 rounded-lg transition-all", viewMode === 'kanban' ? "bg-white dark:bg-slate-900 text-primary shadow-sm" : "text-slate-400")}
                >
                    <Kanban size={16} />
                </button>
                <button 
                    onClick={() => setViewMode('list')} 
                    className={cn("p-1.5 rounded-lg transition-all", viewMode === 'list' ? "bg-white dark:bg-slate-900 text-primary shadow-sm" : "text-slate-400")}
                >
                    <List size={16} />
                </button>
            </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/30 p-1">
        {viewMode === 'kanban' ? (
          <OrderKanbanBoard 
            orders={filteredOrders} 
            onStatusChange={handleStatusChange} 
            onOpenDetails={openDetailsModal}
            selectedOrderIds={selectedOrderIds}
            toggleSelectOrder={toggleSelectOrder}
          />
        ) : (
          <OrderListView 
            orders={allOrders} 
            onOpenDetails={openDetailsModal}
            selectedOrderIds={selectedOrderIds}
            toggleSelectOrder={toggleSelectOrder}
          />
        )}
      </div>

      {selectedOrder && (
        <OrderDetailModal 
          order={selectedOrder} 
          onClose={closeDetailsModal} 
          onStatusChange={handleStatusChange} 
        />
      )}
    </div>
  );
};

export default OrderManagement;
