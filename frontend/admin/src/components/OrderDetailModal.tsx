import React, { useState, useEffect } from 'react';
import type { Order } from '@/types/index.ts';
import { 
    getDrivers, assignDriver, getSettings, updateDeliveryType, 
    markOrderAsPrinted, emitInvoice 
} from '../services/api';
import { printOrder } from '../services/printing';
import { format } from 'date-fns';
import { 
  X, Clock, MapPin, CheckCircle, 
  Circle, PlayCircle, XCircle, Printer, Phone, 
  ExternalLink, Package, CreditCard, Loader2, FileText,
  ShoppingBag, Bike, Utensils, Info, ChevronRight, User, Truck, List
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface OrderDetailModalProps {
  onClose: () => void;
  order: Order;
  onStatusChange?: (orderId: string, newStatus: string) => void;
}

const STATUS_OPTIONS = [
    { value: 'PENDING', label: 'Pendente', icon: Circle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    { value: 'PREPARING', label: 'Cozinha', icon: PlayCircle, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { value: 'READY', label: 'Pronto', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { value: 'COMPLETED', label: 'Finalizado', icon: CheckCircle, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100' },
    { value: 'CANCELED', label: 'Cancelado', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
];

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ onClose, order, onStatusChange }) => {
  
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  if (!order) return null;

  const [drivers, setDrivers] = useState<{id: string, name: string}[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string>(order?.deliveryOrder?.driverId || "");
  const [deliveryType, setDeliveryType] = useState<string>(order?.deliveryOrder?.deliveryType || "pickup");
  const [isPrinting, setIsPrinting] = useState(false);
  const [isEmitting, setIsEmitting] = useState(false);

  useEffect(() => {
    if (order) {
      setSelectedDriver(order.deliveryOrder?.driverId || "");
      setDeliveryType(order.deliveryOrder?.deliveryType || "pickup");
    }
  }, [order]);

  const handleEmitInvoice = async () => {
      setIsEmitting(true);
      try {
          const res = await emitInvoice(order.id);
          toast.success("Nota emitida com sucesso!");
          if (res.pdfUrl) window.open(res.pdfUrl, '_blank');
      } catch (e: any) {
          toast.error(e.message || "Erro ao emitir nota.");
      } finally {
          setIsEmitting(false);
      }
  };

  useEffect(() => {
    if (order?.orderType === 'DELIVERY' || !!order?.deliveryOrder) {
        getDrivers().then(setDrivers).catch(console.error);
    }
  }, [order]);

  const handleAssignDriver = async (driverId: string) => {
      if (!driverId) return;
      try {
          await assignDriver(order.id, driverId);
          setSelectedDriver(driverId);
          toast.success("Entregador vinculado!");
      } catch (e) { toast.error("Erro ao vincular."); }
  };

  const handleUpdateDeliveryType = async (type: 'delivery' | 'pickup') => {
      try {
          await updateDeliveryType(order.id, type);
          setDeliveryType(type);
          if (type === 'pickup') setSelectedDriver("");
          toast.success(`Tipo alterado!`);
      } catch (e) { toast.error("Erro ao atualizar."); }
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
        const settingsData = await getSettings();
        const restaurantInfo = {
            name: settingsData.name, address: settingsData.address, phone: settingsData.phone,
            cnpj: settingsData.fiscalConfig?.cnpj, logoUrl: settingsData.logoUrl
        };
        const printerConfig = JSON.parse(localStorage.getItem('printer_config') || '{}');
        await printOrder(order, printerConfig, undefined, restaurantInfo);
        await markOrderAsPrinted(order.id);
        toast.success("Impressão enviada!");
    } catch (error) { toast.error("Falha na impressão."); }
    finally { setIsPrinting(false); }
  };

  const currentStatus = STATUS_OPTIONS.find(s => s.value === order.status) || STATUS_OPTIONS[0];
  const isDelivery = order.orderType === 'DELIVERY' || !!order.deliveryOrder;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300 overflow-hidden">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl max-h-[95vh] lg:max-h-[85vh] flex flex-col bg-slate-50 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border border-white/20">
        
        {/* HEADER MODERNO */}
        <div className="flex items-center justify-between px-8 py-5 border-b bg-white shrink-0 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
          <div className="flex items-center gap-5">
            <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center border-2 shadow-lg transition-all transform hover:rotate-3",
                currentStatus.bg, currentStatus.border, currentStatus.color
            )}>
                <currentStatus.icon size={28} strokeWidth={2.5} />
            </div>
            <div>
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                        Pedido <span className="text-orange-600">#{order.dailyOrderNumber || order.id.slice(-4).toUpperCase()}</span>
                    </h2>
                    <div className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-black border uppercase tracking-[0.2em] shadow-sm",
                        currentStatus.bg, currentStatus.color, currentStatus.border
                    )}>
                        {currentStatus.label}
                    </div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-slate-400 text-[9px] font-black uppercase tracking-widest">
                    <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-lg">
                        <Clock size={12} className="text-orange-500"/> {format(new Date(order.createdAt), "HH:mm")}
                    </span>
                    <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-lg">
                        {isDelivery ? (
                            <>
                                {order.deliveryOrder?.deliveryType === 'delivery' ? <Truck size={12} className="text-blue-500"/> : <ShoppingBag size={12} className="text-blue-500"/>}
                                {order.deliveryOrder?.deliveryType === 'delivery' ? 'Entrega' : 'Retirada'}
                            </>
                        ) : (
                            <>
                                <Utensils size={12} className="text-emerald-500"/> Mesa {order.tableNumber}
                            </>
                        )}
                    </span>
                </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
                onClick={handlePrint} 
                disabled={isPrinting} 
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white h-12 px-6 rounded-2xl transition-all shadow-xl shadow-slate-200 group active:scale-95"
            >
                {isPrinting ? <Loader2 className="animate-spin" size={16} /> : <Printer className="group-hover:rotate-12 transition-transform" size={16} />} 
                <span className="italic font-black text-[10px] uppercase tracking-widest">Imprimir</span>
            </button>
            <button 
                onClick={onClose} 
                className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white hover:rotate-90 transition-all duration-300 shadow-sm"
            >
                <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 custom-scrollbar">
            {/* COLUNA ESQUERDA: CLIENTE E LOGÍSTICA */}
            <div className="lg:col-span-4 space-y-6">
                {/* CARD DO CLIENTE */}
                <section>
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3 ml-1 flex items-center gap-2 italic">
                        <User size={14} className="text-orange-500"/> Identificação
                    </h3>
                    <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <User size={64} />
                        </div>
                        {isDelivery ? (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-lg font-black text-slate-900 uppercase italic leading-tight tracking-tight">
                                        {order.deliveryOrder?.name || 'Cliente Geral'}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <a href={`tel:${order.deliveryOrder?.phone}`} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all">
                                            <Phone size={12} /> {order.deliveryOrder?.phone || 'N/A'}
                                        </a>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-50">
                                    <p className="text-[8px] font-black text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                                        <MapPin size={10} className="text-orange-500"/> Endereço de Entrega
                                    </p>
                                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-[10px] font-bold text-slate-600 uppercase italic leading-relaxed group/map relative">
                                        {order.deliveryOrder?.address || 'Retirada no Balcão'}
                                        {order.deliveryOrder?.address && order.deliveryOrder.address !== 'Retirada no Balcão' && (
                                            <a 
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryOrder.address)}`} 
                                                target="_blank" 
                                                className="absolute -right-2 -top-2 bg-blue-600 text-white p-2 rounded-xl shadow-lg opacity-0 group-hover/map:opacity-100 translate-y-1 group-hover/map:translate-y-0 transition-all hover:scale-110 active:scale-95"
                                            >
                                                <ExternalLink size={12} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 py-2">
                                <div className="bg-orange-500 text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-100">
                                    <Utensils size={28} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Local de Consumo</p>
                                    <p className="text-3xl font-black text-slate-900 italic tracking-tighter">MESA {order.tableNumber}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* LOGÍSTICA (ENTREGADOR) */}
                {isDelivery && (
                    <section className="animate-in slide-in-from-left-4 duration-500 delay-75">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3 ml-1 flex items-center gap-2 italic">
                            <Truck size={14} className="text-blue-500"/> Logística e Entrega
                        </h3>
                        <div className="bg-blue-50/50 border-2 border-blue-100 p-4 rounded-[2rem] space-y-4">
                            <div className="flex gap-2 p-1 bg-blue-100/50 rounded-2xl">
                                <button 
                                    onClick={() => handleUpdateDeliveryType('pickup')} 
                                    className={cn(
                                        "flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2", 
                                        deliveryType === 'pickup' ? "bg-white text-blue-600 shadow-md" : "text-blue-400 hover:text-blue-500"
                                    )}
                                >
                                    <ShoppingBag size={12} /> Balcão
                                </button>
                                <button 
                                    onClick={() => handleUpdateDeliveryType('delivery')} 
                                    className={cn(
                                        "flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2", 
                                        deliveryType === 'delivery' ? "bg-white text-blue-600 shadow-md" : "text-blue-400 hover:text-blue-500"
                                    )}
                                >
                                    <Truck size={12} /> Entrega
                                </button>
                            </div>
                            {deliveryType === 'delivery' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <p className="text-[8px] font-black text-blue-500 uppercase ml-1 italic">Entregador Responsável</p>
                                    <select 
                                        className="w-full bg-white border-2 border-blue-100 rounded-xl h-11 px-4 text-[11px] font-black text-blue-900 outline-none italic shadow-sm focus:border-blue-500 transition-colors" 
                                        value={selectedDriver} 
                                        onChange={(e) => handleAssignDriver(e.target.value)}
                                    >
                                        <option value="">SELECIONE UM MOTOBOY...</option>
                                        {drivers.map(d => <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* FINANCEIRO PREMIUM */}
                <section className="animate-in slide-in-from-left-4 duration-500 delay-150">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3 ml-1 flex items-center gap-2 italic">
                        <CreditCard size={14} className="text-orange-500"/> Detalhamento Financeiro
                    </h3>
                    <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-2xl border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[60px] -mr-16 -mt-16 rounded-full group-hover:bg-orange-500/20 transition-all duration-700" />
                        <div className="space-y-3 relative z-10">
                            <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <span>Subtotal</span>
                                <span className="text-slate-300">R$ {order.total.toFixed(2)}</span>
                            </div>
                            {isDelivery && (
                                <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    <span>Taxa de Entrega</span>
                                    <span className="text-blue-400 font-bold">+ R$ {(order.deliveryOrder?.deliveryFee || 0).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="pt-4 mt-2 border-t border-white/10 flex justify-between items-end">
                                <div>
                                    <p className="text-[9px] font-black text-orange-500 uppercase mb-1 tracking-widest">Total do Pedido</p>
                                    <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                                        <CreditCard size={12} className="text-slate-400" />
                                        <span className="text-[9px] font-black text-white uppercase italic">
                                            {order.deliveryOrder?.paymentMethod || 'A DEFINIR'}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-3xl font-black text-emerald-400 italic tracking-tighter block leading-none">
                                        R$ {(order.total + (order.deliveryOrder?.deliveryFee || 0)).toFixed(2).replace('.', ',')}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        {order.status === 'COMPLETED' && (
                            <button 
                                onClick={handleEmitInvoice}
                                disabled={isEmitting}
                                className="w-full mt-6 h-12 bg-emerald-500 hover:bg-emerald-400 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-950/20 active:scale-95 group"
                            >
                                {isEmitting ? <Loader2 size={16} className="animate-spin text-white" /> : <FileText size={16} className="text-white group-hover:rotate-6 transition-transform" />}
                                <span className="text-[10px] font-black uppercase tracking-widest text-white">
                                    {order.invoice ? 'Visualizar NFC-e' : 'Emitir Nota Fiscal'}
                                </span>
                            </button>
                        )}
                    </div>
                </section>
            </div>

            {/* COLUNA DIREITA: ITENS DO PEDIDO */}
            <div className="lg:col-span-8 flex flex-col min-h-0 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-6 bg-slate-50/50 border-b border-slate-100 shrink-0">
                  <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-3">
                      <div className="p-2 bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-100">
                          <List size={20} />
                      </div>
                      Carrinho de Itens
                  </h3>
                  <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-xl uppercase shadow-sm">
                          {order.items.length} {order.items.length === 1 ? 'Produto' : 'Produtos'}
                      </span>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                    {order.items.map((item: any) => (
                        <div key={item.id} className="p-4 flex items-start gap-5 border border-slate-100 rounded-3xl bg-white hover:bg-slate-50/50 hover:border-orange-200 transition-all group relative">
                            <div className="absolute top-4 right-4 font-black text-slate-900 text-sm italic tracking-tighter bg-slate-50 px-3 py-1 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                R$ {(item.quantity * item.priceAtTime).toFixed(2)}
                            </div>
                            
                            <div className="bg-slate-900 text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl italic shrink-0 shadow-lg shadow-slate-200 group-hover:scale-110 transition-transform">
                                {item.quantity}
                            </div>
                            
                            <div className="flex-1 min-w-0 pr-20">
                                <h4 className="font-black text-slate-900 uppercase italic text-sm tracking-tight leading-tight mb-2 group-hover:text-orange-600 transition-colors">
                                    {item.product.name}
                                </h4>
                                
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {item.sizeJson && (
                                        <div className="flex items-center gap-1 text-[8px] bg-blue-600 text-white px-2 py-0.5 rounded-lg font-black uppercase italic shadow-sm">
                                            <Package size={10} /> TAM: {JSON.parse(item.sizeJson).name}
                                        </div>
                                    )}
                                    {item.flavorsJson && JSON.parse(item.flavorsJson).map((f: any, i: number) => (
                                        <div key={i} className="flex items-center gap-1 text-[8px] bg-orange-500 text-white px-2 py-0.5 rounded-lg font-black uppercase italic shadow-sm">
                                            <Info size={10} /> {f.name}
                                        </div>
                                    ))}
                                    {item.addonsJson && JSON.parse(item.addonsJson).map((a: any, i: number) => (
                                        <div key={i} className="flex items-center gap-1 text-[8px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg font-black uppercase italic border border-slate-200">
                                            + {a.name}
                                        </div>
                                    ))}
                                </div>
                                
                                {item.observations && (
                                    <div className="mt-3 p-2.5 bg-orange-50 rounded-xl border-l-4 border-orange-500 flex items-start gap-2 animate-in slide-in-from-left-2">
                                        <Info size={12} className="text-orange-500 shrink-0 mt-0.5" />
                                        <p className="text-[10px] font-bold text-orange-600 italic leading-relaxed">
                                            OBSERVAÇÃO: {item.observations.toUpperCase()}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {order.items.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center py-20 opacity-20 grayscale">
                            <ShoppingBag size={64} className="mb-4" />
                            <p className="font-black uppercase tracking-widest italic">Nenhum item encontrado</p>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* RODAPÉ DE AÇÕES DE STATUS */}
        <div className="p-6 bg-white border-t border-slate-100 flex flex-wrap justify-center items-center gap-3 shrink-0">
            <p className="w-full text-center text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 italic">Alterar Status do Pedido</p>
            {onStatusChange && STATUS_OPTIONS.map((status) => {
                const isActive = order.status === status.value;
                return (
                    <button 
                        key={status.value} 
                        onClick={() => onStatusChange(order.id, status.value)} 
                        disabled={isActive}
                        className={cn(
                            "flex items-center gap-2 h-12 px-5 rounded-2xl text-[9px] uppercase tracking-widest italic font-black transition-all active:scale-95 border-2",
                            isActive 
                                ? cn(status.bg, status.color, status.border, "shadow-xl scale-105 z-10") 
                                : "bg-white border-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                        )}
                    >
                        <status.icon size={16} strokeWidth={isActive ? 3 : 2} /> 
                        {status.label}
                        {isActive && <CheckCircle size={12} className="ml-1 animate-in zoom-in" />}
                    </button>
                );
            })}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;