import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrderById } from '../services/api'; // Precisaremos criar essa função
import { CheckCircle2, Clock, Truck, ShoppingBag, ChevronLeft, MapPin, Loader2, PartyPopper } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

const OrderTracking: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    if (!orderId) return;
    try {
      const data = await getOrderById(orderId);
      setOrder(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000); // Atualiza a cada 15 segundos
    return () => clearInterval(interval);
  }, [orderId]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="font-black uppercase text-xs tracking-widest text-slate-400 text-center">Localizando seu pedido...</p>
    </div>
  );

  if (!order) return <div className="p-10 text-center">Pedido não encontrado.</div>;

  const statusList = [
    { key: 'PENDING', label: 'Recebido', icon: ShoppingBag, color: 'text-amber-500' },
    { key: 'PREPARING', label: 'Em Preparo', icon: Clock, color: 'text-blue-500' },
    { key: 'READY', label: 'Pronto', icon: CheckCircle2, color: 'text-emerald-500' },
    { key: 'SHIPPED', label: 'A caminho', icon: Truck, color: 'text-indigo-500' },
    { key: 'COMPLETED', label: 'Entregue', icon: PartyPopper, color: 'text-emerald-600' }
  ];

  const currentIndex = statusList.findIndex(s => s.key === order.status);
  const currentStatus = statusList[currentIndex] || statusList[0];

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans">
      <header className="p-6 bg-white border-b border-slate-100 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
          <button onClick={() => navigate(-1)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-colors">
              <ChevronLeft size={24} />
          </button>
          <div className="flex-1">
              <h1 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-1">Acompanhamento</h1>
              <p className="text-lg font-black text-slate-900 tracking-tighter italic">Pedido #{order.id.slice(-4).toUpperCase()}</p>
          </div>
      </header>

      <main className="p-6 max-w-xl mx-auto space-y-8">
          
          {/* STATUS ATUAL GIGANTE */}
          <section className="text-center py-10 bg-white rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-slate-100">
                  <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${((currentIndex + 1) / statusList.length) * 100}%` }} />
              </div>
              
              <div className={cn("inline-flex p-8 rounded-[2.5rem] mb-6", currentStatus.color.replace('text', 'bg').replace('500', '100').replace('600', '100'))}>
                  <currentStatus.icon size={64} strokeWidth={2.5} className={currentStatus.color} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter mb-2">{currentStatus.label}</h2>
              <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
                  {order.status === 'PENDING' && 'Estamos revisando seu pedido.'}
                  {order.status === 'PREPARING' && 'Seu rango está no fogo! 🔥'}
                  {order.status === 'READY' && (order.orderType === 'TABLE' ? 'O garçom já está levando!' : 'Aguardando o motoboy.')}
                  {order.status === 'SHIPPED' && 'O motoboy voando baixo até você! 🏍️'}
                  {order.status === 'COMPLETED' && 'Bom apetite! Esperamos que goste. 🍕'}
              </p>
          </section>

          {/* LINHA DO TEMPO (STEPS) */}
          <section className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8">Etapas do Pedido</h3>
              <div className="space-y-8 relative">
                  <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-slate-100 z-0" />
                  {statusList.map((s, i) => {
                      const isPast = i < currentIndex;
                      const isCurrent = i === currentIndex;
                      return (
                          <div key={s.key} className="flex items-center gap-6 relative z-10">
                              <div className={cn(
                                  "w-10 h-10 rounded-2xl flex items-center justify-center border-4 transition-all duration-500",
                                  isPast ? "bg-emerald-500 border-emerald-100 text-white" : 
                                  isCurrent ? "bg-primary border-orange-100 text-white animate-bounce-subtle" : 
                                  "bg-white border-slate-50 text-slate-200"
                              )}>
                                  {isPast ? <CheckCircle2 size={20} /> : <s.icon size={20} />}
                              </div>
                              <span className={cn(
                                  "text-sm font-black uppercase tracking-widest",
                                  isPast ? "text-slate-400" : isCurrent ? "text-slate-900" : "text-slate-200"
                              )}>
                                  {s.label}
                              </span>
                          </div>
                      );
                  })}
              </div>
          </section>

          {/* RESUMO DO PEDIDO */}
          <section className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Resumo da Compra</h3>
                  <span className="text-[10px] font-bold bg-white/10 px-3 py-1 rounded-full">{format(new Date(order.createdAt), "HH:mm")}</span>
              </div>
              <div className="space-y-4 mb-6">
                  {order.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between items-start">
                          <span className="text-sm font-bold opacity-90"><b className="text-primary mr-1">{item.quantity}x</b> {item.product.name}</span>
                          <span className="text-xs font-medium opacity-50">R$ {(item.priceAtTime * item.quantity).toFixed(2)}</span>
                      </div>
                  ))}
              </div>
              <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                  <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Pago</p>
                      <p className="text-3xl font-black italic tracking-tighter text-emerald-400">R$ {order.total.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Método</p>
                      <p className="text-xs font-bold uppercase">{order.deliveryOrder?.paymentMethod || 'Dinheiro'}</p>
                  </div>
              </div>
          </section>

          {/* ENDEREÇO DE ENTREGA */}
          {order.orderType === 'DELIVERY' && (
              <section className="flex items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-100">
                  <div className="bg-slate-50 p-4 rounded-2xl text-primary">
                      <MapPin size={24} />
                  </div>
                  <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Entregar em:</p>
                      <p className="text-sm font-bold text-slate-700 leading-tight">{order.deliveryOrder?.address}</p>
                  </div>
              </section>
          )}

      </main>
    </div>
  );
};

export default OrderTracking;
