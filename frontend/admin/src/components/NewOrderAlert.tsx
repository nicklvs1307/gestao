import React from 'react';
import type { Order } from '../types';
import { format } from 'date-fns';
import { ShoppingBag, Bell, CheckCircle, XCircle, Clock, MapPin, Tag } from 'lucide-react';
import { cn } from '../lib/utils';

interface NewOrderAlertProps {
  orders: Order[];
  onAccept: (orderId: string) => void;
  onReject: (orderId: string) => void;
  onClose: () => void;
}

const NewOrderAlert: React.FC<NewOrderAlertProps> = ({ orders, onAccept, onReject, onClose }) => {
  if (!Array.isArray(orders) || orders.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-xl flex flex-col gap-3">
        
        {/* Header de Alerta Compacto */}
        <div className="bg-orange-600 text-white p-4 rounded-[1.5rem] shadow-xl flex items-center justify-between border-2 border-white/10">
            <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                    <Bell className="animate-ring text-white" size={24} strokeWidth={2.5} />
                </div>
                <div>
                    <h2 className="text-xl font-black uppercase tracking-tight leading-none">Aprovação Necessária</h2>
                    <p className="text-orange-100 font-bold text-[10px] mt-0.5 uppercase tracking-widest">Pendente: {orders.length} pedido(s)</p>
                </div>
            </div>
        </div>

        {/* Lista de Pedidos */}
        <div className="max-h-[70vh] overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-[1.5rem] shadow-lg overflow-hidden border border-slate-200 flex flex-col">
                    <div className="p-5 flex-1">
                        {/* Topo do Card */}
                        <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-100">
                            <div>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <span className={cn(
                                        "text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider",
                                        order.orderType === 'DELIVERY' ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"
                                    )}>
                                        {order.orderType === 'DELIVERY' ? '🚀 Delivery' : '🍽️ Mesa ' + (order.tableNumber || '?')}
                                    </span>
                                    <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                                        #{order.id.slice(-4).toUpperCase()}
                                    </span>
                                </div>
                                <h3 className="text-lg font-black text-slate-900 leading-tight">
                                    {order.deliveryOrder?.name || 'Novo Pedido'}
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                                    <Clock size={12}/> {format(new Date(order.createdAt), "HH:mm:ss")}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                                <p className="text-2xl font-black text-emerald-600 tracking-tighter italic">R$ {order.total.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* Detalhes Compactos */}
                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <MapPin size={14} className="text-orange-600 mt-0.5" />
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Localização</p>
                                    <p className="text-xs font-bold text-slate-700">
                                        {order.deliveryOrder?.address || (order.tableNumber ? `Mesa ${order.tableNumber}` : 'Retirada')}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <ShoppingBag size={14} className="text-orange-600" />
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Itens</p>
                                </div>
                                <div className="space-y-1.5 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                                    {order.items?.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center">
                                            <p className="text-xs font-bold text-slate-800 truncate pr-4">
                                                <span className="text-orange-600 font-black">{item.quantity}x</span> {item.product?.name || 'Produto'}
                                            </p>
                                            <span className="text-[10px] font-bold text-slate-500 shrink-0">R$ {(item.priceAtTime * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50/80 p-3 flex flex-row gap-3 border-t border-slate-100">
                        <button onClick={() => onAccept(order.id)} className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white font-black uppercase text-xs tracking-widest rounded-xl py-3 hover:bg-emerald-600 transition-all shadow-md">
                            <CheckCircle size={18} /> Aceitar
                        </button>
                        <button onClick={() => onReject(order.id)} className="flex-1 flex items-center justify-center gap-2 bg-white text-red-500 border border-red-100 font-black uppercase text-xs tracking-widest rounded-xl py-3 hover:bg-red-50 transition-all">
                            <XCircle size={18} /> Recusar
                        </button>
                    </div>
                </div>
            ))}
        </div>

        <button onClick={onClose} className="w-full py-2 text-white/30 font-black uppercase tracking-[0.2em] text-[10px] hover:text-white transition-colors">
            [ Fechar e decidir depois ]
        </button>
      </div>
    </div>
  );
};

export default NewOrderAlert;
