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
  DollarSign, Receipt, ArrowRight, ShieldCheck, Hash, Wallet, Smartphone, Landmark
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
    { value: 'PENDING', label: 'Pendente', icon: Circle, color: 'text-amber-500', bg: 'bg-amber-500', border: 'border-amber-200', lightBg: 'bg-amber-50' },
    { value: 'PREPARING', label: 'Produção', icon: PlayCircle, color: 'text-blue-500', bg: 'bg-blue-500', border: 'border-blue-200', lightBg: 'bg-blue-50' },
    { value: 'READY', label: 'Pronto', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500', border: 'border-emerald-200', lightBg: 'bg-emerald-50' },
    { value: 'SHIPPED', label: 'Em Rota', icon: Truck, color: 'text-indigo-500', bg: 'bg-indigo-500', border: 'border-indigo-200', lightBg: 'bg-indigo-50' },
    { value: 'DELIVERED', label: 'Entregue', icon: Package, color: 'text-slate-500', bg: 'bg-slate-500', border: 'border-slate-200', lightBg: 'bg-slate-50' },
    { value: 'COMPLETED', label: 'Finalizado', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-600', border: 'border-emerald-200', lightBg: 'bg-emerald-50' },
    { value: 'CANCELED', label: 'Cancelado', icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-500', border: 'border-rose-200', lightBg: 'bg-rose-50' },
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
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-6xl h-[95vh] lg:h-auto lg:max-h-[85vh] flex flex-col bg-[#F8FAFC] rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20">
        
        {/* HEADER DE ALTO NÍVEL */}
        <header className="h-20 bg-slate-900 text-white px-8 flex items-center justify-between shrink-0 z-10 shadow-xl">
          <div className="flex items-center gap-6">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3", currentStatus.bg)}>
                <currentStatus.icon size={24} className="text-white" strokeWidth={3} />
            </div>
            <div>
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
                        PEDIDO #{order.dailyOrderNumber || order.id.slice(-4).toUpperCase()}
                    </h2>
                    <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm", currentStatus.lightBg, currentStatus.color, currentStatus.border)}>
                        {currentStatus.label}
                    </div>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                    <Clock size={12} className="text-blue-500" /> Aberto às {format(new Date(order.createdAt), 'HH:mm')} • {format(new Date(order.createdAt), 'dd MMM')}
                </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
                onClick={handlePrint} 
                disabled={isPrinting} 
                className="flex items-center gap-3 bg-white/5 text-white h-12 px-6 rounded-2xl hover:bg-white/10 transition-all border border-white/10 font-black text-[10px] uppercase tracking-widest"
            >
                {isPrinting ? <Loader2 className="animate-spin" size={16} /> : <Printer size={16} />} 
                IMPRIMIR
            </button>
            <button onClick={onClose} className="w-12 h-12 bg-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white rounded-2xl transition-all flex items-center justify-center"><X size={24} /></button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
            {/* PAINEL LATERAL: GESTÃO E FINANCEIRO */}
            <aside className="w-[380px] border-r border-slate-200 bg-white flex flex-col shrink-0">
                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    
                    {/* ORIGEM: MESA OU CLIENTE */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Origem</h3>
                            <div className="h-px flex-1 bg-slate-100 ml-4" />
                        </div>
                        
                        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-110 transition-transform"><ShoppingCart size={100} /></div>
                            
                            {isDelivery ? (
                                <div className="space-y-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-2xl border border-slate-200 flex items-center justify-center text-slate-900 shadow-sm"><User size={24} strokeWidth={2.5}/></div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-slate-900 uppercase italic truncate tracking-tight">{order.deliveryOrder?.name || 'Consumidor'}</p>
                                            <p className="text-xs font-bold text-blue-600 flex items-center gap-1.5 mt-0.5"><Phone size={12}/> {order.deliveryOrder?.phone || 'Sem Telefone'}</p>
                                        </div>
                                    </div>
                                    {order.deliveryOrder?.address && (
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={12} className="text-rose-500"/> Local de Entrega</p>
                                            <p className="text-xs font-bold text-slate-600 uppercase italic leading-relaxed bg-white/60 p-4 rounded-2xl border border-white shadow-sm">{order.deliveryOrder.address}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center shadow-2xl transform -rotate-6"><Utensils size={32} /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Serviço Local</p>
                                        <p className="text-4xl font-black text-slate-900 italic tracking-tighter leading-none">MESA {order.tableNumber}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* LOGÍSTICA DE ENTREGA */}
                    {isDelivery && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Logística</h3>
                                <div className="h-px flex-1 bg-slate-100 ml-4" />
                            </div>
                            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-3xl space-y-4">
                                <div className="flex gap-2 p-1.5 bg-white border border-blue-100 rounded-2xl shadow-inner">
                                    <button onClick={() => handleUpdateDeliveryType('pickup')} className={cn("flex-1 h-10 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2", deliveryType === 'pickup' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50")}>
                                        <ShoppingBag size={14} /> Balcão
                                    </button>
                                    <button onClick={() => handleUpdateDeliveryType('delivery')} className={cn("flex-1 h-10 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2", deliveryType === 'delivery' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50")}>
                                        <Truck size={14} /> Entrega
                                    </button>
                                </div>
                                {deliveryType === 'delivery' && (
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-blue-600 uppercase ml-2 tracking-widest">Atribuir Motoboy</label>
                                        <select className="w-full bg-white border-2 border-blue-100 rounded-2xl h-12 px-4 text-xs font-black text-slate-900 outline-none shadow-sm focus:border-blue-500 appearance-none cursor-pointer" value={selectedDriver} onChange={(e) => handleAssignDriver(e.target.value)}>
                                            <option value="">Aguardando seleção...</option>
                                            {drivers.map(d => <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* BALANCE FINANCEIRO */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Financeiro</h3>
                            <div className="h-px flex-1 bg-slate-100 ml-4" />
                        </div>
                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute -bottom-6 -right-6 opacity-[0.05] group-hover:rotate-12 transition-transform duration-500"><Wallet size={120} /></div>
                            <div className="space-y-6 relative z-10">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        <span>Consumo Base</span>
                                        <span className="text-white">R$ {order.total.toFixed(2)}</span>
                                    </div>
                                    {isDelivery && (
                                        <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            <span>Frete Logístico</span>
                                            <span className="text-blue-400">+ R$ {order.deliveryOrder?.deliveryFee || '0,00'}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                                    <div>
                                        <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-2">Total Final</p>
                                        <h3 className="text-4xl font-black text-white italic tracking-tighter leading-none">
                                            R$ {(order.total + (order.deliveryOrder?.deliveryFee || 0)).toFixed(2).replace('.', ',')}
                                        </h3>
                                    </div>
                                    <div className={cn("px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-lg", isPaid ? "bg-emerald-500 text-white border-transparent" : "bg-rose-500 text-white border-transparent animate-pulse")}>
                                        {isPaid ? 'PAGO' : 'PENDENTE'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ÁREA DE AÇÃO DE PAGAMENTO (RENOVADA) */}
                <div className="p-6 bg-slate-50 border-t border-slate-200 shrink-0">
                    {!isPaid ? (
                        <div className="space-y-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center italic">Pagamento necessário para conclusão</p>
                            <Button 
                                onClick={() => navigate(`/pos/checkout/${order.id}`)}
                                fullWidth 
                                className="h-16 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase italic tracking-[0.2em] text-xs rounded-2xl shadow-xl shadow-blue-100 flex items-center justify-center gap-3 group active:scale-95 transition-all"
                            >
                                IR PARA PAGAMENTO <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-center gap-2 text-emerald-600">
                                <ShieldCheck size={20} />
                                <span className="text-xs font-black uppercase tracking-widest">Pagamento Confirmado</span>
                            </div>
                            {order.status === 'COMPLETED' ? (
                                <button onClick={handleEmitInvoice} disabled={isEmitting} className="w-full h-14 bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white rounded-2xl flex items-center justify-center gap-3 transition-all font-black uppercase tracking-widest text-[10px] shadow-sm">
                                    {isEmitting ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                                    {order.invoice ? 'VISUALIZAR NF-e' : 'EMITIR NOTA FISCAL'}
                                </button>
                            ) : (
                                <p className="text-[9px] font-bold text-slate-400 text-center uppercase">Aguardando fechamento do pedido</p>
                            )}
                        </div>
                    )}
                </div>
            </aside>

            {/* ÁREA PRINCIPAL: CONTEÚDO DO PEDIDO */}
            <main className="flex-1 flex flex-col min-w-0 bg-white shadow-inner">
                <div className="h-16 border-b border-slate-200 flex items-center justify-between px-8 bg-white shrink-0">
                    <h3 className="text-xs font-black text-slate-900 uppercase italic tracking-[0.2em] flex items-center gap-3">
                        <List size={18} className="text-blue-500" /> CONTEÚDO DO PEDIDO
                    </h3>
                    <div className="flex items-center gap-3">
                        <span className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase italic shadow-lg">
                            {(Array.isArray(order.items) ? order.items : []).reduce((acc, i) => acc + i.quantity, 0)} ITENS
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30">
                    <div className="grid grid-cols-1 gap-4 max-w-4xl mx-auto">
                        {order.items.map((item: any) => (
                            <div key={item.id} className="bg-white border border-slate-200 rounded-[2rem] p-6 flex items-start gap-6 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/5 transition-all group relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-200 group-hover:bg-blue-600 transition-colors" />
                                
                                <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-2xl italic shadow-2xl shrink-0 group-hover:scale-110 transition-transform">
                                    {item.quantity}
                                </div>
                                
                                <div className="flex-1 min-w-0 pr-24">
                                    <h4 className="text-lg font-black text-slate-900 uppercase italic tracking-tight mb-3 group-hover:text-blue-600 transition-colors">
                                        {item.product.name}
                                    </h4>
                                    
                                    <div className="flex flex-wrap gap-2">
                                        {item.sizeJson && (
                                            <span className="text-[9px] bg-slate-100 text-slate-600 px-3 py-1 rounded-xl font-black uppercase border border-slate-200 shadow-sm">
                                                {JSON.parse(item.sizeJson).name}
                                            </span>
                                        )}
                                        {item.flavorsJson && JSON.parse(item.flavorsJson).map((f: any, i: number) => (
                                            <span key={i} className="text-[9px] bg-blue-50 text-blue-700 px-3 py-1 rounded-xl font-black uppercase border border-blue-100 shadow-sm">
                                                {f.name}
                                            </span>
                                        ))}
                                        {item.addonsJson && JSON.parse(item.addonsJson).map((a: any, i: number) => (
                                            <span key={i} className="text-[9px] bg-emerald-50 text-emerald-700 px-3 py-1 rounded-xl font-black uppercase border border-emerald-100 shadow-sm">
                                                + {a.name}
                                            </span>
                                        ))}
                                    </div>
                                    
                                    {item.observations && (
                                        <div className="mt-4 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-2xl">
                                            <p className="text-[10px] font-bold text-amber-800 italic flex items-center gap-2 uppercase tracking-tight">
                                                <Info size={14} /> OBS: {item.observations}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="text-right shrink-0">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Subtotal</p>
                                    <p className="text-xl font-black text-slate-900 italic tracking-tighter">R$ {(item.quantity * item.priceAtTime).toFixed(2)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RODAPÉ DE STATUS TIPO "CONTROL TOWER" */}
                <footer className="p-6 bg-white border-t border-slate-200 flex flex-wrap justify-center items-center gap-3 shrink-0 shadow-2xl z-10">
                    {onStatusChange && STATUS_OPTIONS.map((status) => {
                        const isActive = order.status === status.value;
                        const isDisabled = (status.value === 'COMPLETED' && !isPaid);
                        
                        return (
                            <button 
                                key={status.value} 
                                onClick={() => onStatusChange(order.id, status.value)} 
                                disabled={isActive || isDisabled}
                                className={cn(
                                    "flex items-center gap-3 h-12 px-6 rounded-2xl text-[10px] uppercase tracking-widest italic font-black transition-all border shadow-sm group",
                                    isActive 
                                        ? cn(status.lightBg, status.color, status.border, "scale-105 z-10 shadow-lg ring-4 ring-offset-2 ring-slate-50") 
                                        : isDisabled
                                            ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed grayscale"
                                            : "bg-white border-slate-200 text-slate-400 hover:border-slate-900 hover:text-slate-900 active:scale-95"
                                )}
                            >
                                <status.icon size={16} strokeWidth={isActive ? 3 : 2} className={cn("transition-transform group-hover:scale-110", isActive && "animate-pulse")} /> 
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