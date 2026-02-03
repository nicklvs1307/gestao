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
  selectedOrderIds: string[];
  toggleSelectOrder: (id: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ 
    id, 
    title, 
    orders, 
    onOpenDetails,
    selectedOrderIds,
    toggleSelectOrder
}) => {
  // useDroppable garante que a coluna inteira receba o drop, mesmo se vazia
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  const getStatusColor = () => {
    switch(id) {
        case 'PENDING': return "text-amber-600 border-amber-200 bg-amber-50";
        case 'PREPARING': return "text-blue-600 border-blue-200 bg-blue-50";
        case 'READY': return "text-emerald-600 border-emerald-200 bg-emerald-50";
        case 'SHIPPED': return "text-indigo-600 border-indigo-200 bg-indigo-50";
        default: return "text-slate-600 border-slate-200 bg-slate-50";
    }
  };

  return (
    <div 
        ref={setNodeRef} 
        className={cn(
            "flex flex-col h-full rounded-xl border transition-all duration-200",
            isOver ? "bg-primary/5 border-primary shadow-inner scale-[1.01]" : "bg-muted/10 border-border shadow-sm"
        )}
    >
      <div className={cn(
        "p-3 font-black text-[11px] uppercase tracking-widest border-b flex justify-between items-center rounded-t-xl bg-white dark:bg-slate-900",
        isOver && "bg-slate-50"
      )}>
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300" />
            {title}
        </div>
        <span className={cn(
            "w-6 h-6 rounded-full text-[10px] flex items-center justify-center text-white shadow-sm font-black",
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
        <div className="flex-1 p-2 overflow-y-auto space-y-2 min-h-[200px] transition-colors custom-scrollbar">
          {orders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20 py-16 grayscale">
                  <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-slate-400 mb-2" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Vazio</span>
              </div>
          ) : (
            orders.map(order => (
                <OrderCard 
                    key={order.id} 
                    order={order} 
                    onOpenDetails={onOpenDetails} 
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