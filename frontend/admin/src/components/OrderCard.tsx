import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Order } from '@/types/index.ts';
import { updateOrderStatus, getSettings, markOrderAsPrinted } from '../services/api';
import { printOrder } from '../services/printing';
import { format, differenceInMinutes, differenceInDays, differenceInHours } from 'date-fns';
import { Clock, Utensils, Truck, MapPin, Printer, Loader2, CheckCircle2, Phone, ChevronRight, Eye } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

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

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "group relative p-3 rounded-xl border transition-all select-none flex flex-col gap-2",
        isDragging ? "shadow-2xl ring-2 ring-primary border-primary z-50 scale-105" : "shadow-sm border-slate-200 hover:border-primary/40",
        isSelected ? "border-primary bg-primary/5 shadow-md" : "bg-white text-slate-900",
        order.status === 'PENDING' && "bg-rose-50/50 border-rose-100"
      )}
    >
      {/* Header do Card */}
      <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
                className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center transition-all",
                    isSelected ? "bg-primary border-primary text-white" : "bg-white border-slate-300"
                )}
              >
                {isSelected && <CheckCircle2 size={10} strokeWidth={4} />}
              </button>
              <span className="font-black text-xs italic text-slate-700">
                  {order.dailyOrderNumber || '0'} - {deliveryData?.name || order.customerName || 'Cliente Final'}
              </span>
          </div>
          <div className="text-right">
              <p className="text-[8px] font-black text-slate-400 uppercase leading-none">
                  {format(new Date(order.createdAt), 'dd/MMM, HH:mm')} ({timeElapsedStr})
              </p>
          </div>
      </div>

      {/* Detalhes de Contato e Endereço */}
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing space-y-1">
          {(deliveryData?.phone) && (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                  <Phone size={10} className="text-slate-400" /> {deliveryData.phone}
              </div>
          )}
          
          {isDelivery && deliveryData?.address && (
              <div className="flex items-start gap-1.5 text-[10px] font-medium text-slate-500 leading-tight">
                  <MapPin size={10} className="text-slate-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{deliveryData.address}</span>
              </div>
          )}

          {/* Financeiro e Integração */}
          <div className="flex justify-between items-end pt-1">
              <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-slate-900 italic">R$ {order.total.toFixed(2)} - {deliveryData?.paymentMethod || 'Não informado'}</p>
                  {order.saiposOrderId && (
                      <p className="text-[8px] font-black text-slate-400 uppercase">Nº no Don fonseca: {order.saiposOrderId}</p>
                  )}
              </div>
              <div className="flex gap-1">
                  <div className={cn("p-1 rounded border", isDelivery ? "text-rose-500 bg-rose-50 border-rose-100" : "text-blue-500 bg-blue-50 border-blue-100")}>
                      {isDelivery ? <Truck size={12} /> : <Utensils size={12} />}
                  </div>
              </div>
          </div>
      </div>

      {/* Botões de Ação Estilo Saipos */}
      <div className="flex gap-1.5 mt-1 pt-2 border-t border-slate-100">
          <button 
            onClick={handleQuickPrint}
            disabled={isPrinting}
            className="p-2 bg-slate-50 text-slate-400 hover:text-slate-900 border border-slate-200 rounded-lg transition-all"
          >
            {isPrinting ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); onOpenDetails(order); }}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-1 py-2"
          >
            <Eye size={12} /> Ver
          </button>

          <button 
            onClick={handleAdvance}
            className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all"
          >
            <ChevronRight size={14} />
          </button>
      </div>
    </div>
  );
};

export default OrderCard;