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
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-2 animate-in fade-in duration-300 overflow-hidden">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl h-[90vh] lg:h-auto lg:max-h-[85vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-200">
        
        {/* HEADER ULTRA COMPACTO */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b bg-white shrink-0 relative">
          <div className="flex items-center gap-3">
            <div className={cn("p-1.5 rounded-lg border shadow-sm", currentStatus.bg, currentStatus.border, currentStatus.color)}>
                <currentStatus.icon size={16} strokeWidth={3} />
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter">
                        Pedido <span className="text-orange-600">#{order.dailyOrderNumber || order.id.slice(-4).toUpperCase()}</span>
                    </h2>
                    <span className={cn("px-1.5 py-0.5 rounded-md text-[7px] font-black border uppercase tracking-widest", currentStatus.bg, currentStatus.color, currentStatus.border)}>
                        {currentStatus.label}
                    </span>
                </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
                onClick={handlePrint} 
                disabled={isPrinting} 
                className="flex items-center gap-1.5 bg-slate-900 text-white h-8 px-3 rounded-xl hover:bg-slate-800 transition-all active:scale-95 shadow-sm"
            >
                {isPrinting ? <Loader2 className="animate-spin" size={12} /> : <Printer size={12} />} 
                <span className="italic font-black text-[8px] uppercase tracking-widest">Imprimir</span>
            </button>
            <button 
                onClick={onClose} 
                className="w-8 h-8 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm"
            >
                <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-slate-50/30">
            {/* COLUNA ESQUERDA: CLIENTE, LOGÍSTICA E FINANCEIRO */}
            <div className="lg:col-span-4 p-4 space-y-3 border-r border-slate-100 overflow-y-auto custom-scrollbar">
                {/* DADOS DO CLIENTE */}
                <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-1.5 italic">
                        <User size={10} className="text-orange-500"/> Identificação
                    </h3>
                    {isDelivery ? (
                        <div className="space-y-2">
                            <p className="text-xs font-black text-slate-900 uppercase italic leading-none truncate">
                                {order.deliveryOrder?.name || 'Cliente Geral'}
                            </p>
                            <div className="flex items-center gap-2">
                                <a href={`tel:${order.deliveryOrder?.phone}`} className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                                    <Phone size={10} /> {order.deliveryOrder?.phone || 'N/A'}
                                </a>
                            </div>
                            {order.deliveryOrder?.address && (
                                <div className="mt-1 pt-1.5 border-t border-slate-50 relative group">
                                    <p className="text-[7px] font-black text-slate-400 uppercase mb-1">Endereço</p>
                                    <p className="text-[9px] font-bold text-slate-600 uppercase italic leading-tight pr-6">
                                        {order.deliveryOrder.address}
                                    </p>
                                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryOrder.address)}`} target="_blank" className="absolute right-0 bottom-0 text-blue-500 hover:text-blue-700 p-1">
                                        <ExternalLink size={10} />
                                    </a>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="bg-orange-500 text-white w-8 h-8 rounded-lg flex items-center justify-center shadow-md">
                                <Utensils size={16} />
                            </div>
                            <div>
                                <p className="text-[7px] font-black text-slate-400 uppercase">Localização</p>
                                <p className="text-lg font-black text-slate-900 italic leading-none">MESA {order.tableNumber}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* LOGÍSTICA COMPACTA */}
                {isDelivery && (
                    <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-2xl space-y-2">
                        <div className="flex gap-1 p-0.5 bg-blue-100/50 rounded-xl">
                            <button onClick={() => handleUpdateDeliveryType('pickup')} className={cn("flex-1 py-1 rounded-lg text-[8px] font-black uppercase transition-all", deliveryType === 'pickup' ? "bg-white text-blue-600 shadow-sm" : "text-blue-400")}>Balcão</button>
                            <button onClick={() => handleUpdateDeliveryType('delivery')} className={cn("flex-1 py-1 rounded-lg text-[8px] font-black uppercase transition-all", deliveryType === 'delivery' ? "bg-white text-blue-600 shadow-sm" : "text-blue-400")}>Entrega</button>
                        </div>
                        {deliveryType === 'delivery' && (
                            <select className="w-full bg-white border border-blue-100 rounded-lg h-8 px-2 text-[9px] font-black text-blue-900 outline-none italic shadow-sm" value={selectedDriver} onChange={(e) => handleAssignDriver(e.target.value)}>
                                <option value="">MOTOBOY...</option>
                                {drivers.map(d => <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>)}
                            </select>
                        )}
                    </div>
                )}

                {/* FINANCEIRO DENSO */}
                <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg relative overflow-hidden">
                    <div className="space-y-1.5 relative z-10">
                        <div className="flex justify-between items-center text-[8px] font-black text-slate-500 uppercase tracking-widest">
                            <span>Produtos / Taxa</span>
                            <span className="text-slate-300">R$ {order.total.toFixed(2)} {isDelivery && `+ ${order.deliveryOrder?.deliveryFee || 0}`}</span>
                        </div>
                        <div className="pt-2 mt-1 border-t border-white/10 flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                    <CreditCard size={8} className="text-slate-400" />
                                    <span className="text-[7px] font-black text-white uppercase italic">{order.deliveryOrder?.paymentMethod || 'A PAGAR'}</span>
                                </div>
                            </div>
                            <span className="text-xl font-black text-emerald-400 italic tracking-tighter leading-none">
                                R$ {(order.total + (order.deliveryOrder?.deliveryFee || 0)).toFixed(2)}
                            </span>
                        </div>
                    </div>
                    
                    {order.status === 'COMPLETED' && (
                        <button onClick={handleEmitInvoice} disabled={isEmitting} className="w-full mt-3 h-8 bg-emerald-500 hover:bg-emerald-400 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95">
                            {isEmitting ? <Loader2 size={12} className="animate-spin text-white" /> : <FileText size={12} className="text-white" />}
                            <span className="text-[8px] font-black uppercase tracking-widest text-white">{order.invoice ? 'Ver NFC-e' : 'Emitir Nota'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* COLUNA DIREITA: LISTA DE ITENS COM SCROLL INTERNO */}
            <div className="lg:col-span-8 flex flex-col min-h-0 bg-white">
                <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <h3 className="text-[10px] font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-2">
                      <List size={14} className="text-orange-500" /> Itens do Pedido
                  </h3>
                  <span className="text-[8px] font-black text-slate-400">{order.items.length} UN</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {order.items.map((item: any) => (
                        <div key={item.id} className="p-2.5 flex items-start gap-3 border border-slate-100 rounded-2xl bg-white hover:bg-slate-50 transition-colors group relative">
                            <div className="absolute top-2.5 right-3 font-black text-slate-900 text-[10px] italic tracking-tighter">
                                R$ {(item.quantity * item.priceAtTime).toFixed(2)}
                            </div>
                            <div className="bg-slate-900 text-white w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm italic shrink-0">
                                {item.quantity}
                            </div>
                            <div className="flex-1 min-w-0 pr-16">
                                <h4 className="font-black text-slate-900 uppercase italic text-[10px] tracking-tight leading-none mb-1">
                                    {item.product.name}
                                </h4>
                                <div className="flex flex-wrap gap-1">
                                    {item.sizeJson && <span className="text-[7px] bg-blue-50 text-blue-600 px-1 py-0.2 rounded font-black uppercase italic">T: {JSON.parse(item.sizeJson).name}</span>}
                                    {item.flavorsJson && JSON.parse(item.flavorsJson).map((f: any, i: number) => <span key={i} className="text-[7px] bg-orange-50 text-orange-600 px-1 py-0.2 rounded font-black uppercase italic">{f.name}</span>)}
                                    {item.addonsJson && JSON.parse(item.addonsJson).map((a: any, i: number) => <span key={i} className="text-[7px] bg-slate-50 text-slate-400 px-1 py-0.2 rounded font-black uppercase italic">+ {a.name}</span>)}
                                </div>
                                {item.observations && (
                                    <div className="mt-1.5 p-1.5 bg-orange-50 rounded-lg border-l-2 border-orange-500">
                                        <p className="text-[8px] font-bold text-orange-600 italic">OBS: {item.observations.toUpperCase()}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* FOOTER DE STATUS SLIM */}
        <div className="p-3 bg-white border-t border-slate-100 flex flex-wrap justify-center items-center gap-1.5 shrink-0">
            {onStatusChange && STATUS_OPTIONS.map((status) => {
                const isActive = order.status === status.value;
                return (
                    <button 
                        key={status.value} 
                        onClick={() => onStatusChange(order.id, status.value)} 
                        disabled={isActive}
                        className={cn(
                            "flex items-center gap-1.5 h-8 px-3 rounded-xl text-[7px] uppercase tracking-widest italic font-black transition-all border shadow-sm",
                            isActive 
                                ? cn(status.bg, status.color, status.border, "scale-105 z-10") 
                                : "bg-white border-slate-100 text-slate-400 hover:bg-slate-50"
                        )}
                    >
                        <status.icon size={10} strokeWidth={isActive ? 3 : 2} /> 
                        {status.label}
                    </button>
                );
            })}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;