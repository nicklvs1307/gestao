import React, { useState, useEffect, useCallback, memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Order } from '@/types/index.ts';
import { getSettings, markOrderAsPrinted } from '../services/api';
import { printOrder } from '../services/printer';
import { formatElapsed } from '@/lib/timezone';
import { Clock, Utensils, Truck, MapPin, Printer, Loader2, Phone, ChevronRight, Eye, CreditCard, CheckCircle, ShoppingBag, XCircle, ChevronDown, ShoppingCart, ChefHat, Wine } from 'lucide-react';
import { resolvePaymentLabel } from '@/utils/paymentUtils';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Card } from './ui/Card';
import type { PrintTarget } from '../services/printer';

const IFOOD_LOGO_URL = 'https://static.ifood.com.br/assets/img/branding/logo-ifood-negativo.svg';

const OrderTimer = memo(({ createdAt, status }: { createdAt: string; status: string }) => {
  const [timeElapsedStr, setTimeElapsedStr] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      setTimeElapsedStr(formatElapsed(createdAt));
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
  onCancelOrder?: (orderId: string) => void;
}

const OrderCard: React.FC<OrderCardProps> = memo(({ order, onOpenDetails, isSelected, onSelect, onStatusChange, onCancelOrder }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: order.id });
  const [isPrinting, setIsPrinting] = useState(false);
  const [printMenuAnchor, setPrintMenuAnchor] = useState<null | HTMLElement>(null);
  const [printingTarget, setPrintingTarget] = useState<PrintTarget | null>(null);

  const printTargetLabels: Record<PrintTarget, string> = {
    all: 'Imprimir Todos',
    cashier: 'Imprimir Caixa',
    kitchen: 'Imprimir Cozinha',
    bar: 'Imprimir Bar',
  };

  const handleOpenPrintMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setPrintMenuAnchor(e.currentTarget);
  }, []);

  const handleClosePrintMenu = useCallback(() => {
    setPrintMenuAnchor(null);
  }, []);

  const handlePrintTarget = useCallback(async (target: PrintTarget) => {
    handleClosePrintMenu();
    setIsPrinting(true);
    setPrintingTarget(target);
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
      await printOrder(order, printerConfig, undefined, restaurantInfo, target);
      await markOrderAsPrinted(order.id);
      toast.success(`${printTargetLabels[target]} enviado!`);
    } catch (error) {
      console.error("Erro ao imprimir:", error);
      toast.error("Falha na impressão.");
    } finally {
      setIsPrinting(false);
      setPrintingTarget(null);
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

  const handleCancel = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Cancelar pedido #${order.dailyOrderNumber || order.id.slice(-4).toUpperCase()}?`)) {
      onCancelOrder?.(order.id);
    }
  }, [order.id, order.dailyOrderNumber, onCancelOrder]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 100 : 'auto' as const,
  };

  const deliveryData = order.deliveryOrder;
  const isPickup = order.orderType === 'PICKUP' || deliveryData?.deliveryType === 'pickup' || deliveryData?.deliveryType === 'retirada';
  const isDelivery = order.orderType === 'DELIVERY' || (!!deliveryData && !isPickup);
  const isTable = order.orderType === 'TABLE' || (order.orderType === 'PICKUP' && !deliveryData);
  const orderTotal = order.total + (order.deliveryOrder?.deliveryFee || 0);

  return (
    <div ref={setNodeRef} style={style}>
      <Card 
        className={cn(
          "group relative flex flex-col gap-2.5 transition-shadow duration-200",
          isDragging ? "shadow-2xl ring-2 ring-orange-200" : "hover:shadow-md hover:border-orange-500/30",
          isSelected ? "border-orange-500 bg-orange-50/30" : "bg-white",
          order.status === 'PENDING' && !isSelected && "border-rose-100 bg-rose-50/30"
        )}
        noPadding
      >
        {/* Header: Checkbox, ID e Timer */}
        <div className="flex justify-between items-start px-4 pt-3">
            <div className="flex items-center gap-2.5">
                <button 
                  onClick={handleSelect}
                  aria-label={isSelected ? "Desselecionar pedido" : "Selecionar pedido"}
                  className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0",
                      isSelected ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-200" : "bg-white border-slate-200 hover:border-slate-400"
                  )}
                >
                  {isSelected && <CheckCircle size={12} strokeWidth={3} />}
                </button>
                <div>
                  <span className="block text-sm font-bold text-slate-900 leading-tight">
                    #{order.dailyOrderNumber || '0'} <span className="text-xs font-medium text-slate-500">- {deliveryData?.name || order.customerName || 'Consumidor'}</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    ID: {order.id.slice(-6).toUpperCase()}
                  </span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {order.ifoodOrderId && (
                    <img src={IFOOD_LOGO_URL} alt="iFood" className="h-5 w-auto" />
                )}
                <OrderTimer createdAt={order.createdAt} status={order.status} />
            </div>
        </div>

        {/* Info: Entrega/Mesa */}
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing px-4 space-y-2">
            <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1.5 rounded-lg border",
                  isPickup 
                    ? "text-blue-500 bg-blue-50 border-blue-100" 
                    : (isDelivery ? "text-rose-500 bg-rose-50 border-rose-100" : "text-emerald-500 bg-emerald-50 border-emerald-100")
                )}>
                    {isPickup ? <ShoppingBag size={14} /> : (isDelivery ? <Truck size={14} /> : <Utensils size={14} />)}
                </div>
                <span className="text-xs font-bold text-slate-600 uppercase">
                  {isPickup ? 'Retirada' : (isDelivery ? 'Entrega' : 'Mesa')}
                </span>
              </div>
              {deliveryData?.phone && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                  <Phone size={10} /> {deliveryData.phone}
                </div>
              )}
            </div>
            
            {isDelivery && deliveryData?.address && (
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100/50">
                  <div className="flex items-start gap-1.5 text-[10px] font-medium text-slate-500 leading-tight">
                      <MapPin size={11} className="text-orange-500 shrink-0 mt-px" />
                      <span className="line-clamp-1 uppercase">{deliveryData.address}</span>
                  </div>
                </div>
            )}

            {/* Itens do Pedido */}
            <div className="px-1 space-y-1">
                {Array.isArray(order.items) && order.items.slice(0, 2).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-slate-500">
                        <span className="truncate pr-2"><b className="text-orange-500">{item.quantity}x</b> {item.product?.name}</span>
                        <span className="shrink-0 text-slate-400">R$ {(item.priceAtTime * item.quantity).toFixed(2)}</span>
                    </div>
                ))}
                {Array.isArray(order.items) && order.items.length > 2 && (
                    <p className="text-[10px] font-bold text-slate-300 uppercase">+ {order.items.length - 2} itens...</p>
                )}
            </div>

            {/* Financeiro */}
            <div className="flex justify-between items-center py-1 px-1 border-t border-slate-50">
                <div className="flex items-center gap-1.5">
                  <CreditCard size={11} className="text-slate-300" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[100px]">
                    {resolvePaymentLabel(deliveryData?.paymentMethod) || 'PENDENTE'}
                  </span>
                </div>
                <span className="text-base font-bold text-slate-900">
                  R$ {orderTotal.toFixed(2).replace('.', ',')}
                </span>
            </div>
        </div>

        {/* Footer: Ações */}
        <div className="flex gap-1.5 p-2 bg-slate-50/50 rounded-b-2xl border-t border-slate-100">
            <div className="relative">
              <button 
                onClick={handleOpenPrintMenu}
                disabled={isPrinting}
                aria-label="Imprimir pedido"
                className="h-10 w-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-orange-600 transition-colors"
              >
                {isPrinting ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
              </button>
              
              {/* Print Menu Dropdown */}
              {printMenuAnchor && (
                <div 
                  className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 min-w-[160px] overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {(['all', 'cashier', 'kitchen', 'bar'] as PrintTarget[]).map((target) => (
                    <button
                      key={target}
                      onClick={() => handlePrintTarget(target)}
                      disabled={isPrinting}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
                    >
                      {target === 'all' && <Printer size={14} className="text-slate-500" />}
                      {target === 'cashier' && <ShoppingCart size={14} className="text-blue-500" />}
                      {target === 'kitchen' && <ChefHat size={14} className="text-orange-500" />}
                      {target === 'bar' && <Wine size={14} className="text-purple-500" />}
                      {printTargetLabels[target]}
                    </button>
                  ))}
                </div>
              )}
              
              {/* Overlay to close menu */}
              {printMenuAnchor && (
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={handleClosePrintMenu}
                />
              )}
            </div>
            
            <button 
              onClick={handleOpenDetails}
              className="flex-1 h-10 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-sm"
            >
              <Eye size={12} /> Detalhes
            </button>

            <button 
              onClick={handleAdvance}
              aria-label="Avançar status"
              className="h-10 px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center justify-center transition-all shadow-sm"
            >
              <ChevronRight size={16} strokeWidth={3} />
            </button>

            {order.status !== 'CANCELED' && order.status !== 'COMPLETED' && (
              <button 
                onClick={handleCancel}
                aria-label="Cancelar pedido"
                className="h-10 w-10 bg-white border border-rose-200 rounded-lg flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
              >
                <XCircle size={14} />
              </button>
            )}
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
