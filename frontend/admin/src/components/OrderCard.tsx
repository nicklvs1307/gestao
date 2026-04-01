import React, { useState, useEffect, useCallback, memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Order } from '@/types/index.ts';
import { getSettings, markOrderAsPrinted } from '../services/api';
import { printOrder } from '../services/printing';
import { format, differenceInMinutes, differenceInDays, differenceInHours } from 'date-fns';
import { Clock, Utensils, Truck, MapPin, Printer, Loader2, Phone, ChevronRight, Eye, CreditCard, CheckCircle, ShoppingBag } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Card } from './ui/Card';

// Isolated timer component - only this re-renders every minute
const OrderTimer = memo(({ createdAt, status }: { createdAt: string; status: string }) => {
  const [timeElapsedStr, setTimeElapsedStr] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const created = new Date(createdAt);
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
  }, [createdAt]);

  return (
    <div className={cn(
      "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-tight shadow-sm",
      status === 'PENDING' ? "bg-rose-500 text-white animate-pulse" : "bg-muted text-muted-foreground"
    )}>
      <Clock size={10} /> {timeElapsedStr}
    </div>
  );
});
OrderTimer.displayName = 'OrderTimer';

interface OrderCardProps {
  order: Order;
  onOpenDetails: (order: Order) => void;
  isSelected?: boolean;
  onSelect?: () => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
}

const OrderCard: React.FC<OrderCardProps> = memo(({ order, onOpenDetails, isSelected, onSelect, onStatusChange }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: order.id });
  const [isPrinting, setIsPrinting] = useState(false);

  const handleQuickPrint = useCallback(async (e: React.MouseEvent) => {
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
  }, [order]);

  const handleAdvance = useCallback(async (e: React.MouseEvent) => {
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
  }, [order.id, order.status, onStatusChange]);

  const handleOpenDetails = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenDetails(order);
  }, [order, onOpenDetails]);

  const handleSelect = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.();
  }, [onSelect]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 100 : 'auto' as const,
  };

  const deliveryData = order.deliveryOrder;
  const isDelivery = order.orderType === 'DELIVERY' || !!deliveryData;
  const isPickup = deliveryData?.deliveryType === 'pickup' || deliveryData?.deliveryType === 'retirada';
  const orderTotal = order.total + (order.deliveryOrder?.deliveryFee || 0);

  return (
    <div ref={setNodeRef} style={style}>
      <Card 
        className={cn(
          "group relative flex flex-col gap-2 transition-shadow duration-200",
          isDragging ? "shadow-2xl ring-2 ring-orange-200" : "hover:shadow-md hover:border-orange-500/30",
          isSelected ? "border-orange-500 bg-orange-50/30" : "bg-white",
          order.status === 'PENDING' && !isSelected && "border-rose-100 bg-rose-50/30"
        )}
        noPadding
      >
        {/* Header: Checkbox, ID e Timer */}
        <div className="flex justify-between items-start px-3.5 pt-3 pb-1">
            <div className="flex items-center gap-2">
                <button 
                  onClick={handleSelect}
                  aria-label={isSelected ? "Desselecionar pedido" : "Selecionar pedido"}
                  className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0",
                      isSelected ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-200" : "bg-white border-slate-200 hover:border-slate-400"
                  )}
                >
                  {isSelected && <CheckCircle size={10} strokeWidth={3} />}
                </button>
                <div>
                  <span className="block text-sm font-black text-slate-900 leading-tight italic">
                    #{order.dailyOrderNumber || '0'}
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate block max-w-[120px]">
                    {deliveryData?.name || order.customerName || 'Consumidor'}
                  </span>
                </div>
            </div>
            <OrderTimer createdAt={order.createdAt} status={order.status} />
        </div>

        {/* Info: Entrega */}
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing px-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "p-1 rounded-md",
                isDelivery 
                  ? (isPickup ? "text-blue-500 bg-blue-50" : "text-rose-500 bg-rose-50") 
                  : "text-emerald-500 bg-emerald-50"
              )}>
                  {!isDelivery ? <Utensils size={12} /> : (isPickup ? <ShoppingBag size={12} /> : <Truck size={12} />)}
              </div>
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider italic">
                {isPickup ? 'Retirada' : 'Entrega'}
              </span>
              {deliveryData?.phone && (
                <span className="text-[8px] font-bold text-slate-400 ml-auto flex items-center gap-0.5">
                  <Phone size={8} /> {deliveryData.phone}
                </span>
              )}
            </div>
            
            {isDelivery && !isPickup && deliveryData?.address && (
                <div className="p-1.5 bg-slate-50 rounded-md border border-slate-100/50">
                  <div className="flex items-start gap-1 text-[8px] font-medium text-slate-500 leading-tight">
                      <MapPin size={9} className="text-orange-500 shrink-0 mt-px" />
                      <span className="line-clamp-1 uppercase">{deliveryData.address}</span>
                  </div>
                </div>
            )}

            {/* Itens do Pedido */}
            <div className="space-y-0.5">
                {Array.isArray(order.items) && order.items.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[10px] text-slate-500">
                        <span className="truncate pr-2"><b className="text-orange-500 font-black">{item.quantity}x</b> {item.product?.name}</span>
                        <span className="shrink-0 text-slate-400 font-bold">R$ {(item.priceAtTime * item.quantity).toFixed(2)}</span>
                    </div>
                ))}
                {Array.isArray(order.items) && order.items.length > 2 && (
                    <p className="text-[8px] font-bold text-slate-300 uppercase">+ {order.items.length - 2} itens...</p>
                )}
            </div>

            {/* Financeiro */}
            <div className="flex justify-between items-center py-1 border-t border-slate-50">
                <div className="flex items-center gap-1">
                  <CreditCard size={10} className="text-slate-300" />
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[90px] italic">
                    {deliveryData?.paymentMethod || 'PENDENTE'}
                  </span>
                </div>
                <span className="text-sm font-black text-slate-900 italic tracking-tighter">
                  R$ {orderTotal.toFixed(2).replace('.', ',')}
                </span>
            </div>
        </div>

        {/* Footer: Ações */}
        <div className="flex gap-1.5 p-2 bg-slate-50/50 rounded-b-2xl border-t border-slate-100">
            <button 
              onClick={handleQuickPrint}
              disabled={isPrinting}
              aria-label="Imprimir pedido"
              className="h-8 w-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-orange-600 hover:border-orange-200 transition-all"
            >
              {isPrinting ? <Loader2 size={12} className="animate-spin" /> : <Printer size={12} />}
            </button>
            
            <button 
              onClick={handleOpenDetails}
              className="flex-1 h-8 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all text-slate-600"
            >
              <Eye size={11} /> Detalhes
            </button>

            <button 
              onClick={handleAdvance}
              aria-label="Avançar status"
              className="h-8 w-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center justify-center transition-all shadow-sm"
            >
              <ChevronRight size={14} strokeWidth={3} />
            </button>
        </div>
      </Card>
    </div>
  );
}, (prev, next) => {
  // Custom comparator: only re-render if these specific fields change
  return (
    prev.order.id === next.order.id &&
    prev.order.status === next.order.status &&
    prev.order.updatedAt === next.order.updatedAt &&
    prev.order.total === next.order.total &&
    prev.isSelected === next.isSelected
  );
});
OrderCard.displayName = 'OrderCard';

export default OrderCard;
