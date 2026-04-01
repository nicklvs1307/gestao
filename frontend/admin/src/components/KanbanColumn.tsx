import React, { useMemo, useCallback, memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import OrderCard from './OrderCard';
import type { Order } from '@/types/index.ts';
import { cn } from '../lib/utils';
import { CheckCircle } from 'lucide-react';

const COLUMN_STYLES: Record<string, { dot: string; badge: string }> = {
  PENDING: { dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)] animate-pulse", badge: "bg-rose-500" },
  PREPARING: { dot: "bg-blue-500", badge: "bg-blue-500" },
  READY: { dot: "bg-emerald-500", badge: "bg-emerald-500" },
  SHIPPED: { dot: "bg-indigo-500", badge: "bg-indigo-500" },
  DELIVERED: { dot: "bg-slate-400", badge: "bg-slate-400" },
};

interface KanbanColumnProps {
  id: string;
  title: string;
  orders: Order[];
  onOpenDetails: (order: Order) => void;
  onStatusChange: (orderId: string, newStatus: string) => void;
  selectedOrderIds: string[];
  toggleSelectOrder: (id: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = memo(({ 
    id, 
    title, 
    orders, 
    onOpenDetails,
    onStatusChange,
    selectedOrderIds,
    toggleSelectOrder
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  const { allSelected, someSelected, columnTotal } = useMemo(() => {
    const selectedCount = orders.filter(o => selectedOrderIds.includes(o.id)).length;
    const total = orders.reduce((sum, o) => sum + o.total + (o.deliveryOrder?.deliveryFee || 0), 0);
    return {
      allSelected: orders.length > 0 && selectedCount === orders.length,
      someSelected: selectedCount > 0 && selectedCount < orders.length,
      columnTotal: total,
    };
  }, [orders, selectedOrderIds]);

  const handleToggleAll = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (allSelected) {
      orders.forEach(o => {
        if (selectedOrderIds.includes(o.id)) toggleSelectOrder(o.id);
      });
    } else {
      orders.forEach(o => {
        if (!selectedOrderIds.includes(o.id)) toggleSelectOrder(o.id);
      });
    }
  }, [orders, selectedOrderIds, allSelected, toggleSelectOrder]);

  const style = COLUMN_STYLES[id] || COLUMN_STYLES.DELIVERED;

  return (
    <div 
        ref={setNodeRef} 
        className={cn(
            "flex flex-col h-full rounded-2xl border transition-colors duration-200 overflow-hidden",
            isOver ? "bg-orange-50 border-orange-300 shadow-lg" : "bg-slate-50/50 border-slate-200/60 shadow-sm"
        )}
    >
      {/* Header Premium Dark */}
      <div className={cn(
        "px-3 py-2.5 flex justify-between items-center border-b border-slate-200/60",
        isOver ? "bg-orange-100 text-orange-700" : "bg-slate-900 text-white"
      )}>
        <div className="flex items-center gap-2">
            <button 
                onClick={handleToggleAll}
                aria-label={allSelected ? "Desselecionar todos" : "Selecionar todos"}
                className={cn(
                    "w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0",
                    allSelected ? "bg-white border-white text-slate-900" : 
                    someSelected ? "bg-slate-700 border-slate-500 text-slate-300" : 
                    "bg-transparent border-slate-500 hover:border-slate-300"
                )}
            >
                {allSelected && <CheckCircle size={10} strokeWidth={3} />}
                {someSelected && <div className="w-1.5 h-0.5 bg-slate-300 rounded-full" />}
            </button>

            <div className={cn("w-2 h-2 rounded-full", style.dot)} />
            <span className="text-[9px] font-black uppercase tracking-widest italic">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "px-1.5 py-0.5 rounded text-[9px] font-black text-white",
            style.badge
          )}>
            {orders.length}
          </span>
        </div>
      </div>

      {/* Column Total */}
      {orders.length > 0 && (
        <div className="px-3 py-1.5 bg-white/60 border-b border-slate-100">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">
            R$ {columnTotal.toFixed(2).replace('.', ',')}
          </span>
        </div>
      )}
      
      <SortableContext id={id} items={orders.map(o => o.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-2 overflow-y-auto space-y-2 min-h-[200px] custom-scrollbar">
          {orders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                  <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-300 mb-4 flex items-center justify-center">
                    <span className="text-lg font-bold text-slate-300">0</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nenhum Pedido</span>
              </div>
          ) : (
            orders.map(order => (
                <OrderCard 
                    key={order.id} 
                    order={order} 
                    onOpenDetails={onOpenDetails} 
                    onStatusChange={onStatusChange}
                    isSelected={selectedOrderIds.includes(order.id)}
                    onSelect={() => toggleSelectOrder(order.id)}
                />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}, (prev, next) => {
  // Only re-render if orders list changed, selection changed, or other props changed
  if (prev.id !== next.id || prev.title !== next.title) return false;
  if (prev.orders.length !== next.orders.length) return false;
  if (prev.selectedOrderIds.length !== next.selectedOrderIds.length) return false;
  // Deep check order IDs and statuses for changes
  for (let i = 0; i < prev.orders.length; i++) {
    if (prev.orders[i].id !== next.orders[i].id ||
        prev.orders[i].status !== next.orders[i].status ||
        prev.orders[i].updatedAt !== next.orders[i].updatedAt) {
      return false;
    }
  }
  return true;
});
KanbanColumn.displayName = 'KanbanColumn';

export default KanbanColumn;
