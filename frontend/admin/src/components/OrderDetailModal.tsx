import React, { useState, useEffect } from 'react';
import type { Order } from '@/types/index.ts';
import { getDrivers, assignDriver, getSettings, updateDeliveryType, markOrderAsPrinted } from '../services/api';
import { printOrder } from '../services/printing';
import { format } from 'date-fns';
import { 
  X, Clock, MapPin, DollarSign, Utensils, CheckCircle, 
  Circle, PlayCircle, XCircle, Truck, Printer, Phone, 
  User, ExternalLink, ChevronRight, Package, CreditCard, Loader2,
  ShoppingBag, Bike
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

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
        
        // Marca como impresso no banco para evitar auto-print posterior
        await markOrderAsPrinted(order.id);
        console.log("Pedido marcado como impresso via modal.");
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
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        <div className="flex items-center justify-between p-6 border-b bg-slate-50">
          <div className="flex items-center gap-4">
            <div className={cn("p-3 rounded-2xl border-2", currentStatus.bg, currentStatus.border, currentStatus.color)}>
                <currentStatus.icon size={28} />
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Pedido #{order.dailyOrderNumber || order.id.slice(-6).toUpperCase()}</h2>
                    <span className={cn("px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider", currentStatus.bg, currentStatus.color, currentStatus.border)}>
                        {currentStatus.label}
                    </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-slate-500 text-sm font-medium">
                    <span className="flex items-center gap-1 font-bold text-slate-400 text-xs">REF: {order.id.slice(-6).toUpperCase()}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                    <span className="flex items-center gap-1"><Clock size={14}/> {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm")}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                    <span className="flex items-center gap-1"><Package size={14}/> {isDeliveryOrder ? 'Delivery' : `Mesa ${order.tableNumber}`}</span>
                </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
                onClick={handlePrint} 
                disabled={isPrinting}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all disabled:opacity-50"
            >
                {isPrinting ? <Loader2 className="animate-spin" size={18} /> : <Printer size={18} />}
                Imprimir
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-900 rounded-xl transition-all">
                <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
                <section className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                        <User size={14} /> Cliente / Local
                    </h3>
                    
                    {isDeliveryOrder ? (
                        <div className="space-y-4">
                            <div>
                                <p className="text-lg font-bold text-slate-900">{order.deliveryOrder?.name || 'Cliente não identificado'}</p>
                                <p className="text-sm text-slate-500 flex items-center gap-1 font-medium mt-1">
                                    <Phone size={14} /> {order.deliveryOrder?.phone || 'Sem telefone'}
                                </p>
                            </div>
                            <div className="pt-4 border-t border-slate-200">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Endereço de Entrega</p>
                                <div className="bg-white p-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 relative group">
                                    {order.deliveryOrder?.address}
                                    <a 
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryOrder?.address || '')}`}
                                        target="_blank"
                                        className="absolute -right-2 -top-2 bg-blue-600 text-white p-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="bg-orange-100 text-orange-600 p-3 rounded-xl">
                                <Utensils size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-400 uppercase">Número da Mesa</p>
                                <p className="text-2xl font-black text-slate-900">{order.tableNumber}</p>
                            </div>
                        </div>
                    )}
                </section>

                <section className="bg-slate-900 text-white rounded-2xl p-5 shadow-xl">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                        <CreditCard size={14} /> Resumo Financeiro
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm text-slate-400">
                            <span>Subtotal</span>
                            <span>R$ {order.total.toFixed(2).replace('.', ',')}</span>
                        </div>
                        {isDeliveryOrder && deliveryType === 'delivery' && (
                            <div className="flex justify-between text-sm text-slate-400">
                                <span>Taxa de Entrega</span>
                                <span>R$ {(order.deliveryOrder?.deliveryFee || 0).toFixed(2).replace('.', ',')}</span>
                            </div>
                        )}
                        <div className="pt-3 border-t border-white/10 flex justify-between items-end">
                            <span className="text-sm font-bold">TOTAL</span>
                            <span className="text-3xl font-black text-emerald-400">
                                R$ {(order.total + (isDeliveryOrder && deliveryType === 'delivery' ? (order.deliveryOrder?.deliveryFee || 0) : 0)).toFixed(2).replace('.', ',')}
                            </span>
                        </div>
                    </div>
                </section>

                {isDeliveryOrder && (
                    <section className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-4">
                        <h3 className="text-xs font-black uppercase text-blue-400 tracking-widest flex items-center gap-2">
                            <Truck size={14} /> Logística
                        </h3>
                        
                        {/* Seletor de Tipo de Entrega */}
                        <div className="grid grid-cols-2 gap-2 p-1 bg-blue-100/50 rounded-xl">
                            <button 
                                onClick={() => handleUpdateDeliveryType('pickup')}
                                className={cn(
                                    "flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all",
                                    deliveryType === 'pickup' ? "bg-white text-blue-600 shadow-sm" : "text-blue-400 hover:text-blue-600"
                                )}
                            >
                                <ShoppingBag size={14} /> Retirada
                            </button>
                            <button 
                                onClick={() => handleUpdateDeliveryType('delivery')}
                                className={cn(
                                    "flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all",
                                    deliveryType === 'delivery' ? "bg-white text-blue-600 shadow-sm" : "text-blue-400 hover:text-blue-600"
                                )}
                            >
                                <Bike size={14} /> Entrega
                            </button>
                        </div>

                        {/* Seletor de Entregador (Apenas se for Entrega) */}
                        {deliveryType === 'delivery' ? (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="text-[10px] font-bold text-blue-900/50 uppercase">Entregador Responsável</label>
                                <select 
                                    className="w-full bg-white border border-blue-200 rounded-xl h-10 px-3 text-sm font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={selectedDriver}
                                    onChange={(e) => handleAssignDriver(e.target.value)}
                                >
                                    <option value="">Selecionar Motoboy...</option>
                                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                        ) : (
                            <div className="p-3 bg-blue-100/30 rounded-xl border border-blue-100 text-center animate-in fade-in duration-300">
                                <p className="text-[10px] font-bold text-blue-400 uppercase leading-tight">Cliente virá retirar.<br/>Vínculo de motoboy desativado.</p>
                            </div>
                        )}
                    </section>
                )}
            </div>

            <div className="lg:col-span-2 space-y-4">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Utensils size={20} className="text-primary" /> 
                    Itens do Pedido 
                    <span className="ml-auto text-sm font-medium text-slate-400">{order.items.length} itens</span>
                </h3>
                
                <div className="space-y-3">
                    {order.items.map((item: any) => (
                        <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-start gap-4 hover:shadow-md transition-all">
                            <div className="bg-slate-100 text-slate-900 w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0">
                                {item.quantity}x
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between">
                                    <h4 className="font-bold text-slate-900">{item.product.name}</h4>
                                    <span className="font-bold text-slate-900">R$ {(item.quantity * item.priceAtTime).toFixed(2).replace('.', ',')}</span>
                                </div>
                                {item.observation && (
                                    <p className="text-xs text-amber-600 bg-amber-50 inline-block px-2 py-1 rounded-md mt-2 font-medium">
                                        Obs: {item.observation}
                                    </p>
                                )}
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {item.sizeJson && <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-lg font-black uppercase">Tam: {JSON.parse(item.sizeJson).name}</span>}
                                    {item.flavorsJson && JSON.parse(item.flavorsJson).map((flavor: any, i: number) => <span key={i} className="text-[10px] bg-orange-50 text-orange-600 border border-orange-100 px-2 py-0.5 rounded-lg font-black uppercase">Sabor: {flavor.name}</span>)}
                                    {item.addonsJson && JSON.parse(item.addonsJson).map((addon: any, i: number) => <span key={i} className="text-[10px] bg-slate-50 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-lg font-bold">+ {addon.name}</span>)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <div className="p-6 border-t bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Ações Rápidas</span>
                <span className="text-sm font-medium text-slate-600">Mudar status para:</span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
                {onStatusChange && STATUS_OPTIONS.map((status) => {
                    const isActive = order.status === status.value;
                    return (
                        <button
                            key={status.value}
                            onClick={() => onStatusChange(order.id, status.value)}
                            disabled={isActive}
                            className={cn(
                                "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border-2",
                                isActive ? cn(status.bg, status.color, status.border, "opacity-100") : "bg-white border-slate-200 text-slate-400 hover:border-slate-900 hover:text-slate-900"
                            )}
                        >
                            <status.icon size={16} />
                            {status.label}
                        </button>
                    );
                })}
            </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;
