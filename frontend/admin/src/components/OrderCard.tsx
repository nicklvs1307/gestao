import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Order } from '@/types/index.ts';
import { getSettings, markOrderAsPrinted } from '../services/api';
import { printOrder } from '../services/printing';
import { format, differenceInMinutes, differenceInDays, differenceInHours } from 'date-fns';
import { Clock, Utensils, Truck, MapPin, Printer, Loader2, Phone, ChevronRight, Eye, CreditCard } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface OrderCardProps {
  order: Order;
  onOpenDetails: (order: Order) => void;
  isSelected?: boolean;
  onSelect?: () => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onOpenDetails, isSelected, onSelect, onStatusChange }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: order.id });
  const [timeElapsedStr, setTimeElapsedStr] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const created = new Date(order.createdAt);
      const days = differenceInDays(now, created);
      const hours = differenceInHours(now, created) % 24;
      const mins = differenceInMinutes(now, created) % 60;
      
      let str = '';
      if (days > 0) str += `${days}d `;
      if (hours > 0 || days > 0) str += `${hours}h`;
      str += `${mins}m`;
      setTimeElapsedStr(str);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  const handleQuickPrint = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
        const printerConfig = JSON.parse(localStorage.getItem('printer_config') || '{}');
        await printOrder(order, printerConfig, undefined, restaurantInfo);
        await markOrderAsPrinted(order.id);
        toast.success("Impressão enviada!");
    } catch (error) {
        console.error("Erro ao imprimir:", error);
        toast.error("Falha na impressão.");
    } finally {
        setIsPrinting(false);
    }
  };

  const handleAdvance = async (e: React.MouseEvent) => {
      e.stopPropagation();
      const statusFlow: Record<string, string> = {
          'PENDING': 'PREPARING',
          'PREPARING': 'READY',
          'READY': 'SHIPPED',
          'SHIPPED': 'DELIVERED',
          'DELIVERED': 'COMPLETED'
      };
      const nextStatus = statusFlow[order.status];
      if (nextStatus && onStatusChange) {
          onStatusChange(order.id, nextStatus);
      }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };

  const isDelivery = order.orderType === 'DELIVERY';
  const deliveryData = order.deliveryOrder;
  const isPickup = deliveryData?.deliveryType === 'pickup' || deliveryData?.deliveryType === 'retirada';

  return (
    <div ref={setNodeRef} style={style}>
      <Card 
        className={cn(
          "group relative p-4 flex flex-col gap-3 transition-all",
          isDragging ? "shadow-2xl ring-2 ring-orange-500 scale-105 border-orange-500" : "hover:border-orange-500/30",
          isSelected ? "border-orange-500 bg-orange-50/30" : "bg-white",
          order.status === 'PENDING' && !isSelected && "border-rose-100 bg-rose-50/30"
        )}
        noPadding
      >
        {/* Top: Checkbox, ID e Timer */}
        <div className="flex justify-between items-start px-4 pt-4">
            <div className="flex items-center gap-3">
                <button 
                  onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
                  className={cn(
                      "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                      isSelected ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-200" : "bg-white border-slate-200"
                  )}
                >
                  {isSelected && <CheckCircle size={12} strokeWidth={4} />}
                </button>
                <div>
                  <span className="block font-black text-[11px] italic text-slate-900 leading-none uppercase">
                    #{order.dailyOrderNumber || '0'} - {deliveryData?.name || order.customerName || 'Consumidor'}
                  </span>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    ID: {order.id.slice(-6).toUpperCase()}
                  </span>
                </div>
            </div>
            <div className="text-right">
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter shadow-sm",
                  order.status === 'PENDING' ? "bg-rose-500 text-white animate-pulse" : "bg-slate-100 text-slate-500"
                )}>
                  <Clock size={10} /> {timeElapsedStr}
                </div>
            </div>
        </div>

        {/* Middle: Informações de Entrega/Mesa */}
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing px-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded-lg border", isDelivery ? (isPickup ? "text-blue-500 bg-blue-50 border-blue-100" : "text-rose-500 bg-rose-50 border-rose-100") : "text-emerald-500 bg-emerald-50 border-emerald-100")}>
                    {!isDelivery ? <Utensils size={14} /> : (isPickup ? <ShoppingBag size={14} /> : <Truck size={14} />)}
                </div>
                <span className="text-[9px] font-black text-slate-600 uppercase italic">
                  {!isDelivery ? `Mesa ${order.tableNumber}` : (isPickup ? 'Retirada Balcão' : 'Entrega')}
                </span>
              </div>
              {deliveryData?.phone && (
                <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                  <Phone size={10} /> {deliveryData.phone}
                </div>
              )}
            </div>
            
            {isDelivery && !isPickup && deliveryData?.address && (
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100/50">
                  <div className="flex items-start gap-2 text-[9px] font-bold text-slate-500 leading-tight">
                      <MapPin size={12} className="text-orange-500 shrink-0" />
                      <span className="line-clamp-2 uppercase italic">{deliveryData.address}</span>
                  </div>
                </div>
            )}

            {isDelivery && isPickup && (
                <div className="p-2 bg-blue-50/50 rounded-xl border border-blue-100/50 text-center">
                    <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Aguardando Retirada</span>
                </div>
            )}

            {/* Financeiro */}
            <div className="flex justify-between items-center py-1">
                <div className="flex items-center gap-2">
                  <CreditCard size={12} className="text-slate-300" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {deliveryData?.paymentMethod || 'Pagamento Pendente'}
                  </span>
                </div>
                <span className="font-black text-sm italic text-slate-900 tracking-tighter">
                  R$ {order.total.toFixed(2).replace('.', ',')}
                </span>
            </div>
        </div>

        {/* Footer: Ações */}
        <div className="flex gap-2 p-2 bg-slate-50/50 rounded-b-2xl border-t border-slate-100">
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleQuickPrint}
              disabled={isPrinting}
              className="h-10 w-10 bg-white border-slate-200"
            >
              {isPrinting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
            </Button>
            
            <Button 
              variant="secondary"
              onClick={(e) => { e.stopPropagation(); onOpenDetails(order); }}
              className="flex-1 h-10 text-[10px] uppercase tracking-widest gap-2"
            >
              <Eye size={14} /> Detalhes
            </Button>

            <Button 
              onClick={handleAdvance}
              className="h-10 px-3 bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100"
            >
              <ChevronRight size={18} strokeWidth={3} />
            </Button>
        </div>
      </Card>
    </div>
  );
};

export default OrderCard;