import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Order } from '@/types/index.ts';
import { getSettings, markOrderAsPrinted } from '../services/api';
import { printOrder } from '../services/printing';
import { format, differenceInMinutes, differenceInDays, differenceInHours } from 'date-fns';
import { Clock, Utensils, Truck, MapPin, Printer, Loader2, Phone, ChevronRight, Eye, CreditCard, CheckCircle, ShoppingBag } from 'lucide-react';
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

  const deliveryData = order.deliveryOrder;
  const isDelivery = order.orderType === 'DELIVERY' || !!deliveryData;
  const isPickup = deliveryData?.deliveryType === 'pickup' || deliveryData?.deliveryType === 'retirada';

  return (
    <div ref={setNodeRef} style={style}>
      <Card 
        className={cn(
          "group relative flex flex-col gap-2 transition-all",
          isDragging ? "shadow-2xl ring-2 ring-orange-50" : "hover:border-orange-500/30",
          isSelected ? "border-orange-500 bg-orange-50/30" : "bg-white",
          order.status === 'PENDING' && !isSelected && "border-rose-100 bg-rose-50/30"
        )}
        noPadding
      >
        {/* Top: Checkbox, ID e Timer */}
        <div className="flex justify-between items-start px-3 pt-3">
            <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
                  className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
                      isSelected ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-200" : "bg-white border-slate-200"
                  )}
                >
                  {isSelected && <CheckCircle size={10} strokeWidth={4} />}
                </button>
                <div>
                  <span className="block font-black text-[10px] italic text-slate-900 leading-none uppercase">
                    #{order.dailyOrderNumber || '0'} - {deliveryData?.name || order.customerName || 'Consumidor'}
                  </span>
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">
                    ID: {order.id.slice(-6).toUpperCase()}
                  </span>
                </div>
            </div>
            <div className="text-right">
                <div className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter shadow-sm",
                  order.status === 'PENDING' ? "bg-rose-500 text-white animate-pulse" : "bg-slate-100 text-slate-500"
                )}>
                  <Clock size={8} /> {timeElapsedStr}
                </div>
            </div>
        </div>

        {/* Middle: Informações de Entrega/Mesa */}
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing px-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className={cn("p-1 rounded border", isDelivery ? (isPickup ? "text-blue-500 bg-blue-50 border-blue-100" : "text-rose-500 bg-rose-50 border-rose-100") : "text-emerald-500 bg-emerald-50 border-emerald-100")}>
                    {!isDelivery ? <Utensils size={12} /> : (isPickup ? <ShoppingBag size={12} /> : <Truck size={12} />)}
                </div>
                <span className="text-[8px] font-black text-slate-600 uppercase italic">
                  {!isDelivery ? `Mesa ${order.tableNumber || '?'}` : (isPickup ? 'Retirada' : 'Entrega')}
                </span>
              </div>
              {deliveryData?.phone && (
                <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400">
                  <Phone size={8} /> {deliveryData.phone}
                </div>
              )}
            </div>
            
            {isDelivery && !isPickup && deliveryData?.address && (
                <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100/50">
                  <div className="flex items-start gap-1.5 text-[8px] font-bold text-slate-500 leading-tight">
                      <MapPin size={10} className="text-orange-500 shrink-0" />
                      <span className="line-clamp-1 uppercase italic">{deliveryData.address}</span>
                  </div>
                </div>
            )}

            {/* Listagem de Itens Compacta */}
            <div className="px-1 space-y-0.5">
                {Array.isArray(order.items) && order.items.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[8px] font-bold text-slate-500">
                        <span className="truncate pr-2"><b className="text-orange-500">{item.quantity}x</b> {item.product?.name}</span>
                        <span className="shrink-0 text-slate-400 italic">R$ {(item.priceAtTime * item.quantity).toFixed(2)}</span>
                    </div>
                ))}
                {Array.isArray(order.items) && order.items.length > 2 && (
                    <p className="text-[7px] font-black text-slate-300 uppercase italic">+ {order.items.length - 2} itens...</p>
                )}
            </div>

            {/* Financeiro */}
            <div className="flex justify-between items-center py-0.5 px-1">
                <div className="flex items-center gap-1.5">
                  <CreditCard size={10} className="text-slate-300" />
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[80px]">
                    {deliveryData?.paymentMethod || 'PENDENTE'}
                  </span>
                </div>
                <span className="font-black text-xs italic text-slate-900 tracking-tighter">
                  R$ {(order.total + (order.deliveryOrder?.deliveryFee || 0)).toFixed(2).replace('.', ',')}
                </span>
            </div>
        </div>

        {/* Footer: Ações */}
        <div className="flex gap-1 p-1.5 bg-slate-50/50 rounded-b-2xl border-t border-slate-100">
            <button 
              onClick={handleQuickPrint}
              disabled={isPrinting}
              className="h-8 w-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-orange-600 transition-colors"
            >
              {isPrinting ? <Loader2 size={12} className="animate-spin" /> : <Printer size={12} />}
            </button>
            
            <button 
              onClick={(e) => { e.stopPropagation(); onOpenDetails(order); }}
              className="flex-1 h-8 bg-slate-200/50 hover:bg-slate-200 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all"
            >
              <Eye size={10} /> Detalhes
            </button>

            <button 
              onClick={handleAdvance}
              className="h-8 px-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center justify-center transition-all shadow-sm"
            >
              <ChevronRight size={14} strokeWidth={3} />
            </button>
        </div>
      </Card>
    </div>
  );
};

export default OrderCard;