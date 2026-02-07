import React, { useState, useEffect } from 'react';
import type { Order } from '@/types/index.ts';
import { getDrivers, assignDriver, getSettings, updateDeliveryType, markOrderAsPrinted } from '../services/api';
import { printOrder } from '../services/printing';
import { format } from 'date-fns';
import { 
  X, Clock, MapPin, CheckCircle, 
  Circle, PlayCircle, XCircle, Printer, Phone, 
  ExternalLink, Package, CreditCard, Loader2,
  ShoppingBag, Bike, Utensils, Info, ChevronRight, User, Truck
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
    { value: 'PENDING', label: 'Pendente', icon: Circle, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' },
    { value: 'PREPARING', label: 'Cozinha', icon: PlayCircle, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' },
    { value: 'READY', label: 'Pronto', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200' },
    { value: 'COMPLETED', label: 'Finalizado', icon: CheckCircle, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' },
    { value: 'CANCELED', label: 'Cancelado', icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200' },
];

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ onClose, order, onStatusChange }) => {
  if (!order) return null;

  const [drivers, setDrivers] = useState<{id: string, name: string}[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string>(order?.deliveryOrder?.driverId || "");
  const [deliveryType, setDeliveryType] = useState<string>(order?.deliveryOrder?.deliveryType || "pickup");
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (order?.orderType === 'DELIVERY') {
        getDrivers().then(setDrivers).catch(console.error);
    }
  }, [order?.orderType]);

  const handleAssignDriver = async (driverId: string) => {
      if (!driverId) return;
      try {
          await assignDriver(order.id, driverId);
          setSelectedDriver(driverId);
          toast.success("Motoboy vinculado com sucesso!");
      } catch (e) {
          toast.error("Erro ao vincular entregador.");
      }
  };

  const handleUpdateDeliveryType = async (type: 'delivery' | 'pickup') => {
      try {
          await updateDeliveryType(order.id, type);
          setDeliveryType(type);
          if (type === 'pickup') setSelectedDriver("");
          toast.success(`Alterado para: ${type === 'delivery' ? 'Entrega' : 'Retirada'}`);
      } catch (e) {
          toast.error("Erro ao atualizar tipo.");
      }
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
        const settingsData = await getSettings();
        const restaurantInfo = {
            name: settingsData.name,
            address: settingsData.address,
            phone: settingsData.phone,
            cnpj: settingsData.fiscalConfig?.cnpj,
            logoUrl: settingsData.logoUrl
        };

        const savedConfig = localStorage.getItem('printer_config');
        const printerConfig = savedConfig ? JSON.parse(savedConfig) : { cashierPrinter: localStorage.getItem('cashier_printer_name') || '' };
        
        await printOrder(order, printerConfig, undefined, restaurantInfo);
        await markOrderAsPrinted(order.id);
        toast.success("Comprovante enviado p/ impressora!");
    } catch (error) {
        toast.error("Falha na impressão.");
    } finally {
        setIsPrinting(false);
    }
  };

  const currentStatus = STATUS_OPTIONS.find(s => s.value === order.status) || STATUS_OPTIONS[0];
  const isDelivery = order.orderType === 'DELIVERY';

  return (
    <div className="ui-modal-overlay">
      <div className="ui-modal-content w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* HEADER PREMIUM */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-8 border-b bg-white gap-6 shrink-0">
          <div className="flex items-center gap-6">
            <div className={cn("p-5 rounded-[1.5rem] border-2 shadow-xl", currentStatus.bg, currentStatus.border, currentStatus.color)}>
                <currentStatus.icon size={36} />
            </div>
            <div>
                <div className="flex items-center gap-4">
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">#{order.dailyOrderNumber || order.id.slice(-4).toUpperCase()}</h2>
                    <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black border uppercase tracking-widest shadow-sm", currentStatus.bg, currentStatus.color, currentStatus.border)}>
                        {currentStatus.label}
                    </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-3 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                    <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded border border-slate-100 text-slate-500">ID: {order.id.slice(-8).toUpperCase()}</span>
                    <span className="flex items-center gap-1.5"><Clock size={14} className="text-orange-500"/> {format(new Date(order.createdAt), "HH:mm")}</span>
                    <span className="flex items-center gap-1.5"><Utensils size={14} className="text-orange-500"/> {isDelivery ? 'Delivery Flash' : `Mesa 0${order.tableNumber}`}</span>
                </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button onClick={handlePrint} disabled={isPrinting} className="flex-1 md:flex-none bg-slate-900 shadow-xl shadow-slate-200 h-14 px-8 rounded-2xl italic font-black">
                {isPrinting ? <Loader2 className="animate-spin" size={20} /> : <Printer size={20} />}
                IMPRIMIR
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-slate-50 h-14 w-14"><X size={28} /></Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-10 custom-scrollbar bg-slate-50/30">
            {/* COLUNA LOGÍSTICA E CLIENTE */}
            <div className="lg:col-span-4 space-y-8">
                <section>
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-4 ml-2 flex items-center gap-2 italic"><User size={14} className="text-orange-500"/> Destinatário</h3>
                    <Card className="p-8 border-slate-100 shadow-xl bg-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/5 -mr-12 -mt-12 rounded-full" />
                        {isDelivery ? (
                            <div className="space-y-6 relative z-10">
                                <div>
                                    <p className="text-xl font-black text-slate-900 uppercase italic tracking-tight leading-none">{order.deliveryOrder?.name || 'Cliente Final'}</p>
                                    <div className="flex items-center justify-between mt-4">
                                        <p className="text-xs text-slate-500 flex items-center gap-2 font-black italic">
                                            <Phone size={16} className="text-emerald-500" /> {order.deliveryOrder?.phone || '(00) 00000-0000'}
                                        </p>
                                        <a href={`tel:${order.deliveryOrder?.phone}`} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"><Phone size={14}/></a>
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-slate-50 space-y-3">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={12}/> Local de Entrega</p>
                                    <div className="bg-slate-50 p-5 rounded-3xl border-2 border-slate-100 text-xs font-black text-slate-700 relative group uppercase italic leading-relaxed shadow-inner">
                                        {order.deliveryOrder?.address}
                                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryOrder?.address || '')}`} target="_blank" className="absolute -right-3 -top-3 bg-blue-600 text-white p-2.5 rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110">
                                            <ExternalLink size={18} />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-6 relative z-10">
                                <div className="bg-orange-500 text-white p-5 rounded-[2rem] shadow-2xl shadow-orange-500/20">
                                    <Utensils size={32} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Unidade de Consumo</p>
                                    <p className="text-5xl font-black text-slate-900 italic tracking-tighter">MESA 0{order.tableNumber}</p>
                                </div>
                            </div>
                        )}
                    </Card>
                </section>

                <section>
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-4 ml-2 flex items-center gap-2 italic"><CreditCard size={14} className="text-orange-500"/> Financeiro</h3>
                    <Card className="bg-slate-900 text-white p-8 shadow-2xl border-none relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/10 blur-[60px] -mr-20 -mt-20 rounded-full" />
                        <div className="space-y-5 relative z-10">
                            <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <span>Subtotal dos Itens</span>
                                <span className="text-slate-300">R$ {order.total.toFixed(2).replace('.', ',')}</span>
                            </div>
                            {isDelivery && deliveryType === 'delivery' && (
                                <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    <span>Taxa de Entrega</span>
                                    <span className="text-blue-400">+ R$ {(order.deliveryOrder?.deliveryFee || 0).toFixed(2).replace('.', ',')}</span>
                                </div>
                            )}
                            <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-orange-500 uppercase tracking-[0.2em] mb-2">Valor Final</span>
                                    <span className="text-[10px] font-black text-white bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 uppercase tracking-widest flex items-center gap-2 leading-none">
                                      <CreditCard size={12} className="text-orange-500" /> {order.deliveryOrder?.paymentMethod || 'Não Definido'}
                                    </span>
                                </div>
                                <span className="text-4xl font-black text-emerald-400 tracking-tighter italic">
                                    R$ {(order.total + (isDelivery && deliveryType === 'delivery' ? (order.deliveryOrder?.deliveryFee || 0) : 0)).toFixed(2).replace('.', ',')}
                                </span>
                            </div>
                        </div>
                    </Card>
                </section>

                {isDelivery && (
                    <section className="animate-in slide-in-from-bottom-4 duration-500">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-4 ml-2 flex items-center gap-2 italic"><Truck size={14} className="text-blue-500"/> Fluxo Logístico</h3>
                        <Card className="bg-blue-50/50 border-2 border-blue-100 p-6 space-y-6 shadow-xl">
                            <div className="grid grid-cols-2 gap-2 p-1.5 bg-blue-100/50 rounded-2xl shadow-inner">
                                <button onClick={() => handleUpdateDeliveryType('pickup')} className={cn("flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", deliveryType === 'pickup' ? "bg-white text-blue-600 shadow-lg scale-[1.02]" : "text-blue-400 hover:text-blue-600")}><ShoppingBag size={16} /> Balcão</button>
                                <button onClick={() => handleUpdateDeliveryType('delivery')} className={cn("flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", deliveryType === 'delivery' ? "bg-white text-blue-600 shadow-lg scale-[1.02]" : "text-blue-400 hover:text-blue-600")}><Bike size={16} /> Entrega</button>
                            </div>

                            {deliveryType === 'delivery' ? (
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black text-blue-900/40 uppercase tracking-[0.2em] ml-1">Atribuir Entregador</label>
                                    <div className="relative">
                                      <select className="w-full bg-white border-2 border-blue-100 rounded-2xl h-14 px-5 text-xs font-black text-blue-900 focus:ring-4 focus:ring-blue-500/10 outline-none appearance-none cursor-pointer italic shadow-sm" value={selectedDriver} onChange={(e) => handleAssignDriver(e.target.value)}>
                                          <option value="">Aguardando seleção...</option>
                                          {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                      </select>
                                      <div className="absolute right-5 top-1/2 -translate-y-1/2 text-blue-300 pointer-events-none"><ChevronRight size={18} className="rotate-90" /></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 bg-white/50 rounded-3xl border border-blue-100 text-center flex flex-col items-center gap-3">
                                    <ShoppingBag className="text-blue-300" size={32} />
                                    <p className="text-[10px] font-black text-blue-400 uppercase italic leading-tight tracking-[0.1em]">Pedido aguardando<br/>retirada do cliente.</p>
                                </div>
                            )}
                        </Card>
                    </section>
                )}
            </div>

            {/* COLUNA ITENS DO PEDIDO */}
            <div className="lg:col-span-8">
                <div className="flex items-center justify-between mb-6 px-2">
                  <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-3">
                      <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><List size={20} /></div> Composição da Sacola
                  </h3>
                  <span className="text-[10px] font-black text-slate-400 bg-white border border-slate-100 px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-sm">{order.items.length} ITENS NO TOTAL</span>
                </div>
                
                <div className="space-y-4">
                    {order.items.map((item: any) => (
                        <Card key={item.id} className="p-6 flex items-start gap-6 hover:border-orange-500/20 transition-all border-slate-100 shadow-md bg-white group">
                            <div className="bg-slate-900 text-white w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl italic shrink-0 shadow-lg shadow-slate-200 group-hover:scale-110 transition-transform">
                                {item.quantity}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-6">
                                    <div>
                                        <h4 className="font-black text-slate-900 uppercase italic text-lg tracking-tight truncate leading-none mb-1">{item.product.name}</h4>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.product.category?.name || 'Item do Cardápio'}</p>
                                    </div>
                                    <span className="font-black text-slate-900 text-lg italic shrink-0 tracking-tighter">R$ {(item.quantity * item.priceAtTime).toFixed(2).replace('.', ',')}</span>
                                </div>
                                
                                {item.observation && (
                                    <div className="bg-orange-50 text-orange-700 px-4 py-3 rounded-2xl mt-4 text-xs font-bold border-l-4 border-orange-500 flex gap-3 italic animate-pulse-subtle">
                                        <Info size={16} className="shrink-0 text-orange-500" />
                                        <span>OBS: {item.observation}</span>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2 mt-5">
                                    {item.sizeJson && <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-lg font-black uppercase tracking-widest italic">TAM: {JSON.parse(item.sizeJson).name}</span>}
                                    {item.flavorsJson && JSON.parse(item.flavorsJson).map((flavor: any, i: number) => <span key={i} className="text-[9px] bg-orange-50 text-orange-600 border border-orange-100 px-2.5 py-1 rounded-lg font-black uppercase tracking-widest italic">Sabor: {flavor.name}</span>)}
                                    {item.addonsJson && JSON.parse(item.addonsJson).map((addon: any, i: number) => (
                                      <span key={i} className="text-[9px] bg-slate-50 text-slate-500 border border-slate-100 px-2.5 py-1 rounded-lg font-black uppercase tracking-widest italic">
                                        + {addon.quantity > 1 ? `${addon.quantity}x ` : ''}{addon.name}
                                      </span>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>

        {/* RODAPÉ: CONTROLE DE STATUS OPERACIONAL */}
        <div className="p-8 bg-white border-t border-slate-100 flex flex-col xl:flex-row items-center justify-between gap-8 shrink-0">
            <div className="flex flex-col text-center xl:text-left">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1 italic">Operação em Tempo Real</span>
                <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Mudar status do pedido para:</span>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
                {onStatusChange && STATUS_OPTIONS.map((status) => {
                    const isActive = order.status === status.value;
                    return (
                        <Button
                            key={status.value}
                            onClick={() => onStatusChange(order.id, status.value)}
                            disabled={isActive}
                            variant={isActive ? 'primary' : 'outline'}
                            className={cn(
                                "h-14 px-6 rounded-[1.25rem] text-[9px] uppercase tracking-widest gap-2 italic font-black transition-all",
                                isActive ? cn(status.bg, status.color, status.border, "opacity-100 shadow-inner border-2 pointer-events-none ring-4 ring-slate-50") : "bg-white border-slate-200 text-slate-400 hover:border-slate-900 hover:text-slate-900 hover:scale-105"
                            )}
                        >
                            <status.icon size={18} />
                            {status.label}
                        </Button>
                    );
                })}
            </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;
