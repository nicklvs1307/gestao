import React from 'react';
import type { Order } from '@/types/index.ts';
import { formatSP } from '@/lib/timezone';
import { Eye, UtensilsCrossed, Clock, Truck, ShoppingBag, User, Bike, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface OrderListViewProps {
  orders: Order[];
  onOpenDetails: (order: Order) => void;
  onCancelOrder?: (orderId: string) => void;
  selectedOrderIds?: string[];
  toggleSelectOrder?: (id: string) => void;
  currentPage?: number;
  totalPages?: number;
  totalOrders?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  isLoading?: boolean;
}

const STATUS_MAP: Record<string, string> = {
    PENDING: 'Pendente',
    PREPARING: 'Cozinha',
    READY: 'Pronto',
    SHIPPED: 'Em Rota',
    DELIVERED: 'Entregue',
    COMPLETED: 'Finalizado',
    CANCELED: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-rose-500/10 text-rose-600 border-rose-200',
    PREPARING: 'bg-blue-500/10 text-blue-600 border-blue-200',
    READY: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    SHIPPED: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
    DELIVERED: 'bg-slate-500/10 text-slate-600 border-slate-200',
    COMPLETED: 'bg-slate-900/10 text-slate-900 border-slate-300',
    CANCELED: 'bg-red-500/10 text-red-600 border-red-200',
}

const OrderListView: React.FC<OrderListViewProps> = ({ 
  orders, 
  onOpenDetails, 
  onCancelOrder, 
  selectedOrderIds = [], 
  toggleSelectOrder,
  currentPage = 1,
  totalPages = 1,
  totalOrders = 0,
  itemsPerPage = 15,
  onPageChange,
  isLoading = false,
}) => {
  const startItem = totalOrders > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalOrders);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="h-full overflow-hidden flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
            <thead className="text-[9px] uppercase bg-slate-50 text-slate-400 border-b border-slate-100 sticky top-0 z-10 backdrop-blur-sm font-black tracking-widest">
            <tr>
                <th className="px-4 py-3 w-10">
                    <div className="w-4 h-4 rounded border-2 border-slate-200 bg-white" />
                </th>
                <th className="px-4 py-3">Pedido / Ref</th>
                <th className="px-4 py-3">Cliente / Tipo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Entregador</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Horário</th>
                <th className="px-4 py-3 text-right">Ações</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700">
            {orders.length === 0 ? (
                <tr>
                    <td colSpan={8} className="p-20 text-center text-slate-400">
                        <UtensilsCrossed className="mx-auto h-12 w-12 opacity-10 mb-4" />
                        <p className="font-black text-[10px] uppercase tracking-[0.2em] italic">Nenhum pedido encontrado no monitor</p>
                    </td>
                </tr>
            ) : (
                orders.map(order => {
                    const isPickup = order.orderType === 'PICKUP' || order.deliveryOrder?.deliveryType === 'pickup' || order.deliveryOrder?.deliveryType === 'retirada';
                    const isDelivery = order.orderType === 'DELIVERY' || (!!order.deliveryOrder && !isPickup);
                    const isTable = order.orderType === 'TABLE';
                    const deliveryType = order.deliveryOrder?.deliveryType?.toLowerCase();
                    const driverName = order.deliveryOrder?.driver?.name || 'Não atribuído';

                    return (
                        <tr 
                            key={order.id} 
                            className={cn(
                                "hover:bg-slate-50/80 transition-all group cursor-pointer",
                                selectedOrderIds.includes(order.id) && "bg-orange-50/50"
                            )}
                            onClick={() => onOpenDetails(order)}
                        >
                        <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); toggleSelectOrder?.(order.id); }}>
                            <div className={cn(
                                "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
                                selectedOrderIds.includes(order.id) ? "bg-orange-500 border-orange-500 text-white" : "bg-white border-slate-200"
                            )}>
                                {selectedOrderIds.includes(order.id) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                        </td>
                        <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                                <span className="font-black text-sm italic text-slate-900">
                                    #{order.dailyOrderNumber || '0'}
                                </span>
                                <div className="flex flex-col">
                                    <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest leading-none">
                                        ID: {order.id.slice(-6).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </td>
                        <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                                <span className="font-black text-[10px] text-slate-800 uppercase italic truncate max-w-[150px]">
                                    {order.deliveryOrder?.name || order.customerName || 'Consumidor'}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <div className={cn(
                                        "p-0.5 rounded text-[8px]",
                                        isPickup ? "text-blue-500 bg-blue-50" : (isDelivery ? "text-rose-500 bg-rose-50" : "text-emerald-500 bg-emerald-50")
                                    )}>
                                        {isPickup ? <ShoppingBag size={8} /> : (isDelivery ? <Truck size={8} /> : <UtensilsCrossed size={8} />)}
                                    </div>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">
                                        {isPickup ? 'Retirada' : (isDelivery ? 'Entrega' : 'Mesa')}
                                    </span>
                                </div>
                            </div>
                        </td>
                        <td className="px-4 py-3">
                            <span className={cn(
                                "inline-flex items-center rounded-lg px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border shadow-sm",
                                STATUS_COLORS[order.status] || "bg-muted text-slate-400 border-border"
                            )}>
                            {STATUS_MAP[order.status] || order.status}
                            </span>
                        </td>
                        <td className="px-4 py-3 text-slate-900">
                            {isDelivery && !isPickup ? (
                                <div className="flex items-center gap-1.5">
                                    <div className={cn(
                                        "p-1 rounded-lg border",
                                        order.deliveryOrder?.driverId ? "bg-indigo-600 border-indigo-700 text-white" : "bg-slate-100 border-slate-200 text-slate-400"
                                    )}>
                                        <Bike size={12} strokeWidth={3} />
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-black uppercase italic tracking-tighter",
                                        order.deliveryOrder?.driverId ? "text-indigo-700" : "text-slate-400"
                                    )}>
                                        {driverName}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-[8px] font-black text-slate-200 uppercase italic">N/A</span>
                            )}
                        </td>
                        <td className="px-4 py-3 font-black text-xs italic text-slate-900 tracking-tighter">
                            R$ {(order.total || 0).toFixed(2).replace('.', ',')}
                        </td>
                        <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase italic">
                                    <Clock size={10} className="text-orange-500" />
                                    {formatSP(order.createdAt, 'HH:mm')}
                                </div>
                                <span className="text-[7px] font-black text-slate-300 uppercase italic ml-3.5">
                                    {formatSP(order.createdAt, 'dd/MM/yy')}
                                </span>
                            </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                                <button 
                                    className="h-8 w-8 rounded-xl bg-slate-100 text-slate-400 hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center shadow-sm" 
                                    onClick={(e) => { e.stopPropagation(); onOpenDetails(order); }}
                                >
                                    <Eye size={14} />
                                </button>
                                {order.status !== 'CANCELED' && order.status !== 'COMPLETED' && onCancelOrder && (
                                    <button 
                                        className="h-8 w-8 rounded-xl bg-slate-100 text-slate-400 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center shadow-sm" 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            if (window.confirm(`Cancelar pedido #${order.dailyOrderNumber || order.id.slice(-4).toUpperCase()}?`)) {
                                                onCancelOrder(order.id);
                                            }
                                        }}
                                        title="Cancelar pedido"
                                    >
                                        <XCircle size={14} />
                                    </button>
                                )}
                            </div>
                        </td>
                        </tr>
                    );
                })
            )}
            </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalOrders > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Mostrando {startItem}-{endItem} de {totalOrders}
            </span>
            {isLoading && (
              <div className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange?.(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
                className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                  currentPage === 1 || isLoading
                    ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600"
                )}
              >
                <ChevronLeft size={14} />
              </button>

              {getPageNumbers().map((page, index) => {
                if (page === '...') {
                  return (
                    <span key={`ellipsis-${index}`} className="px-1 text-slate-400">
                      ...
                    </span>
                  );
                }
                const pageNum = page as number;
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange?.(pageNum)}
                    disabled={isLoading}
                    className={cn(
                      "h-8 min-w-[32px] px-2 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all",
                      currentPage === pageNum
                        ? "bg-orange-500 text-white shadow-sm"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600",
                      isLoading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => onPageChange?.(currentPage + 1)}
                disabled={currentPage === totalPages || isLoading}
                className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                  currentPage === totalPages || isLoading
                    ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600"
                )}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderListView;
