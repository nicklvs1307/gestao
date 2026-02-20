import React from 'react';
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
  onOpenDetails: (order: Order) => void;
  selectedOrderIds: string[];
  toggleSelectOrder: (id: string) => void;
}

const OrderKanbanBoard: React.FC<OrderKanbanBoardProps> = ({ 
    orders, 
    onStatusChange, 
    onOpenDetails,
    selectedOrderIds,
    toggleSelectOrder
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Sensibilidade do clique vs arraste
      },
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Encontra o pedido sendo arrastado
    const activeOrder = orders.find(o => o.id === activeId);
    if (!activeOrder) return;

    // Se overId já for um dos status, é um drop direto na coluna
    let newStatus = Object.keys(KANBAN_COLUMNS).includes(overId) ? overId : null;

    // Se não for um status, é um drop sobre outro card. 
    // Precisamos achar o status (coluna) desse outro card.
    if (!newStatus) {
        const overOrder = orders.find(o => o.id === overId);
        if (overOrder) {
            newStatus = overOrder.status;
        }
    }

    // Se o status mudou, dispara o evento
    if (newStatus && activeOrder.status !== newStatus) {
      onStatusChange(activeId, newStatus);
    }
  };

  return (
    <DndContext 
        sensors={sensors} 
        collisionDetection={closestCorners} 
        onDragEnd={handleDragEnd}
    >
      <div className="flex flex-row gap-2 h-full p-0.5 overflow-x-auto custom-scrollbar">
        {Object.entries(KANBAN_COLUMNS).map(([statusKey, statusValue]) => {
          const columnOrders = orders.filter(order => order.status === statusKey);
          
          // Se for a coluna PENDENTE e não houver pedidos, não renderiza
          if (statusKey === 'PENDING' && columnOrders.length === 0) {
            return null;
          }
          
          return (
            <div key={statusKey} className="flex flex-col flex-none w-[280px] sm:w-[310px] h-full bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden">
                <KanbanColumn
                  id={statusKey}
                  title={statusValue}
                  orders={columnOrders}
                  onOpenDetails={onOpenDetails}
                  onStatusChange={onStatusChange}
                  selectedOrderIds={selectedOrderIds}
                  toggleSelectOrder={toggleSelectOrder}
                />
            </div>
          );
        })}
      </div>
    </DndContext>
  );
};

export default OrderKanbanBoard;
