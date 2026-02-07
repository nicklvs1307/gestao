import React, { useState, useEffect } from 'react';
import type { Order } from '@/types/index.ts';
import { getDrivers, assignDriver, getSettings, updateDeliveryType, markOrderAsPrinted } from '../services/api';
import { printOrder } from '../services/printing';
import { format } from 'date-fns';
import { 
  X, Clock, MapPin, CheckCircle, 
  Circle, PlayCircle, XCircle, Truck, Printer, Phone, 
  User, ExternalLink, Package, CreditCard, Loader2,
  ShoppingBag, Bike, Utensils
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
          toast.success("Entregador vinculado!");
      } catch (e) {
          toast.error("Erro ao atribuir entregador");
      }
  };

  const handleUpdateDeliveryType = async (type: 'delivery' | 'pickup') => {
      try {
          await updateDeliveryType(order.id, type);
          setDeliveryType(type);
          if (type === 'pickup') setSelectedDriver("");
          toast.success(`Pedido alterado para ${type === 'delivery' ? 'Entrega' : 'Retirada'}`);
      } catch (e) {
          toast.error("Erro ao alterar tipo de entrega");
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
    } catch (error) {
        console.error(error);
        toast.error("Erro ao imprimir");
    } finally {
        setIsPrinting(false);
    }
  };

  const currentStatus = STATUS_OPTIONS.find(s => s.value === order.status) || STATUS_OPTIONS[0];
  const isDeliveryOrder = order.orderType === 'DELIVERY';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-50 rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* HEADER MODERNO */}
        <div className="flex items-center justify-between p-6 md:p-8 border-b bg-white">
          <div className="flex items-center gap-5">
            <div className={cn("p-4 rounded-2xl border-2 shadow-lg", currentStatus.bg, currentStatus.border, currentStatus.color)}>
                <currentStatus.icon size={32} />
            </div>
            <div>
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase italic">#{order.dailyOrderNumber || order.id.slice(-4).toUpperCase()}</h2>
                    <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black border uppercase tracking-widest shadow-sm", currentStatus.bg, currentStatus.color, currentStatus.border)}>
                        {currentStatus.label}
                    </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">REF: {order.id.slice(-6).toUpperCase()}</span>
                    <span className="flex items-center gap-1"><Clock size={12} className="text-orange-500"/> {format(new Date(order.createdAt), "HH:mm")}</span>
                    <span className="flex items-center gap-1"><Package size={12} className="text-orange-500"/> {isDeliveryOrder ? 'Delivery' : `Mesa ${order.tableNumber}`}</span>
                </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
                onClick={handlePrint} 
                disabled={isPrinting}
                variant="primary"
                className="hidden sm:flex bg-slate-900 shadow-slate-200 h-12 px-6 rounded-xl italic"
            >
                {isPrinting ? <Loader2 className="animate-spin" size={18} /> : <Printer size={18} />}
                IMPRIMIR
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-slate-50">
                <X size={24} />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 custom-scrollbar">
            {/* COLUNA ESQUERDA: CLIENTE E LOGÍSTICA */}
            <div className="lg:col-span-4 space-y-6">
                <section>
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-2">Cliente / Local</h3>
                    <Card className="p-6 border-slate-100 shadow-sm space-y-4">
                        {isDeliveryOrder ? (
                            <>
                                <div>
                                    <p className="text-lg font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-1">{order.deliveryOrder?.name || 'Consumidor'}</p>
                                    <p className="text-xs text-slate-500 flex items-center gap-1.5 font-bold mt-2">
                                        <Phone size={14} className="text-orange-500" /> {order.deliveryOrder?.phone || 'Sem contato'}
                                    </p>
                                </div>
                                <div className="pt-4 border-t border-slate-50">
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Endereço de Entrega</p>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs font-bold text-slate-600 relative group uppercase italic leading-relaxed">
                                        {order.deliveryOrder?.address}
                                        <a 
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryOrder?.address || '')}`}
                                            target="_blank"
                                            className="absolute -right-2 -top-2 bg-blue-600 text-white p-2 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-all scale-90"
                                        >
                                            <ExternalLink size={16} />
                                        </a>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-5">
                                <div className="bg-orange-500 text-white p-4 rounded-2xl shadow-lg shadow-orange-100">
                                    <Utensils size={28} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mesa</p>
                                    <p className="text-4xl font-black text-slate-900 italic tracking-tighter">0{order.tableNumber}</p>
                                </div>
                            </div>
                        )}
                    </Card>
                </section>

                <section>
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-2">Pagamento</h3>
                    <Card className="bg-slate-900 text-white p-6 shadow-2xl border-none relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[50px] -mr-16 -mt-16 rounded-full" />
                        <div className="space-y-4 relative z-10">
                            <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <span>Subtotal</span>
                                <span className="text-slate-300">R$ {order.total.toFixed(2).replace('.', ',')}</span>
                            </div>
                            {isDeliveryOrder && deliveryType === 'delivery' && (
                                <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    <span>Taxa de Entrega</span>
                                    <span className="text-slate-300">R$ {(order.deliveryOrder?.deliveryFee || 0).toFixed(2).replace('.', ',')}</span>
                                </div>
                            )}
                            <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1">Total a Receber</span>
                                    <span className="text-[10px] font-black text-white bg-white/5 px-2 py-1 rounded border border-white/5 uppercase tracking-tighter flex items-center gap-1.5 leading-none">
                                      <CreditCard size={10} className="text-orange-500" /> {order.deliveryOrder?.paymentMethod || 'Pendente'}
                                    </span>
                                </div>
                                <span className="text-4xl font-black text-emerald-400 tracking-tighter italic">
                                    R$ {(order.total + (isDeliveryOrder && deliveryType === 'delivery' ? (order.deliveryOrder?.deliveryFee || 0) : 0)).toFixed(2).replace('.', ',')}
                                </span>
                            </div>
                        </div>
                    </Card>
                </section>

                {isDeliveryOrder && (
                    <section>
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-2">Logística</h3>
                        <Card className="bg-blue-50 border-blue-100 p-5 space-y-5 shadow-sm">
                            {/* Seletor de Tipo de Entrega */}
                            <div className="grid grid-cols-2 gap-2 p-1.5 bg-blue-100/50 rounded-2xl shadow-inner">
                                <button 
                                    onClick={() => handleUpdateDeliveryType('pickup')}
                                    className={cn(
                                        "flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        deliveryType === 'pickup' ? "bg-white text-blue-600 shadow-md scale-105" : "text-blue-400 hover:text-blue-600"
                                    )}
                                >
                                    <ShoppingBag size={14} /> Balcão
                                </button>
                                <button 
                                    onClick={() => handleUpdateDeliveryType('delivery')}
                                    className={cn(
                                        "flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        deliveryType === 'delivery' ? "bg-white text-blue-600 shadow-md scale-105" : "text-blue-400 hover:text-blue-600"
                                    )}
                                >
                                    <Bike size={14} /> Entrega
                                </button>
                            </div>

                            {/* Seletor de Entregador */}
                            {deliveryType === 'delivery' ? (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <label className="text-[9px] font-black text-blue-900/40 uppercase tracking-widest ml-1">Vincular Motoboy</label>
                                    <div className="relative">
                                      <select 
                                          className="w-full bg-white border-2 border-blue-100 rounded-2xl h-12 px-4 text-xs font-black text-blue-900 focus:ring-4 focus:ring-blue-500/10 outline-none appearance-none cursor-pointer italic"
                                          value={selectedDriver}
                                          onChange={(e) => handleAssignDriver(e.target.value)}
                                      >
                                          <option value="">Selecionar...</option>
                                          {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                      </select>
                                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300 rotate-90" size={16} />
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-blue-100/30 rounded-2xl border border-blue-100 text-center animate-in fade-in">
                                    <p className="text-[10px] font-black text-blue-400 uppercase italic leading-tight tracking-widest">O cliente fará a retirada<br/>na unidade.</p>
                                </div>
                            )}
                        </Card>
                    </section>
                )}
            </div>

            {/* COLUNA DIREITA: ITENS DO PEDIDO */}
            <div className="lg:col-span-8">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-2">
                      <ShoppingBag size={18} className="text-orange-500" /> Itens Solicitados
                  </h3>
                  <span className="text-[9px] font-black text-slate-400 bg-white border border-slate-100 px-2 py-1 rounded-lg uppercase tracking-widest">{order.items.length} ITENS</span>
                </div>
                
                <div className="space-y-3">
                    {order.items.map((item: any) => (
                        <Card key={item.id} className="p-5 flex items-start gap-5 hover:border-orange-500/20 transition-all border-slate-100 shadow-sm">
                            <div className="bg-slate-900 text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl italic shrink-0 shadow-lg shadow-slate-200">
                                {item.quantity}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-4">
                                    <h4 className="font-black text-slate-900 uppercase italic text-sm tracking-tight truncate">{item.product.name}</h4>
                                    <span className="font-black text-slate-900 text-sm italic shrink-0">R$ {(item.quantity * item.priceAtTime).toFixed(2).replace('.', ',')}</span>
                                </div>
                                
                                {item.observation && (
                                    <div className="bg-amber-50 text-amber-700 px-3 py-2 rounded-xl mt-3 text-[10px] font-bold border border-amber-100 flex gap-2">
                                        <Info size={14} className="shrink-0" />
                                        <span>OBS: {item.observation}</span>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2 mt-3">
                                    {item.sizeJson && <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-1 rounded-lg font-black uppercase tracking-tighter italic">TAM: {JSON.parse(item.sizeJson).name}</span>}
                                    {item.flavorsJson && JSON.parse(item.flavorsJson).map((flavor: any, i: number) => <span key={i} className="text-[9px] bg-orange-50 text-orange-600 border border-orange-100 px-2 py-1 rounded-lg font-black uppercase tracking-tighter italic">Sabor: {flavor.name}</span>)}
                                    {item.addonsJson && JSON.parse(item.addonsJson).map((addon: any, i: number) => (
                                      <span key={i} className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 px-2 py-1 rounded-lg font-black uppercase tracking-tighter italic">
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

        {/* RODAPÉ: AÇÕES DE STATUS */}
        <div className="p-6 md:p-8 bg-white border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Operacional</span>
                <span className="text-xs font-bold text-slate-600 uppercase">Mudar status para:</span>
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
                                "h-12 px-5 rounded-2xl text-[10px] uppercase tracking-widest gap-2 italic",
                                isActive ? cn(status.bg, status.color, status.border, "opacity-100 shadow-none pointer-events-none") : "bg-white border-slate-200 text-slate-400 hover:border-slate-900 hover:text-slate-900"
                            )}
                        >
                            <status.icon size={16} />
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