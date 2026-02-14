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
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-hidden">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        
        {/* HEADER COMPACTO */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-xl border-2", currentStatus.bg, currentStatus.border, currentStatus.color)}>
                <currentStatus.icon size={18} />
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900 uppercase italic leading-none">Pedido #{order.dailyOrderNumber || order.id.slice(-4).toUpperCase()}</h2>
                    <span className={cn("px-1.5 py-0.5 rounded text-[7px] font-black border uppercase tracking-widest", currentStatus.bg, currentStatus.color, currentStatus.border)}>
                        {currentStatus.label}
                    </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-slate-400 text-[8px] font-black uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Clock size={10} className="text-orange-500"/> {format(new Date(order.createdAt), "HH:mm")}</span>
                    <span className="flex items-center gap-1"><Utensils size={10} className="text-orange-500"/> {isDelivery ? (order.deliveryOrder?.deliveryType === 'delivery' ? 'Entrega' : 'Retirada') : `Mesa ${order.tableNumber}`}</span>
                </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} disabled={isPrinting} className="bg-slate-900 h-9 px-4 rounded-lg italic font-black text-[9px]">
                {isPrinting ? <Loader2 className="animate-spin mr-1.5" size={12} /> : <Printer className="mr-1.5" size={12} />} IMPRIMIR
            </Button>
            <button onClick={onClose} className="w-8 h-8 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 custom-scrollbar bg-slate-50/30">
            {/* COLUNA ESQUERDA: CLIENTE E LOGÍSTICA */}
            <div className="lg:col-span-5 space-y-4">
                <section>
                    <h3 className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1 flex items-center gap-1.5 italic"><User size={10} className="text-orange-500"/> Cliente</h3>
                    <Card className="p-4 border-slate-100 shadow-sm bg-white">
                        {isDelivery ? (
                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm font-black text-slate-900 uppercase italic leading-none">{order.deliveryOrder?.name || 'Cliente Geral'}</p>
                                    <div className="flex items-center justify-between mt-2">
                                        <p className="text-[10px] text-slate-500 flex items-center gap-1.5 font-bold italic"><Phone size={10} className="text-emerald-500" /> {order.deliveryOrder?.phone || 'N/A'}</p>
                                        <a href={`tel:${order.deliveryOrder?.phone}`} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><Phone size={10}/></a>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-slate-50">
                                    <p className="text-[7px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><MapPin size={8}/> Endereço de Destino</p>
                                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-[9px] font-bold text-slate-600 uppercase italic leading-relaxed relative group">
                                        {order.deliveryOrder?.address || 'Retirada no Balcão'}
                                        {order.deliveryOrder?.address && order.deliveryOrder.address !== 'Retirada no Balcão' && (
                                            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryOrder.address)}`} target="_blank" className="absolute -right-1 -top-1 bg-blue-600 text-white p-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-all"><ExternalLink size={10} /></a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="bg-orange-500 text-white p-2.5 rounded-xl"><Utensils size={18} /></div>
                                <div><p className="text-[7px] font-black text-slate-400 uppercase">Localização</p><p className="text-xl font-black text-slate-900 italic">MESA {order.tableNumber}</p></div>
                            </div>
                        )}
                    </Card>
                </section>

                <section>
                    <h3 className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1 flex items-center gap-1.5 italic"><CreditCard size={10} className="text-orange-500"/> Financeiro</h3>
                    <Card className="bg-slate-900 text-white p-4 shadow-md border-none overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 blur-2xl -mr-12 -mt-12 rounded-full" />
                        <div className="space-y-2 relative z-10">
                            <div className="flex justify-between items-center text-[8px] font-black text-slate-500 uppercase"><span>Produtos</span><span className="text-slate-300">R$ {order.total.toFixed(2)}</span></div>
                            {isDelivery && (
                                <div className="flex justify-between items-center text-[8px] font-black text-slate-500 uppercase"><span>Taxa Entrega</span><span className="text-blue-400">+ R$ {(order.deliveryOrder?.deliveryFee || 0).toFixed(2)}</span></div>
                            )}
                            <div className="pt-2 border-t border-white/10 flex justify-between items-end">
                                <div><p className="text-[7px] font-black text-orange-500 uppercase mb-0.5">Total Receber</p><span className="text-[8px] font-black text-white bg-white/5 px-1.5 py-0.5 rounded border border-white/5 uppercase italic">{order.deliveryOrder?.paymentMethod || 'PENDENTE'}</span></div>
                                <span className="text-2xl font-black text-emerald-400 italic tracking-tighter">R$ {(order.total + (order.deliveryOrder?.deliveryFee || 0)).toFixed(2)}</span>
                            </div>
                        </div>
                        
                        {/* Botão de NFC-e integrado ao card financeiro */}
                        {order.status === 'COMPLETED' && (
                            <button 
                                onClick={handleEmitInvoice}
                                disabled={isEmitting}
                                className="w-full mt-4 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/10 group"
                            >
                                {isEmitting ? <Loader2 size={14} className="animate-spin text-orange-500" /> : <FileText size={14} className="text-orange-500" />}
                                <span className="text-[9px] font-black uppercase tracking-widest text-white group-hover:text-orange-500 transition-colors">
                                    {order.invoice ? 'Ver NFC-e Emitida' : 'Emitir NFC-e (Nota)'}
                                </span>
                            </button>
                        )}
                    </Card>
                </section>

                {isDelivery && (
                    <section>
                        <h3 className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1 flex items-center gap-1.5 italic"><Truck size={10} className="text-blue-500"/> Logística</h3>
                        <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-2xl space-y-3">
                            <div className="flex gap-1 p-1 bg-blue-100/50 rounded-xl">
                                <button onClick={() => handleUpdateDeliveryType('pickup')} className={cn("flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all", deliveryType === 'pickup' ? "bg-white text-blue-600 shadow-sm" : "text-blue-400")}>Balcão</button>
                                <button onClick={() => handleUpdateDeliveryType('delivery')} className={cn("flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all", deliveryType === 'delivery' ? "bg-white text-blue-600 shadow-sm" : "text-blue-400")}>Entrega</button>
                            </div>
                            {deliveryType === 'delivery' && (
                                <select className="w-full bg-white border border-blue-100 rounded-lg h-9 px-3 text-[10px] font-black text-blue-900 outline-none italic shadow-sm" value={selectedDriver} onChange={(e) => handleAssignDriver(e.target.value)}>
                                    <option value="">Vincular Motoboy...</option>
                                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            )}
                        </div>
                    </section>
                )}
            </div>

            {/* COLUNA DIREITA: ITENS */}
            <div className="lg:col-span-7 flex flex-col">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-1.5">
                      <List size={14} className="text-orange-500" /> Itens
                  </h3>
                  <span className="text-[7px] font-black text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-md uppercase">{order.items.length} UN</span>
                </div>
                
                <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1">
                    {order.items.map((item: any) => (
                        <div key={item.id} className="p-3 flex items-start gap-3 border border-slate-100 rounded-2xl bg-white shadow-sm group">
                            <div className="bg-slate-900 text-white w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm italic shrink-0">{item.quantity}</div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-black text-slate-900 uppercase italic text-xs tracking-tight truncate pr-2">{item.product.name}</h4>
                                    <span className="font-black text-slate-900 text-xs italic tracking-tighter">R$ {(item.quantity * item.priceAtTime).toFixed(2)}</span>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                    {item.sizeJson && <span className="text-[7px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase italic">T: {JSON.parse(item.sizeJson).name}</span>}
                                    {item.flavorsJson && JSON.parse(item.flavorsJson).map((f: any, i: number) => <span key={i} className="text-[7px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-black uppercase italic">{f.name}</span>)}
                                    {item.addonsJson && JSON.parse(item.addonsJson).map((a: any, i: number) => <span key={i} className="text-[7px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase italic">+ {a.name}</span>)}
                                </div>
                                {item.observations && <p className="mt-2 text-[9px] font-bold text-orange-600 italic bg-orange-50 px-2 py-1 rounded-lg border-l-2 border-orange-500">OBS: {item.observations}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* RODAPÉ: STATUS */}
        <div className="p-4 bg-white border-t border-slate-100 flex flex-wrap justify-center gap-2 shrink-0">
            {onStatusChange && STATUS_OPTIONS.map((status) => {
                const isActive = order.status === status.value;
                return (
                    <Button key={status.value} onClick={() => onStatusChange(order.id, status.value)} disabled={isActive} variant={isActive ? 'primary' : 'outline'}
                        className={cn("h-9 px-3 rounded-xl text-[7px] uppercase tracking-widest gap-1 italic font-black", isActive ? cn(status.bg, status.color, status.border, "shadow-inner border-2") : "bg-white border-slate-200 text-slate-400 hover:text-slate-900")}>
                        <status.icon size={12} /> {status.label}
                    </Button>
                );
            })}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;