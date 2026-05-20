import React from 'react';
import type { Order } from '../types';
import { formatSP } from '@/lib/timezone';
import { resolvePaymentLabel } from '@/utils/paymentUtils';
import { ShoppingBag, Bell, CheckCircle, XCircle, Clock, MapPin, Tag, Truck, UtensilsCrossed, Smartphone } from 'lucide-react';
import { cn } from '../lib/utils';
import { useScrollLock } from '../hooks/useScrollLock';
import ifoodLogo from '../assets/ifood-logo.png';
import saiposLogo from '../assets/saipos-logo.png';
import uairangoLogo from '../assets/uairango-logo.png';
import food99Logo from '../assets/99food-logo.png';

interface NewOrderAlertProps {
  orders: Order[];
  isProcessing?: boolean;
  onAccept: (orderId: string, order: Order) => void;
  onReject: (orderId: string, order: Order) => void;
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
  if (order.uairangoOrderId) {
    return {
      name: 'UaiRango',
      logo: uairangoLogo,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    };
  }
  if (order.food99OrderId) {
    return {
      name: '99Food',
      logo: food99Logo,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200'
    };
  }
  return null;
};

const NewOrderAlert: React.FC<NewOrderAlertProps> = ({ orders, isProcessing = false, onAccept, onReject, onClose }) => {
  
  useScrollLock(Array.isArray(orders) && orders.length > 0);

  if (!Array.isArray(orders) || orders.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      {/* Backdrop Profissional */}
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-3xl flex flex-col gap-4 h-full max-h-[95vh]">
        
        {/* Header Corporativo */}
        <div className="bg-gradient-to-r from-orange-700 via-orange-600 to-orange-500 text-white px-6 py-5 rounded-2xl shadow-2xl flex items-center justify-between border border-orange-400/30 shrink-0">
            <div className="flex items-center gap-4">
                <div className="bg-white/15 p-3 rounded-xl backdrop-blur-sm shadow-lg border border-white/20">
                    <Bell className="animate-ring text-white" size={28} strokeWidth={2.5} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold uppercase tracking-wide leading-tight">Novo Pedido!</h2>
                    <p className="text-orange-100 font-medium text-xs mt-1 flex items-center gap-2">
                      <span className="bg-white/20 px-3 py-1 rounded-md font-semibold">{orders.length} pedido(s) aguardando</span>
                      <span className="text-orange-200">•</span>
                      <span>Aprovação necessária</span>
                    </p>
                </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10">
              <Clock size={16} />
              <span className="text-sm font-semibold">{formatSP(new Date(), 'HH:mm')}</span>
            </div>
        </div>

        {/* Lista de Pedidos */}
        <div className="max-h-[78vh] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {orders.map((order) => {
              const integration = getIntegrationInfo(order);
              
              return (
                <div key={order.id} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200/80 flex flex-col">
                  {/* Banner de Integração */}
                  {integration && (
                    <div className={cn(
                      "px-6 py-4 flex items-center gap-4 border-b-2",
                      integration.bgColor,
                      integration.borderColor
                    )}>
                      <img src={integration.logo} alt={integration.name} className="w-10 h-10 object-contain" />
                      <div className="flex-1">
                        <p className={cn("text-xs font-bold uppercase tracking-wide", integration.color)}>
                          Pedido via {integration.name}
                        </p>
                        <p className="text-xs font-semibold text-slate-600 mt-0.5">
                          #{order.ifoodOrderId || order.uairangoOrderId || order.food99OrderId || order.id.slice(-8).toUpperCase()}
                        </p>
                      </div>
                      <div className={cn("px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2", integration.color, integration.bgColor, "border", integration.borderColor)}>
                        <Smartphone size={14} />
                        {integration.name}
                      </div>
                    </div>
                  )}
                  
                  <div className="p-6 flex-1">
                      {/* Header do Card - Grid 2 Colunas */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b-2 border-slate-100">
                          <div className="space-y-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                  <span className={cn(
                                      "text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wide flex items-center gap-2",
                                      order.orderType === 'PICKUP' ? "bg-purple-100 text-purple-700 border border-purple-200" : "bg-blue-100 text-blue-700 border border-blue-200"
                                  )}>
                                      {order.orderType === 'PICKUP' ? <UtensilsCrossed size={14} /> : <Truck size={14} />}
                                      {order.orderType === 'PICKUP' ? 'Retirada' : 'Delivery'}
                                  </span>
                                  <span className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wide border border-slate-200">
                                      #{order.dailyOrderNumber || order.id.slice(-4).toUpperCase()}
                                  </span>
                                  {order.scheduledDateTime && (
                                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wide flex items-center gap-1.5 border border-blue-200">
                                      <Clock size={14} />
                                      {formatSP(order.scheduledDateTime, 'HH:mm')}
                                    </span>
                                  )}
                                  {order.isPrinted && (
                                    <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wide flex items-center gap-1.5 border border-amber-200">
                                      <ShoppingBag size={14} /> Impresso
                                    </span>
                                  )}
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-slate-900 leading-tight">
                                    {order.customerName || order.deliveryOrder?.name || 'Consumidor'}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-1.5">
                                    <Clock size={14}/> {formatSP(order.createdAt, "HH:mm")}
                                    <span className="text-slate-300">•</span>
                                    <span className="text-slate-600 font-semibold">
                                      {resolvePaymentLabel(order.deliveryOrder?.paymentMethod || order.payments?.[0]?.method) || 'Pendente'}
                                    </span>
                                </p>
                              </div>
                          </div>
                          <div className="flex flex-col justify-between items-end">
                              <div className="text-right">
                                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Total do Pedido</p>
                                  <p className="text-4xl font-bold text-emerald-600 tracking-tight">R$ {order.total.toFixed(2)}</p>
                              </div>
                          </div>
                      </div>

                      {/* Detalhes em Grid 2 Colunas */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                              <div className="bg-orange-100 p-2 rounded-lg shrink-0">
                                <MapPin size={18} className="text-orange-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Endereço de Entrega</p>
                                  <p className="text-sm font-semibold text-slate-800 leading-snug">
                                      {order.deliveryOrder?.address || order.deliveryOrder?.neighborhood || 'Retirada no Balcão'}
                                  </p>
                                  {order.deliveryOrder?.complement && (
                                    <p className="text-xs text-slate-600 mt-1 font-medium">
                                      {order.deliveryOrder.complement}
                                    </p>
                                  )}
                              </div>
                          </div>

                          {(order.notes || order.deliveryOrder?.notes) && (
                            <div className="flex items-start gap-3 bg-amber-50 p-4 rounded-xl border border-amber-200">
                              <div className="bg-amber-100 p-2 rounded-lg shrink-0">
                                <Tag size={18} className="text-amber-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Observação</p>
                                <p className="text-sm font-semibold text-amber-900 leading-snug">{order.notes || order.deliveryOrder?.notes}</p>
                              </div>
                            </div>
                          )}
                      </div>

                      {/* Tabela de Itens Profissional */}
                      <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-3">
                              <div className="bg-orange-100 p-2 rounded-lg">
                                <ShoppingBag size={18} className="text-orange-600" />
                              </div>
                              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Itens do Pedido ({order.items?.length || 0})</p>
                          </div>
                          <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                              {/* Header da Tabela */}
                              <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wide">
                                  <div className="col-span-1">Qtd</div>
                                  <div className="col-span-8">Produto</div>
                                  <div className="col-span-3 text-right">Subtotal</div>
                              </div>
                              {/* Lista de Itens */}
                              <div className="divide-y divide-slate-200 max-h-40 overflow-y-auto">
                                  {order.items?.map((item, idx) => (
                                      <div key={idx} className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-slate-100/50 transition-colors">
                                          <div className="col-span-1 flex items-center">
                                              <span className="text-sm font-bold text-orange-600">{item.quantity}</span>
                                          </div>
                                          <div className="col-span-8">
                                              <p className="text-sm font-semibold text-slate-800 leading-snug">
                                                  {item.product?.name || 'Produto'}
                                              </p>
                                              {item.observations && (
                                                  <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1">
                                                    <span className="text-[10px]">⚠</span> {item.observations}
                                                  </p>
                                              )}
                                          </div>
                                          <div className="col-span-3 flex items-center justify-end">
                                              <span className="text-sm font-bold text-slate-700">R$ {(item.priceAtTime * item.quantity).toFixed(2)}</span>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Footer com Botões de Ação */}
                  <div className="bg-slate-50 px-6 py-4 flex flex-row gap-4 border-t-2 border-slate-200">
                      <button
                        onClick={() => onAccept(order.id, order)}
                        disabled={isProcessing}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-3 font-bold uppercase text-sm tracking-wide rounded-xl py-4 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]",
                          isProcessing
                            ? "bg-emerald-400 text-white cursor-not-allowed"
                            : "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-500/30"
                        )}
                      >
                          {isProcessing ? <Clock size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                          {isProcessing ? 'Processando...' : 'Aceitar Pedido'}
                      </button>
                      <button
                        onClick={() => onReject(order.id, order)}
                        disabled={isProcessing}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-3 font-bold uppercase text-sm tracking-wide rounded-xl py-4 transition-all border-2 active:scale-[0.98]",
                          isProcessing
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : "bg-white text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 hover:shadow-lg"
                        )}
                      >
                          {isProcessing ? <Clock size={20} className="animate-spin" /> : <XCircle size={20} />}
                          {isProcessing ? 'Processando...' : 'Recusar Pedido'}
                      </button>
                  </div>
                </div>
              );
            })}
        </div>

        <button onClick={onClose} className="w-full py-3 text-white/50 font-bold uppercase tracking-widest text-xs hover:text-white/80 transition-colors hover:bg-white/5 rounded-lg">
            Fechar e decidir depois
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