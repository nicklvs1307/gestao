import React from 'react';
import type { Order } from '@/types/index.ts';
import { format } from 'date-fns';
import { Eye, UtensilsCrossed, Clock, Truck, ShoppingBag, User, Bike } from 'lucide-react';
import { cn } from '../lib/utils';

interface OrderListViewProps {
  orders: Order[];
  onOpenDetails: (order: Order) => void;
  selectedOrderIds?: string[];
  toggleSelectOrder?: (id: string) => void;
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

const OrderListView: React.FC<OrderListViewProps> = ({ orders, onOpenDetails, selectedOrderIds = [], toggleSelectOrder }) => {
  return (
    <div className="h-full overflow-hidden flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
            <thead className="text-[9px] uppercase bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-10 font-black tracking-widest italic">
            <tr>
                <th className="px-4 py-3 w-10">
                    <div className="w-4 h-4 rounded border-2 border-slate-600 bg-slate-800" />
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
                    const isDelivery = order.orderType === 'DELIVERY' || !!order.deliveryOrder;
                    const deliveryType = order.deliveryOrder?.deliveryType?.toLowerCase();
                    const isPickup = deliveryType === 'pickup' || deliveryType === 'retirada';
                    const driverName = order.deliveryOrder?.driver?.name || 'Não atribuído';

                    return (
                        <tr 
                            key={order.id} 
                            className={cn(
                                "hover:bg-orange-50/60 transition-all duration-150 group cursor-pointer border-b border-slate-50/50 last:border-b-0",
                                selectedOrderIds.includes(order.id) && "bg-orange-50/50 border-orange-100"
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
                                        !isDelivery ? "text-emerald-500 bg-emerald-50" : (isPickup ? "text-blue-500 bg-blue-50" : "text-rose-500 bg-rose-50")
                                    )}>
                                        {!isDelivery ? <UtensilsCrossed size={8} /> : (isPickup ? <ShoppingBag size={8} /> : <Truck size={8} />)}
                                    </div>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">
                                        {!isDelivery ? `Mesa ${order.tableNumber || '?'}` : (isPickup ? 'Retirada' : 'Entrega')}
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
                            R$ {((order.total || 0) + (order.deliveryOrder?.deliveryFee || 0)).toFixed(2).replace('.', ',')}
                        </td>
                        <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase italic">
                                    <Clock size={10} className="text-orange-500" />
                                    {format(new Date(order.createdAt), 'HH:mm')}
                                </div>
                                <span className="text-[7px] font-black text-slate-300 uppercase italic ml-3.5">
                                    {format(new Date(order.createdAt), 'dd/MM/yy')}
                                </span>
                            </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                            <button 
                                className="h-8 w-8 rounded-xl bg-slate-100 text-slate-400 hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center shadow-sm" 
                                onClick={(e) => { e.stopPropagation(); onOpenDetails(order); }}
                            >
                                <Eye size={14} />
                            </button>
                        </td>
                        </tr>
                    );
                })
            )}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderListView;
