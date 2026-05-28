import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrderById } from '../services/api';
import { getSocket, disconnectSocket } from '../services/socket';
import { CheckCircle2, Clock, Truck, ShoppingBag, ChevronLeft, MapPin, Loader2, PartyPopper, MessageCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatSP } from '@/lib/timezone';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

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
      toast.error("Erro ao carregar pedido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    if (orderId) {
      // O socket será inicializado com o restaurantId assim que o order for carregado
      // Mas podemos tentar conectar logo se tivermos o orderId
    }

    return () => {
      disconnectSocket();
    };
  }, [orderId]);

  useEffect(() => {
    if (order?.restaurantId) {
      const socket = getSocket(order.restaurantId);

      socket.on('order_update', (data: any) => {
        if (data.payload.id === orderId) {
          setOrder(data.payload);
          toast.success(`Pedido atualizado: ${data.payload.status}`, {
              icon: <Bell className="text-primary" size={16} />
          });
          
          // Som de notificação simples
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
            audio.play().catch(() => {});
          } catch(e) {}
        }
      });

      return () => {
        socket.off('order_update');
      };
    }
  }, [order?.restaurantId, orderId]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
            <Loader2 className="text-primary" size={32} />
        </motion.div>
        <p className="font-bold text-sm text-slate-400 text-center">Sincronizando com a cozinha...</p>
    </div>
  );

  if (!order) return (
    <div className="p-10 text-center min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 max-w-xs">
            <ShoppingBag size={40} className="mx-auto text-slate-200 mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Ops! Sumiu?</h2>
            <p className="text-slate-500 text-sm mb-6">Não conseguimos localizar este pedido em nosso sistema.</p>
            <button 
                onClick={() => navigate('/')}
                className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-slate-800 transition-colors duration-200"
            >
                Voltar ao Início
            </button>
        </div>
    </div>
  );

  const statusList = [
    { key: 'PENDING', label: 'Recebido', icon: ShoppingBag, color: 'text-amber-500', bg: 'bg-amber-50' },
    { key: 'PREPARING', label: 'Em Preparo', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
    { key: 'READY', label: 'Pronto', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { key: 'SHIPPED', label: 'A caminho', icon: Truck, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { key: 'COMPLETED', label: 'Entregue', icon: PartyPopper, color: 'text-emerald-600', bg: 'bg-emerald-50' }
  ];

  const currentIndex = statusList.findIndex(s => s.key === order.status);
  const currentStatus = statusList[currentIndex] || statusList[0];

  const getStatusMessage = () => {
      switch(order.status) {
          case 'PENDING': return 'Estamos revisando seu pedido.';
          case 'PREPARING': return 'Seu pedido está sendo preparado com carinho!';
          case 'READY': return order.orderType === 'TABLE' ? 'O garçom já está levando!' : 'Aguardando o motoboy.';
          case 'SHIPPED': return 'Seu pedido está a caminho!';
          case 'COMPLETED': return 'Bom apetite! Esperamos que goste.';
          default: return 'Acompanhe seu pedido em tempo real.';
      }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans selection:bg-primary/20">
      <header className="p-4 bg-white/90 backdrop-blur-md border-b border-slate-100 flex items-center gap-4 sticky top-0 z-[var(--z-header)] shadow-sm">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2.5 bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200 active:scale-95"
            aria-label="Voltar"
          >
              <ChevronLeft size={20} />
          </button>
          <div className="flex-1">
              <h1 className="text-xs font-bold uppercase tracking-wider text-slate-400 leading-none mb-1">Status do Pedido</h1>
              <p className="text-lg font-bold text-slate-900 tracking-tight">#{order.id.slice(-6).toUpperCase()}</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Live</span>
          </div>
      </header>

      <main className="p-5 max-w-xl mx-auto space-y-5">
          
          {/* STATUS ATUAL */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-10 bg-white rounded-2xl shadow-lg border border-slate-100 relative overflow-hidden"
          >
              <div className="absolute top-0 left-0 w-full h-1 bg-slate-50">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIndex + 1) / statusList.length) * 100}%` }}
                    transition={{ duration: 1.5, ease: "circOut" }}
                    className="h-full bg-gradient-to-r from-primary to-orange-400" 
                  />
              </div>
              
              <AnimatePresence mode="wait">
                  <motion.div 
                    key={order.status}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.2, opacity: 0 }}
                    className={cn("inline-flex p-8 rounded-2xl mb-5 shadow-sm", currentStatus.bg)}
                  >
                      <currentStatus.icon size={56} strokeWidth={2} className={currentStatus.color} />
                  </motion.div>
              </AnimatePresence>

              <AnimatePresence mode="wait">
                  <motion.div
                    key={order.status + '_text'}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight mb-2">{currentStatus.label}</h2>
                    <p className="text-slate-400 font-medium text-sm px-6 leading-relaxed">
                        {getStatusMessage()}
                    </p>
                  </motion.div>
              </AnimatePresence>
          </motion.section>

          {/* LINHA DO TEMPO */}
          <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
                  Progresso <span className="w-1 h-1 bg-slate-300 rounded-full" /> {Math.round(((currentIndex + 1) / statusList.length) * 100)}%
              </h3>
              <div className="flex justify-between relative px-2">
                  <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-100 z-0 mx-6" />
                  <div 
                    className="absolute top-4 left-0 h-0.5 bg-primary z-0 mx-6 transition-all duration-1000" 
                    style={{ width: `calc(${(currentIndex / (statusList.length - 1)) * 100}% - 10px)` }}
                  />
                  
                  {statusList.map((s, i) => {
                      const isPast = i < currentIndex;
                      const isCurrent = i === currentIndex;
                      return (
                          <div key={s.key} className="flex flex-col items-center gap-2 relative z-10 w-10">
                              <motion.div 
                                animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className={cn(
                                  "w-9 h-9 rounded-lg flex items-center justify-center border-2 transition-all duration-300",
                                  isPast ? "bg-emerald-500 border-emerald-100 text-white" : 
                                  isCurrent ? "bg-primary border-orange-100 text-white shadow-md shadow-orange-200" : 
                                  "bg-white border-slate-100 text-slate-200 shadow-inner"
                              )}>
                                  {isPast ? <CheckCircle2 size={16} /> : <s.icon size={16} />}
                              </motion.div>
                              <span className={cn(
                                  "text-[9px] font-bold uppercase tracking-wider text-center whitespace-nowrap",
                                  isCurrent ? "text-slate-900" : "text-slate-300"
                              )}>
                                  {s.label}
                              </span>
                          </div>
                      );
                  })}
              </div>
          </section>

          {/* RESUMO DO PEDIDO */}
          <motion.section 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden"
          >
              <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
              
              <div className="flex justify-between items-center mb-6 relative z-10">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Recibo Digital</h3>
                    <p className="text-xs font-medium text-slate-400">{formatSP(order.createdAt, "dd 'de' MMMM, HH:mm")}</p>
                  </div>
                  <div className="p-2.5 bg-white/5 rounded-lg border border-white/10">
                      <ShoppingBag size={18} className="text-primary" />
                  </div>
              </div>

              <div className="space-y-3 mb-6 relative z-10">
                  {order.items.map((item: any, i: number) => {
                      const size = item.sizeJson ? JSON.parse(item.sizeJson) : null;
                      const addons = item.addonsJson ? JSON.parse(item.addonsJson) : [];
                      const flavors = item.flavorsJson ? JSON.parse(item.flavorsJson) : [];

                      return (
                        <div key={i} className="flex flex-col group border-b border-white/5 pb-3 last:border-0">
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium flex items-center gap-2 text-slate-100">
                                        <span className="w-5 h-5 flex items-center justify-center bg-primary/20 text-primary text-[10px] rounded-md">{item.quantity}</span>
                                        {item.product.name}
                                        {size && <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-300 uppercase">{size.name}</span>}
                                    </span>
                                </div>
                                <span className="text-xs font-bold text-slate-400">R$ {(item.priceAtTime * item.quantity).toFixed(2)}</span>
                            </div>

                            <div className="ml-7 mt-1 space-y-1">
                                {flavors.map((f: any, idx: number) => (
                                    <p key={idx} className="text-[10px] text-slate-400 flex items-center gap-1 italic">
                                        <span className="w-1 h-1 bg-primary/40 rounded-full" />
                                        Sabor: {f.name}
                                    </p>
                                ))}
                                {addons.map((a: any, idx: number) => (
                                    <p key={idx} className="text-[10px] text-slate-400 flex items-center gap-1">
                                        <span className="w-1 h-1 bg-indigo-400/40 rounded-full" />
                                        +{a.quantity > 1 ? `${a.quantity}x ` : ''}{a.name} (R$ {(a.price * (a.quantity || 1)).toFixed(2)})
                                    </p>
                                ))}
                                {item.observations && (
                                    <p className="text-[10px] text-amber-400/60 italic mt-2 bg-amber-400/5 px-2 py-1 rounded-lg inline-block">
                                        "{item.observations}"
                                    </p>
                                )}
                            </div>
                        </div>
                      );
                  })}
                  
                  {order.deliveryOrder && (
                      <div className="flex justify-between items-center pt-3 border-t border-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          <span>Taxa de Entrega</span>
                          <span className="text-slate-300">R$ {order.deliveryOrder.deliveryFee.toFixed(2)}</span>
                      </div>
                  )}
              </div>

              <div className="pt-5 border-t border-dashed border-white/10 flex justify-between items-end relative z-10">
                  <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Valor Total</p>
                      <p className="text-3xl font-bold tracking-tight text-white">
                        <span className="text-primary mr-1">R$</span>
                        {parseFloat(order.total).toFixed(2)}
                      </p>
                  </div>
                  <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Pagamento</p>
                      <span className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                        {order.deliveryOrder?.paymentMethod || order.payments?.[0]?.method || 'Dinheiro'}
                      </span>
                  </div>
              </div>
          </motion.section>

          {/* ENDEREÇO DE ENTREGA */}
          {order.orderType === 'DELIVERY' && (
              <motion.section 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm"
              >
                  <div className="bg-slate-50 p-3 rounded-lg text-primary shadow-inner">
                      <MapPin size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Destino da Entrega</p>
                      <p className="text-sm font-medium text-slate-700 leading-tight line-clamp-2">{order.deliveryOrder?.address}</p>
                  </div>
                  <button className="text-xs font-bold uppercase tracking-wider text-primary hover:underline" aria-label="Ver no mapa">Mapa</button>
              </motion.section>
          )}

          {/* AJUDA / SUPORTE */}
          <section className="text-center pt-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Alguma dúvida sobre seu pedido?</p>
              <button 
                onClick={() => {
                    const phone = order?.restaurant?.phone;
                    if (phone) {
                        const cleanPhone = phone.replace(/\D/g, '');
                        const message = encodeURIComponent(`Olá, gostaria de falar sobre o meu pedido #${order.id.slice(-6).toUpperCase()}`);
                        window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
                    } else {
                        toast.error("Telefone do restaurante não disponível");
                    }
                }}
                className="inline-flex items-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-wider shadow-md shadow-emerald-200 hover:scale-105 transition-transform duration-200 active:scale-95"
              >
                <MessageCircle size={16} />
                Falar com o Restaurante
              </button>
          </section>

      </main>
    </div>
  );
};

export default OrderTracking;
