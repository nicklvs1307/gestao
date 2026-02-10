import React, { useState, useEffect } from 'react';
import type { Order } from '@/types/index.ts';
import { getDrivers, assignDriver, getSettings, updateDeliveryType, markOrderAsPrinted } from '../services/api';
import { printOrder } from '../services/printing';
import { format } from 'date-fns';
import { 
  X, Clock, MapPin, CheckCircle, 
  Circle, PlayCircle, XCircle, Printer, Phone, 
  ExternalLink, Package, CreditCard, Loader2,
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
    if (order) {
      setSelectedDriver(order.deliveryOrder?.driverId || "");
      setDeliveryType(order.deliveryOrder?.deliveryType || "pickup");
    }
  }, [order]);

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
      <div className="ui-modal-content w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* HEADER PREMIUM COMPACTO */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border-b bg-white gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className={cn("p-2.5 rounded-2xl border-2 shadow-lg", currentStatus.bg, currentStatus.border, currentStatus.color)}>
                <currentStatus.icon size={20} />
            </div>
            <div>
                <div className="flex items-center gap-3">
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">#{order.dailyOrderNumber || order.id.slice(-4).toUpperCase()}</h2>
                    <span className={cn("px-2 py-0.5 rounded-lg text-[8px] font-black border uppercase tracking-widest shadow-sm", currentStatus.bg, currentStatus.color, currentStatus.border)}>
                        {currentStatus.label}
                    </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-slate-400 text-[8px] font-black uppercase tracking-[0.15em]">
                    <span className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 text-slate-500">ID: {order.id.slice(-8).toUpperCase()}</span>
                    <span className="flex items-center gap-1"><Clock size={10} className="text-orange-500"/> {format(new Date(order.createdAt), "HH:mm")}</span>
                    <span className="flex items-center gap-1"><Utensils size={10} className="text-orange-500"/> {isDelivery ? (order.deliveryOrder?.deliveryType === 'delivery' ? 'Entrega' : 'Retirada') : `Mesa 0${order.tableNumber}`}</span>
                </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button onClick={handlePrint} disabled={isPrinting} className="flex-1 md:flex-none bg-slate-900 shadow-lg shadow-slate-200 h-10 px-5 rounded-xl italic font-black text-[9px]">
                {isPrinting ? <Loader2 className="animate-spin" size={14} /> : <Printer size={14} />}
                IMPRIMIR
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-slate-50 h-10 w-10"><X size={20} /></Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 custom-scrollbar bg-slate-50/30">
            {/* COLUNA LOGÍSTICA E CLIENTE */}
            <div className="lg:col-span-5 space-y-5">
                <section>
                    <h3 className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2.5 ml-1 flex items-center gap-2 italic"><User size={10} className="text-orange-500"/> Destinatário</h3>
                    <Card className="p-4 border-slate-100 shadow-md bg-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-slate-500/5 -mr-6 -mt-6 rounded-full" />
                        {isDelivery ? (
                            <div className="space-y-3 relative z-10">
                                <div>
                                    <p className="text-base font-black text-slate-900 uppercase italic tracking-tight leading-none">{order.deliveryOrder?.name || 'Cliente Final'}</p>
                                    <div className="flex items-center justify-between mt-2.5">
                                        <p className="text-[10px] text-slate-500 flex items-center gap-2 font-black italic">
                                            <Phone size={12} className="text-emerald-500" /> {order.deliveryOrder?.phone || '(00) 00000-0000'}
                                        </p>
                                        <a href={`tel:${order.deliveryOrder?.phone}`} className="p-1 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"><Phone size={10}/></a>
                                    </div>
                                </div>
                                <div className="pt-3 border-t border-slate-50 space-y-1.5">
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={8}/> Endereço</p>
                                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[10px] font-black text-slate-700 relative group uppercase italic leading-relaxed shadow-inner">
                                        {order.deliveryOrder?.address && order.deliveryOrder.address !== 'Retirada no Balcão' ? order.deliveryOrder.address : 'RETIRADA NO ESTABELECIMENTO'}
                                        {order.deliveryOrder?.address && order.deliveryOrder.address !== 'Retirada no Balcão' && (
                                            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryOrder?.address || '')}`} target="_blank" className="absolute -right-2 -top-2 bg-blue-600 text-white p-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110">
                                                <ExternalLink size={12} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="bg-orange-500 text-white p-3 rounded-xl shadow-lg shadow-orange-500/20">
                                    <Utensils size={20} />
                                </div>
                                <div>
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Unidade</p>
                                    <p className="text-2xl font-black text-slate-900 italic tracking-tighter">MESA 0{order.tableNumber}</p>
                                </div>
                            </div>
                        )}
                    </Card>
                </section>

                <section>
                    <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3 ml-1 flex items-center gap-2 italic"><CreditCard size={12} className="text-orange-500"/> Financeiro</h3>
                    <Card className="bg-slate-900 text-white p-5 shadow-lg border-none relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[40px] -mr-16 -mt-16 rounded-full" />
                        <div className="space-y-3 relative z-10">
                            <div className="flex justify-between items-center text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                <span>Subtotal</span>
                                <span className="text-slate-300">R$ {order.total.toFixed(2).replace('.', ',')}</span>
                            </div>
                            {isDelivery && deliveryType === 'delivery' && (
                                <div className="flex justify-between items-center text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                    <span>Taxa de Entrega</span>
                                    <span className="text-blue-400">+ R$ {(order.deliveryOrder?.deliveryFee || 0).toFixed(2).replace('.', ',')}</span>
                                </div>
                            )}
                            <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-orange-500 uppercase tracking-[0.15em] mb-1">Total</span>
                                    <span className="text-[9px] font-black text-white bg-white/5 px-2 py-1 rounded-lg border border-white/5 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                                      <CreditCard size={10} className="text-orange-500" /> {order.deliveryOrder?.paymentMethod || 'Não Definido'}
                                    </span>
                                </div>
                                <span className="text-3xl font-black text-emerald-400 tracking-tighter italic">
                                    R$ {(order.total + (isDelivery && deliveryType === 'delivery' ? (order.deliveryOrder?.deliveryFee || 0) : 0)).toFixed(2).replace('.', ',')}
                                </span>
                            </div>
                        </div>
                    </Card>
                </section>

                {isDelivery && (
                    <section className="animate-in slide-in-from-bottom-2 duration-500">
                        <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3 ml-1 flex items-center gap-2 italic"><Truck size={12} className="text-blue-500"/> Fluxo Logístico</h3>
                        <Card className="bg-blue-50/50 border border-blue-100 p-4 space-y-4 shadow-md">
                            <div className="grid grid-cols-2 gap-2 p-1 bg-blue-100/50 rounded-xl shadow-inner">
                                <button onClick={() => handleUpdateDeliveryType('pickup')} className={cn("flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", deliveryType === 'pickup' ? "bg-white text-blue-600 shadow-md scale-[1.02]" : "text-blue-400 hover:text-blue-600")}><ShoppingBag size={14} /> Balcão</button>
                                <button onClick={() => handleUpdateDeliveryType('delivery')} className={cn("flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", deliveryType === 'delivery' ? "bg-white text-blue-600 shadow-md scale-[1.02]" : "text-blue-400 hover:text-blue-600")}><Bike size={14} /> Entrega</button>
                            </div>

                            {deliveryType === 'delivery' ? (
                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-blue-900/40 uppercase tracking-[0.15em] ml-1">Entregador</label>
                                    <div className="relative">
                                      <select className="w-full bg-white border border-blue-100 rounded-xl h-11 px-4 text-[11px] font-black text-blue-900 focus:ring-4 focus:ring-blue-500/10 outline-none appearance-none cursor-pointer italic shadow-sm" value={selectedDriver} onChange={(e) => handleAssignDriver(e.target.value)}>
                                          <option value="">Selecionar...</option>
                                          {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                      </select>
                                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300 pointer-events-none"><ChevronRight size={14} className="rotate-90" /></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-white/50 rounded-2xl border border-blue-100 text-center flex flex-col items-center gap-2">
                                    <ShoppingBag className="text-blue-300" size={24} />
                                    <p className="text-[9px] font-black text-blue-400 uppercase italic leading-tight tracking-[0.05em]">Aguardando retirada</p>
                                </div>
                            )}
                        </Card>
                    </section>
                )}
            </div>

            {/* COLUNA ITENS DO PEDIDO */}
            <div className="lg:col-span-7">
                <div className="flex items-center justify-between mb-4 px-1">
                  <h3 className="text-base font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-2">
                      <div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg"><List size={16} /></div> Itens da Sacola
                  </h3>
                  <span className="text-[8px] font-black text-slate-400 bg-white border border-slate-100 px-2 py-1 rounded-lg uppercase tracking-widest shadow-sm">{order.items.length} ITENS</span>
                </div>
                
                <div className="space-y-3">
                    {order.items.map((item: any) => (
                        <Card key={item.id} className="p-4 flex items-start gap-4 hover:border-orange-500/20 transition-all border-slate-100 shadow-sm bg-white group">
                            <div className="bg-slate-900 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg italic shrink-0 shadow-md group-hover:scale-105 transition-transform">
                                {item.quantity}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <h4 className="font-black text-slate-900 uppercase italic text-sm tracking-tight truncate leading-none mb-1">{item.product.name}</h4>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{item.product.category?.name || 'Item do Cardápio'}</p>
                                    </div>
                                    <span className="font-black text-slate-900 text-sm italic shrink-0 tracking-tighter">R$ {(item.quantity * item.priceAtTime).toFixed(2).replace('.', ',')}</span>
                                </div>
                                
                                {item.observation && (
                                    <div className="bg-orange-50 text-orange-700 px-3 py-2 rounded-xl mt-3 text-[10px] font-bold border-l-2 border-orange-500 flex gap-2 italic">
                                        <Info size={14} className="shrink-0 text-orange-500" />
                                        <span>OBS: {item.observation}</span>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-1.5 mt-3">
                                    {item.sizeJson && <span className="text-[8px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-md font-black uppercase tracking-widest italic">TAM: {JSON.parse(item.sizeJson).name}</span>}
                                    {item.flavorsJson && JSON.parse(item.flavorsJson).map((flavor: any, i: number) => <span key={i} className="text-[8px] bg-orange-50 text-orange-600 border border-orange-100 px-2 py-0.5 rounded-md font-black uppercase tracking-widest italic">Sabor: {flavor.name}</span>)}
                                    {item.addonsJson && JSON.parse(item.addonsJson).map((addon: any, i: number) => (
                                      <span key={i} className="text-[8px] bg-slate-50 text-slate-500 border border-slate-100 px-2 py-0.5 rounded-md font-black uppercase tracking-widest italic">
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

        {/* RODAPÉ: CONTROLE DE STATUS OPERACIONAL COMPACTO */}
        <div className="p-5 bg-white border-t border-slate-100 flex flex-col xl:flex-row items-center justify-between gap-4 shrink-0">
            <div className="flex flex-col text-center xl:text-left">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5 italic">Status Operacional</span>
                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Alterar para:</span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
                {onStatusChange && STATUS_OPTIONS.map((status) => {
                    const isActive = order.status === status.value;
                    return (
                        <Button
                            key={status.value}
                            onClick={() => onStatusChange(order.id, status.value)}
                            disabled={isActive}
                            variant={isActive ? 'primary' : 'outline'}
                            className={cn(
                                "h-10 px-4 rounded-xl text-[8px] uppercase tracking-widest gap-1.5 italic font-black transition-all",
                                isActive ? cn(status.bg, status.color, status.border, "opacity-100 shadow-inner border pointer-events-none ring-2 ring-slate-50") : "bg-white border-slate-200 text-slate-400 hover:border-slate-900 hover:text-slate-900 hover:scale-105"
                            )}
                        >
                            <status.icon size={14} />
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
