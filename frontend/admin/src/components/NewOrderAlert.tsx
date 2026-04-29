import React from 'react';
import type { Order } from '../types';
import { formatSP } from '@/lib/timezone';
import { ShoppingBag, Bell, CheckCircle, XCircle, Clock, MapPin, Tag, Truck, UtensilsCrossed, Smartphone } from 'lucide-react';
import { cn } from '../lib/utils';
import { useScrollLock } from '../hooks/useScrollLock';
import ifoodLogo from '../assets/ifood-logo.png';
import saiposLogo from '../assets/saipos-logo.png';
import uairangoLogo from '../assets/uairango-logo.png';

interface NewOrderAlertProps {
  orders: Order[];
  onAccept: (orderId: string) => void;
  onReject: (orderId: string) => void;
  onClose: () => void;
}

interface IntegrationInfo {
  name: string;
  logo: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const getIntegrationInfo = (order: Order): IntegrationInfo | null => {
  if (order.ifoodOrderId) {
    return {
      name: 'iFood',
      logo: ifoodLogo,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    };
  }
  return null;
};

const NewOrderAlert: React.FC<NewOrderAlertProps> = ({ orders, onAccept, onReject, onClose }) => {
  
  useScrollLock(Array.isArray(orders) && orders.length > 0);

  if (!Array.isArray(orders) || orders.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-hidden">
      {/* Fixed Backdrop */}
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-xl flex flex-col gap-3 h-full max-h-[90vh]">
        
        {/* Header de Alerta Compacto - Fixed at top of modal area */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white p-4 rounded-[1.5rem] shadow-2xl flex items-center justify-between border-2 border-white/20 shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md shadow-lg">
                    <Bell className="animate-ring text-white" size={26} strokeWidth={2.5} />
                </div>
                <div>
                    <h2 className="text-xl font-black uppercase tracking-tight leading-none drop-shadow-sm">Novo Pedido!</h2>
                    <p className="text-orange-100 font-bold text-[10px] mt-0.5 uppercase tracking-widest flex items-center gap-2">
                      <span className="bg-white/20 px-2 py-0.5 rounded-md">{orders.length} pedido(s)</span>
                      <span className="text-orange-200">•</span>
                      <span>Aprovação necessária</span>
                    </p>
                </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
              <Clock size={14} />
              <span className="text-xs font-bold">{formatSP(new Date(), 'HH:mm')}</span>
            </div>
        </div>

        {/* Lista de Pedidos */}
        <div className="max-h-[70vh] overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {orders.map((order) => {
              const integration = getIntegrationInfo(order);
              
              return (
                <div key={order.id} className="bg-white rounded-[1.5rem] shadow-xl overflow-hidden border border-slate-200 flex flex-col">
                  {/* Banner de Integração */}
                  {integration && (
                    <div className={cn(
                      "px-5 py-3 flex items-center gap-3 border-b",
                      integration.bgColor,
                      integration.borderColor
                    )}>
                      <img src={integration.logo} alt={integration.name} className="w-8 h-8 object-contain" />
                      <div className="flex-1">
                        <p className={cn("text-[9px] font-black uppercase tracking-widest", integration.color)}>
                          Pedido via {integration.name}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500">
                          #{order.ifoodOrderId || order.id.slice(-8).toUpperCase()}
                        </p>
                      </div>
                      <div className={cn("px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1", integration.color, integration.bgColor)}>
                        <Smartphone size={10} />
                        {integration.name}
                      </div>
                    </div>
                  )}
                  
                  <div className="p-5 flex-1">
                      {/* Topo do Card */}
                      <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-100">
                          <div>
                              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                  <span className={cn(
                                      "text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1",
                                      order.orderType === 'PICKUP' ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"
                                  )}>
                                      {order.orderType === 'PICKUP' ? <UtensilsCrossed size={10} /> : <Truck size={10} />}
                                      {order.orderType === 'PICKUP' ? 'Retirada' : 'Delivery'}
                                  </span>
                                  <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                                      #{order.dailyOrderNumber || order.id.slice(-4).toUpperCase()}
                                  </span>
                                  {order.isPrinted && (
                                    <span className="bg-amber-50 text-amber-600 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                                      <ShoppingBag size={10} /> Impresso
                                    </span>
                                  )}
                              </div>
                              <h3 className="text-lg font-black text-slate-900 leading-tight">
                                  {order.deliveryOrder?.name || 'Cliente'}
                              </h3>
                              <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                                  <Clock size={12}/> {formatSP(order.createdAt, "HH:mm:ss")}
                                  <span className="text-slate-300">•</span>
                                  <span className="text-slate-500">
                                    {order.paymentMethod || 'Pagamento não informado'}
                                  </span>
                              </p>
                          </div>
                          <div className="text-right">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                              <p className="text-3xl font-black text-emerald-600 tracking-tighter italic">R$ {order.total.toFixed(2)}</p>
                          </div>
                      </div>

                      {/* Detalhes Compactos */}
                      <div className="grid grid-cols-1 gap-4">
                          <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <MapPin size={14} className="text-orange-600 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Localização</p>
                                  <p className="text-xs font-bold text-slate-700 truncate">
                                      {order.deliveryOrder?.address || order.deliveryOrder?.neighborhood || 'Retirada no Balcão'}
                                  </p>
                                  {order.deliveryOrder?.complement && (
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      Complemento: {order.deliveryOrder.complement}
                                    </p>
                                  )}
                              </div>
                          </div>

                          {order.deliveryOrder?.notes && (
                            <div className="flex items-start gap-3 bg-amber-50 p-3 rounded-xl border border-amber-100">
                              <Tag size={14} className="text-amber-600 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-0.5">Observação</p>
                                <p className="text-xs font-bold text-amber-800">{order.deliveryOrder.notes}</p>
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                              <div className="flex items-center gap-2 mb-1">
                                  <ShoppingBag size={14} className="text-orange-600" />
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Itens ({order.items?.length || 0})</p>
                              </div>
                              <div className="space-y-1.5 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50 max-h-32 overflow-y-auto">
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
                      <button onClick={() => onAccept(order.id)} className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white font-black uppercase text-xs tracking-widest rounded-xl py-3 hover:bg-emerald-600 transition-all shadow-md hover:shadow-lg">
                          <CheckCircle size={18} /> Aceitar
                      </button>
                      <button onClick={() => onReject(order.id)} className="flex-1 flex items-center justify-center gap-2 bg-white text-red-500 border border-red-100 font-black uppercase text-xs tracking-widest rounded-xl py-3 hover:bg-red-50 transition-all">
                          <XCircle size={18} /> Recusar
                      </button>
                  </div>
                </div>
              );
            })}
        </div>

        <button onClick={onClose} className="w-full py-2 text-white/40 font-black uppercase tracking-[0.2em] text-[10px] hover:text-white/70 transition-colors">
            [ Fechar e decidir depois ]
        </button>
      </div>
    </div>
  );
};

export default NewOrderAlert;