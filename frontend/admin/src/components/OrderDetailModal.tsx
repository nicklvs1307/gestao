import React, { useState, useEffect } from 'react';
import type { Order } from '@/types/index.ts';
import { useNavigate } from 'react-router-dom';
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
  ShoppingBag, Bike, Utensils, Info, ChevronRight, User, Truck, List,
  DollarSign, Receipt, ArrowRight, ShieldCheck, Hash
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Button } from './ui/Button';

interface OrderDetailModalProps {
  onClose: () => void;
  order: Order;
  onStatusChange?: (orderId: string, newStatus: string) => void;
}

const STATUS_OPTIONS = [
    { value: 'PENDING', label: 'Pendente', icon: Circle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    { value: 'PREPARING', label: 'Produção', icon: PlayCircle, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { value: 'READY', label: 'Pronto', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { value: 'SHIPPED', label: 'Em Rota', icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    { value: 'DELIVERED', label: 'Entregue', icon: Package, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100' },
    { value: 'COMPLETED', label: 'Finalizado', icon: ShieldCheck, color: 'text-slate-900', bg: 'bg-slate-100', border: 'border-slate-200' },
    { value: 'CANCELED', label: 'Cancelado', icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
];

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ onClose, order, onStatusChange }) => {
  const navigate = useNavigate();
  
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
  const isPaid = order.status === 'COMPLETED' || (order.payments && order.payments.length > 0);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-2 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl h-[95vh] lg:h-auto lg:max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        
        {/* BARRA DE TÍTULO INDUSTRIAL */}
        <header className="h-14 bg-slate-900 text-white px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className={cn("p-2 rounded-lg border", currentStatus.bg, currentStatus.border, currentStatus.color)}>
                <currentStatus.icon size={18} strokeWidth={3} />
            </div>
            <div>
                <div className="flex items-center gap-3">
                    <h2 className="text-base font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
                        <Hash size={14} className="text-slate-500" /> {order.dailyOrderNumber || order.id.slice(-4).toUpperCase()}
                    </h2>
                    <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border shadow-sm", currentStatus.bg, currentStatus.color, currentStatus.border)}>
                        {currentStatus.label}
                    </span>
                </div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5 flex items-center gap-1.5">
                    <Clock size={10} /> Registrado às {format(new Date(order.createdAt), 'HH:mm')} • {format(new Date(order.createdAt), 'dd/MM')}
                </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
                onClick={handlePrint} 
                disabled={isPrinting} 
                className="flex items-center gap-2 bg-white/10 text-white h-9 px-4 rounded-lg hover:bg-white/20 transition-all active:scale-95 border border-white/10"
            >
                {isPrinting ? <Loader2 className="animate-spin" size={14} /> : <Printer size={14} />} 
                <span className="italic font-black text-[9px] uppercase tracking-widest">Imprimir</span>
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-white"><X size={24} /></button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden bg-slate-100/50">
            {/* PAINEL LATERAL: LOGÍSTICA E PAGAMENTO */}
            <aside className="w-[340px] border-r border-slate-200 bg-white flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                    {/* SEÇÃO: CLIENTE / MESA */}
                    <div className="space-y-3">
                        <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                            <User size={12} className="text-orange-500" /> Origem do Pedido
                        </h3>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-inner">
                            {isDelivery ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-orange-500 shadow-sm"><User size={18}/></div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-slate-900 uppercase italic truncate">{order.deliveryOrder?.name || 'Cliente Geral'}</p>
                                            <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><Phone size={10}/> {order.deliveryOrder?.phone || 'N/A'}</p>
                                        </div>
                                    </div>
                                    {order.deliveryOrder?.address && (
                                        <div className="pt-3 border-t border-slate-200">
                                            <p className="text-[8px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><MapPin size={8}/> Local de Entrega</p>
                                            <p className="text-[10px] font-bold text-slate-600 uppercase italic leading-tight bg-white p-2 rounded-lg border border-slate-100 shadow-sm">{order.deliveryOrder.address}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-100"><Utensils size={24} /></div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Serviço de Mesa</p>
                                        <p className="text-2xl font-black text-slate-900 italic tracking-tighter leading-none">MESA {order.tableNumber}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SEÇÃO: LOGÍSTICA (ENTREGA) */}
                    {isDelivery && (
                        <div className="space-y-3">
                            <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                <Truck size={12} className="text-blue-500" /> Gestão de Entrega
                            </h3>
                            <div className="bg-blue-50/30 border border-blue-100 p-3 rounded-xl space-y-3">
                                <div className="flex gap-1 p-1 bg-white border border-blue-100 rounded-lg">
                                    <button onClick={() => handleUpdateDeliveryType('pickup')} className={cn("flex-1 h-8 rounded-md text-[9px] font-black uppercase transition-all", deliveryType === 'pickup' ? "bg-blue-600 text-white shadow-md" : "text-blue-400 hover:bg-blue-50")}>Balcão</button>
                                    <button onClick={() => handleUpdateDeliveryType('delivery')} className={cn("flex-1 h-8 rounded-md text-[9px] font-black uppercase transition-all", deliveryType === 'delivery' ? "bg-blue-600 text-white shadow-md" : "text-blue-400 hover:bg-blue-50")}>Entrega</button>
                                </div>
                                {deliveryType === 'delivery' && (
                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black text-blue-600 uppercase ml-1">Entregador Responsável</label>
                                        <select className="w-full bg-white border border-blue-200 rounded-lg h-10 px-3 text-[10px] font-black text-slate-700 outline-none shadow-sm focus:border-blue-500 appearance-none cursor-pointer" value={selectedDriver} onChange={(e) => handleAssignDriver(e.target.value)}>
                                            <option value="">AGUARDANDO...</option>
                                            {drivers.map(d => <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* SEÇÃO: FINANCEIRO ROBUSTO */}
                    <div className="space-y-3">
                        <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                            <Receipt size={12} className="text-emerald-600" /> Balanço Financeiro
                        </h3>
                        <div className="bg-slate-900 rounded-xl p-5 text-white shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform"><DollarSign size={60} /></div>
                            <div className="space-y-4 relative z-10">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                        <span>Consumo Itens</span>
                                        <span className="text-slate-300">R$ {order.total.toFixed(2)}</span>
                                    </div>
                                    {isDelivery && (
                                        <div className="flex justify-between items-center text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                            <span>Taxa Logística</span>
                                            <span className="text-blue-400">+ R$ {order.deliveryOrder?.deliveryFee || '0,00'}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                                    <div>
                                        <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Total Geral</p>
                                        <p className="text-3xl font-black text-white italic tracking-tighter leading-none">
                                            R$ {(order.total + (order.deliveryOrder?.deliveryFee || 0)).toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className={cn("px-2 py-1 rounded text-[8px] font-black uppercase shadow-sm border", isPaid ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse")}>
                                            {isPaid ? 'LIQUIDADO' : 'PENDENTE'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BOTÃO DE AÇÃO DE PAGAMENTO DESTAQUE */}
                {!isPaid && (
                    <div className="p-5 bg-slate-50 border-t border-slate-200">
                        <Button 
                            onClick={() => navigate(`/pos/checkout/${order.id}`)}
                            fullWidth 
                            size="lg" 
                            className="h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase italic tracking-widest text-[11px] shadow-lg shadow-emerald-900/20 group"
                        >
                            RECEBER E FINALIZAR <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </div>
                )}
                {order.status === 'COMPLETED' && (
                    <div className="p-5 bg-slate-50 border-t border-slate-200">
                        <button onClick={handleEmitInvoice} disabled={isEmitting} className="w-full h-12 bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white rounded-xl flex items-center justify-center gap-3 transition-all font-black uppercase tracking-widest text-[10px] shadow-sm">
                            {isEmitting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                            {order.invoice ? 'Visualizar NFC-e' : 'Emitir Nota Fiscal'}
                        </button>
                    </div>
                )}
            </aside>

            {/* ÁREA PRINCIPAL: ITENS E DETALHES TÉCNICOS */}
            <main className="flex-1 flex flex-col min-w-0 bg-white">
                <div className="h-12 border-b border-slate-200 flex items-center justify-between px-6 bg-white shrink-0">
                    <h3 className="text-[10px] font-black text-slate-900 uppercase italic tracking-widest flex items-center gap-2">
                        <List size={14} className="text-orange-500" /> Detalhamento do Pedido
                    </h3>
                    <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter">
                        {order.items.reduce((acc, i) => acc + i.quantity, 0)} Unidades • {order.items.length} SKUs
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/20">
                    <div className="grid grid-cols-1 gap-3">
                        {order.items.map((item: any) => (
                            <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-start gap-4 hover:border-orange-500/50 hover:shadow-md transition-all group relative overflow-hidden shadow-sm">
                                <div className="absolute top-0 left-0 w-1 h-full bg-slate-900 group-hover:bg-orange-500 transition-colors" />
                                <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-lg italic shadow-lg shrink-0 scale-90 group-hover:scale-100 transition-transform">
                                    {item.quantity}
                                </div>
                                <div className="flex-1 min-w-0 pr-24">
                                    <h4 className="text-sm font-black text-slate-900 uppercase italic tracking-tight leading-none mb-2 group-hover:text-orange-600 transition-colors">
                                        {item.product.name}
                                    </h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {item.sizeJson && <span className="text-[8px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg font-black uppercase border border-blue-100">TAM: {JSON.parse(item.sizeJson).name}</span>}
                                        {item.flavorsJson && JSON.parse(item.flavorsJson).map((f: any, i: number) => <span key={i} className="text-[8px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded-lg font-black uppercase border border-orange-100">{f.name}</span>)}
                                        {item.addonsJson && JSON.parse(item.addonsJson).map((a: any, i: number) => <span key={i} className="text-[8px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded-lg font-black uppercase border border-slate-100 shadow-sm">+ {a.name}</span>)}
                                    </div>
                                    {item.observations && (
                                        <div className="mt-3 p-2.5 bg-orange-50 rounded-lg border border-orange-100">
                                            <p className="text-[9px] font-bold text-orange-700 italic flex items-center gap-1.5 uppercase leading-tight">
                                                <Info size={12} /> {item.observations}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Subtotal</p>
                                    <p className="text-lg font-black text-slate-900 italic tracking-tighter">R$ {(item.quantity * item.priceAtTime).toFixed(2)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CONTROLES DE STATUS INDUSTRIAL NO RODAPÉ */}
                <footer className="p-4 bg-white border-t border-slate-200 flex flex-wrap justify-center items-center gap-2 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
                    {onStatusChange && STATUS_OPTIONS.map((status) => {
                        const isActive = order.status === status.value;
                        const isDisabled = (status.value === 'COMPLETED' && !isPaid);
                        
                        return (
                            <button 
                                key={status.value} 
                                onClick={() => onStatusChange(order.id, status.value)} 
                                disabled={isActive || isDisabled}
                                className={cn(
                                    "flex items-center gap-2 h-10 px-4 rounded-xl text-[9px] uppercase tracking-widest italic font-black transition-all border shadow-sm",
                                    isActive 
                                        ? cn(status.bg, status.color, status.border, "scale-105 z-10 shadow-md ring-2 ring-offset-2", status.value === 'CANCELED' ? "ring-rose-100" : "ring-slate-100") 
                                        : isDisabled
                                            ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed grayscale"
                                            : "bg-white border-slate-200 text-slate-500 hover:border-slate-900 hover:text-slate-900 hover:shadow-md active:scale-95"
                                )}
                            >
                                <status.icon size={14} strokeWidth={isActive ? 3 : 2} /> 
                                {status.label}
                            </button>
                        );
                    })}
                </footer>
            </main>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;