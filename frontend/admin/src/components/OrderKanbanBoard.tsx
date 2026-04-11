import React, { useMemo, useCallback, useState } from 'react';
import { 
  DndContext, 
  closestCorners, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';

import KanbanColumn from './KanbanColumn';
import type { Order } from '@/types/index.ts';
import { cn } from '../lib/utils';

const KANBAN_COLUMNS: Record<string, string> = {
  PENDING: 'Pendentes',
  PREPARING: 'Cozinha',
  READY: 'Aguardando Entrega',
  SHIPPED: 'Saiu p/ Entrega',
  DELIVERED: 'Entregue'
};

interface OrderKanbanBoardProps {
  orders: Order[];
  onStatusChange: (orderId: string, newStatus: string) => void;
  onCancelOrder?: (orderId: string) => void;
  onOpenDetails: (order: Order) => void;
  selectedOrderIds: string[];
  toggleSelectOrder: (id: string) => void;
}

const OrderKanbanBoard: React.FC<OrderKanbanBoardProps> = ({ 
    orders, 
    onStatusChange, 
    onCancelOrder,
    onOpenDetails,
    selectedOrderIds,
    toggleSelectOrder
}) => {
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Memoize orders per column
  const columnsMap = useMemo(() => {
    const map: Record<string, Order[]> = {};
    for (const key of Object.keys(KANBAN_COLUMNS)) {
      map[key] = orders.filter(o => o.status === key);
    }
    return map;
  }, [orders]);

  const handleDragStart = useCallback((event: any) => {
    const order = orders.find(o => o.id === event.active.id);
    if (order) setActiveOrder(order);
  }, [orders]);

  const handleDragEnd = useCallback((event: any) => {
    setActiveOrder(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const activeOrder = orders.find(o => o.id === activeId);
    if (!activeOrder) return;

    let newStatus = Object.keys(KANBAN_COLUMNS).includes(overId) ? overId : null;

    if (!newStatus) {
      const overOrder = orders.find(o => o.id === overId);
      if (overOrder) newStatus = overOrder.status;
    }

    if (newStatus && activeOrder.status !== newStatus) {
      onStatusChange(activeId, newStatus);
    }
  }, [orders, onStatusChange]);

  const handleDragCancel = useCallback(() => {
    setActiveOrder(null);
  }, []);

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: '0.4' } },
    }),
  };

  return (
    <DndContext 
        sensors={sensors} 
        collisionDetection={closestCorners} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
    >
      <div className="flex gap-3 h-full p-2 overflow-x-auto custom-scrollbar">
        {Object.entries(KANBAN_COLUMNS).map(([statusKey, statusValue], index) => {
          const columnOrders = columnsMap[statusKey];
          
          if (statusKey === 'PENDING' && columnOrders.length === 0) return null;
          
          return (
            <div
              key={statusKey}
              className="flex flex-col flex-none w-[300px] h-full overflow-hidden"
            >
              <KanbanColumn
                id={statusKey}
                title={statusValue}
                orders={columnOrders}
                onOpenDetails={onOpenDetails}
                onStatusChange={onStatusChange}
                onCancelOrder={onCancelOrder}
                selectedOrderIds={selectedOrderIds}
                toggleSelectOrder={toggleSelectOrder}
              />
            </div>
          );
        })}
      </div>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeOrder ? (
          <div className={cn(
            "bg-white rounded-2xl border-2 border-orange-400 shadow-2xl p-4 w-[280px] opacity-95"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-bold text-slate-900">
                #{activeOrder.dailyOrderNumber || '0'}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                - {activeOrder.deliveryOrder?.name || activeOrder.customerName || 'Consumidor'}
              </span>
            </div>
            <div className="text-xs text-slate-500 space-y-0.5">
              {Array.isArray(activeOrder.items) && activeOrder.items.slice(0, 2).map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="truncate"><b className="text-orange-500">{item.quantity}x</b> {item.product?.name}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 text-base font-bold text-slate-900">
              R$ {(activeOrder.total + (activeOrder.deliveryOrder?.deliveryFee || 0)).toFixed(2).replace('.', ',')}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default OrderKanbanBoard;
