import React from 'react';
import type { Order } from '@/types/index.ts';
import { format } from 'date-fns';
import { Eye, UtensilsCrossed, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

interface OrderListViewProps {
  orders: Order[];
  onOpenDetails: (order: Order) => void;
}

const STATUS_MAP: Record<string, string> = {
    PENDING: 'Pendente',
    PREPARING: 'Em Preparo',
    READY: 'Pronto',
    COMPLETED: 'Finalizado',
    CANCELED: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
    PREPARING: 'bg-blue-500/10 text-blue-600 border-blue-200',
    READY: 'bg-green-500/10 text-green-600 border-green-200',
    COMPLETED: 'bg-gray-500/10 text-gray-600 border-gray-200',
    CANCELED: 'bg-red-500/10 text-red-600 border-red-200',
}

const OrderListView: React.FC<OrderListViewProps> = ({ orders, onOpenDetails }) => {
  return (
    <div className="h-full overflow-hidden flex flex-col bg-background">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
            <thead className="text-[9px] uppercase bg-muted/10 text-slate-400 border-b border-border sticky top-0 z-10 backdrop-blur-sm font-black tracking-widest">
            <tr>
                <th className="px-4 py-3">Mesa / Ref</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Itens</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Horário</th>
                <th className="px-4 py-3 text-right">Ações</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
            {orders.length === 0 ? (
                <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400">
                        <UtensilsCrossed className="mx-auto h-10 w-10 opacity-20 mb-3" />
                        <p className="font-black text-[10px] uppercase tracking-widest">Nenhum pedido</p>
                    </td>
                </tr>
            ) : (
                orders.map(order => (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-3">
                        <p className="font-bold text-xs uppercase italic tracking-tight">
                            {order.tableNumber ? `Mesa ${order.tableNumber}` : 'Balcão / Deliv.'}
                        </p>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">#{order.id.slice(-6).toUpperCase()}</p>
                    </td>
                    <td className="px-4 py-3">
                        <span className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border shadow-sm",
                            STATUS_COLORS[order.status] || "bg-muted text-slate-400 border-border"
                        )}>
                        {STATUS_MAP[order.status] || order.status}
                        </span>
                    </td>
                    <td className="px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                        {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                    </td>
                    <td className="px-4 py-3 font-black text-xs italic text-foreground/80">
                        R$ {order.total.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                            <Clock size={10} />
                            {format(new Date(order.createdAt), 'HH:mm')}
                        </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                        <button 
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-foreground/70 hover:bg-primary hover:text-white text-[9px] font-black uppercase tracking-widest transition-all shadow-sm" 
                            onClick={() => onOpenDetails(order)}
                        >
                        <Eye size={12} />
                        Ver
                        </button>
                    </td>
                    </tr>
                ))
            )}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderListView;
