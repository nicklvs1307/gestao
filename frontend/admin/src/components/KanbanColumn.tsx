import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import OrderCard from './OrderCard';
import type { Order } from '@/types/index.ts';
import { cn } from '../lib/utils';

interface KanbanColumnProps {
  id: string;
  title: string;
  orders: Order[];
  onOpenDetails: (order: Order) => void;
  onStatusChange: (orderId: string, newStatus: string) => void;
  selectedOrderIds: string[];
  toggleSelectOrder: (id: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ 
    id, 
    title, 
    orders, 
    onOpenDetails,
    onStatusChange,
    selectedOrderIds,
    toggleSelectOrder
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div 
        ref={setNodeRef} 
        className={cn(
            "flex flex-col h-full rounded-[2rem] border transition-all duration-300",
            isOver ? "bg-orange-500/5 border-orange-500 shadow-xl scale-[1.01]" : "bg-slate-100/50 border-slate-200/60 shadow-sm"
        )}
    >
      {/* Header da Coluna */}
      <div className={cn(
        "p-5 font-black text-[10px] uppercase tracking-[0.2em] flex justify-between items-center bg-transparent",
        isOver && "text-orange-600"
      )}>
        <div className="flex items-center gap-3 text-slate-900">
            <div className={cn(
                "w-2 h-2 rounded-full",
                id === 'PENDING' ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)] animate-pulse" :
                id === 'PREPARING' ? "bg-blue-500" :
                id === 'READY' ? "bg-emerald-500" :
                id === 'SHIPPED' ? "bg-indigo-500" :
                "bg-slate-400"
            )} />
            {title}
        </div>
        <span className={cn(
            "px-2.5 py-1 rounded-lg text-[9px] font-black text-white shadow-md",
            id === 'PENDING' ? "bg-rose-500" :
            id === 'PREPARING' ? "bg-blue-500" :
            id === 'READY' ? "bg-emerald-500" :
            id === 'SHIPPED' ? "bg-indigo-500" :
            "bg-slate-400"
        )}>
            {orders.length}
        </span>
      </div>
      
      <SortableContext id={id} items={orders.map(o => o.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-3 overflow-y-auto space-y-3 min-h-[200px] transition-colors custom-scrollbar">
          {orders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-30 py-20 grayscale scale-90">
                  <div className="w-16 h-16 rounded-[2rem] border-2 border-dashed border-slate-400 mb-4 flex items-center justify-center">
                    <span className="text-xl font-black italic text-slate-400 opacity-20">KI</span>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic">Nenhum Pedido</span>
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
};

export default KanbanColumn;