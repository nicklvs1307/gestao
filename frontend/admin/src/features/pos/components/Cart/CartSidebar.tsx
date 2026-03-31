import React, { useMemo, useCallback, useState } from 'react';
import { ShoppingCart, Minus, Plus, Bike, ShoppingBag, User, X, ChevronRight, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { useCartStore, useCartTotal } from '../../hooks/useCartStore';
import { usePosStore } from '../../hooks/usePosStore';
import { Button } from '../../../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { TableSummary, Addon } from '../../../../types';
import { usePrefersReducedMotion } from '../../../../hooks/usePrefersReducedMotion';

interface CartSidebarProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tables: any[];
  tablesSummary: TableSummary[];
  onOpenCheckout: () => void;
}

export const CartSidebar = React.memo<CartSidebarProps>(({ tables, tablesSummary, onOpenCheckout }) => {
  const navigate = useNavigate();
  const { cart, updateQuantity } = useCartStore();
  const cartTotal = useCartTotal();
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const { isSubmitting } = usePosStore();
  const prefersReducedMotion = usePrefersReducedMotion();

  const parseAddons = useCallback((addonsJson: string | null | undefined): Addon[] => {
    if (!addonsJson) return [];
    try {
      return JSON.parse(addonsJson);
    } catch {
      return [];
    }
  }, []);

  const toggleExpand = useCallback((itemId: string | undefined) => {
    setExpandedItemId(prev => prev === itemId ? null : (itemId || null));
  }, []);

  const { 
    orderMode, setOrderMode, 
    selectedTable, setSelectedTable, 
    customerName, setCustomerName,
    deliverySubType, setDeliverySubType,
    deliveryInfo, setDeliveryInfo,
    setActiveModal, setActiveDeliveryOrderId
  } = usePosStore();

  const handleOrderModeChange = useCallback((mode: 'table' | 'delivery') => {
    setOrderMode(mode);
    setSelectedTable('');
    setActiveDeliveryOrderId(null);
  }, [setOrderMode, setSelectedTable, setActiveDeliveryOrderId]);

  const handleTableChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTable(e.target.value);
  }, [setSelectedTable]);

  const handleCustomerNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerName(e.target.value);
  }, [setCustomerName]);

  const handleDeliverySubTypeChange = useCallback((type: 'delivery' | 'pickup') => {
    setDeliverySubType(type);
    if (type === 'pickup') {
      setDeliveryInfo(prev => ({ ...prev, address: '' }));
    }
  }, [setDeliverySubType, setDeliveryInfo]);

  const handleOpenDeliveryModal = useCallback(() => {
    setActiveModal('delivery_info');
  }, [setActiveModal]);

  const handleClearDeliveryInfo = useCallback(() => {
    setDeliveryInfo({ name: '', phone: '', address: '', deliveryType: 'delivery' });
  }, [setDeliveryInfo]);

  const handleQuantityChange = useCallback((cartItemId: string | undefined, delta: number) => {
    if (cartItemId) {
      updateQuantity(cartItemId, delta);
    }
  }, [updateQuantity]);

  const handleCloseTable = useCallback((orderId: string | undefined) => {
    if (orderId) {
      navigate(`/pos/checkout/${orderId}`);
    } else {
      toast.error("Pedido não localizado.");
    }
  }, [navigate]);

  const tableInfo = useMemo(() => {
    if (orderMode === 'table' && selectedTable) {
      return tablesSummary.find(t => t.number === parseInt(selectedTable));
    }
    return null;
  }, [orderMode, selectedTable, tablesSummary]);

  return (
    <aside className="w-[300px] sm:w-[320px] bg-white border-r border-slate-200 flex flex-col shadow-xl z-20">
      <div className="p-2 sm:p-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex flex-col">
            <h3 className={cn(
              "text-sm font-black uppercase italic tracking-tighter leading-none",
              orderMode === 'table' ? "text-emerald-600" : "text-blue-600"
            )}>
              {orderMode === 'table' ? `Mesa ${selectedTable || '?'}` : 'Venda Direta'}
            </h3>
          </div>
          <div className="flex bg-slate-200/50 p-0.5 rounded-lg border border-slate-200">
            <button 
              onClick={() => handleOrderModeChange('table')}
              aria-pressed={orderMode === 'table'}
              className={cn("px-2 sm:px-2.5 py-1 text-[9px] sm:text-[10px] font-black uppercase rounded-md transition-all", orderMode === 'table' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500")}
            >
              Mesa
            </button>
            <button 
              onClick={() => handleOrderModeChange('delivery')}
              aria-pressed={orderMode === 'delivery'}
              className={cn("px-2 sm:px-2.5 py-1 text-[9px] sm:text-[10px] font-black uppercase rounded-md transition-all", orderMode === 'delivery' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
            >
              Direta
            </button>
          </div>
        </div>

        {orderMode === 'table' && selectedTable && tableInfo && tableInfo.status !== 'free' && (
          <div className={cn("mb-2 sm:mb-3 p-2 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-between", !prefersReducedMotion && "animate-in zoom-in-95")}>
            <div>
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Conta Aberta</p>
              <p className="text-sm font-black text-emerald-900">R$ {tableInfo.totalAmount.toFixed(2)}</p>
            </div>
            <button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase h-6 sm:h-7 px-2 sm:px-3 rounded-md shadow-md"
              onClick={() => handleCloseTable(tableInfo.tabs?.[0]?.orderId)}
            >
              FECHAR
            </button>
          </div>
        )}

        {orderMode === 'table' ? (
          <div className="grid grid-cols-1 gap-1.5">
            <div className="relative">
              <select 
                value={selectedTable} 
                onChange={handleTableChange}
                aria-label="Selecionar mesa"
                className="w-full h-8 sm:h-9 px-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-[10px] font-black uppercase outline-none focus:border-orange-500 appearance-none cursor-pointer"
              >
                <option value="">Mesa...</option>
                {tables.map(t => <option key={t.id} value={t.number}>Mesa {t.number}</option>)}
              </select>
              <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 rotate-90" size={12} />
            </div>
            <input 
              placeholder="Identificação / Comanda" 
              value={customerName} 
              onChange={handleCustomerNameChange}
              className="w-full h-8 sm:h-9 px-2 rounded-lg border border-slate-200 text-[10px] font-black uppercase outline-none focus:border-orange-500"
              aria-label="Nome do cliente ou identificação"
            />
          </div>
        ) : (
          <div className="space-y-1.5 sm:space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              <button 
                onClick={() => handleDeliverySubTypeChange('delivery')}
                aria-pressed={deliverySubType === 'delivery'}
                className={cn("flex items-center justify-center h-8 sm:h-9 rounded-lg border transition-all gap-1.5", deliverySubType === 'delivery' ? "bg-orange-50 border-orange-400 text-orange-700 shadow-sm" : "bg-white border-slate-200 text-slate-400")}
              >
                <Bike size={14} />
                <span className="text-[9px] sm:text-[10px] font-black uppercase">Entrega</span>
              </button>
              <button 
                onClick={() => handleDeliverySubTypeChange('pickup')}
                aria-pressed={deliverySubType === 'pickup'}
                className={cn("flex items-center justify-center h-8 sm:h-9 rounded-lg border transition-all gap-1.5", deliverySubType === 'pickup' ? "bg-blue-50 border-blue-400 text-blue-700 shadow-sm" : "bg-white border-slate-200 text-slate-400")}
              >
                <ShoppingBag size={14} />
                <span className="text-[9px] sm:text-[10px] font-black uppercase">Balcão</span>
              </button>
            </div>

            <div className="flex gap-1">
              <button 
                onClick={handleOpenDeliveryModal}
                className="flex-1 h-8 sm:h-9 border border-slate-200 rounded-lg px-2 sm:px-3 flex items-center justify-between hover:border-orange-500 hover:bg-orange-50/30 transition-all bg-white overflow-hidden"
                aria-label={deliverySubType === 'delivery' ? 'Selecionar endereço de entrega' : 'Selecionar cliente'}
              >
                <div className="min-w-0 flex flex-col items-start">
                  <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest leading-none mb-0.5">{deliverySubType === 'delivery' ? 'Endereço' : 'Cliente'}</span>
                  <span className="text-[10px] font-medium text-slate-700 truncate w-full text-left">{deliveryInfo.name || 'Vincular...'}</span>
                </div>
                <User size={12} className="text-orange-400 shrink-0" />
              </button>
              {deliveryInfo.name && (
                <button 
                  onClick={handleClearDeliveryInfo}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-rose-100 text-rose-500 hover:bg-rose-50 flex items-center justify-center bg-white transition-all"
                  aria-label="Limpar informações de entrega"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 sm:p-2 space-y-1 custom-scrollbar bg-slate-50/30">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-30 space-y-2">
            <ShoppingCart size={28} />
            <p className="text-[10px] font-black uppercase tracking-widest">Carrinho vazio</p>
          </div>
        ) : cart.map(item => {
          const itemAddons = parseAddons(item.addonsJson);
          const isExpanded = expandedItemId === item.cartItemId;
          const hasDetails = itemAddons.length > 0 || item.selectedSize;

          return (
          <div key={item.cartItemId} className={cn("p-1.5 sm:p-2 bg-white border border-slate-200 rounded-lg shadow-sm", !prefersReducedMotion && "animate-in slide-in-from-left-1")}>
            <div className="flex justify-between items-start gap-1">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="font-black text-[10px] text-slate-900 block truncate">{item.name}</span>
                  {hasDetails && (
                    <button 
                      onClick={() => toggleExpand(item.cartItemId)}
                      className="p-0.5 hover:bg-slate-100 rounded transition-colors"
                      aria-label={isExpanded ? 'Fechar detalhes' : 'Ver detalhes'}
                    >
                      {isExpanded ? <ChevronUp size={10} className="text-orange-500" /> : <ChevronDown size={10} className="text-slate-400" />}
                    </button>
                  )}
                </div>
                {item.observation && (
                  <span className="inline-block mt-0.5 text-[9px] text-amber-600 font-medium truncate max-w-full">Obs: {item.observation}</span>
                )}
              </div>
              <span className="font-black text-[10px] text-slate-900 shrink-0">R$ {(item.price * item.quantity).toFixed(2)}</span>
            </div>
            
            {isExpanded && hasDetails && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-100 space-y-1">
                {item.selectedSize && (
                  <div className="flex justify-between text-[9px]">
                    <span className="text-slate-500">Tamanho:</span>
                    <span className="text-slate-700 font-medium">{item.selectedSize.name}</span>
                  </div>
                )}
                {itemAddons.map((addon, idx) => (
                  <div key={idx} className="flex justify-between text-[9px]">
                    <span className="text-slate-500">+ {addon.name}</span>
                    <span className="text-emerald-600 font-medium">{addon.price > 0 ? `R$ ${addon.price.toFixed(2)}` : 'Grátis'}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[9px] font-medium text-slate-400">R$ {item.price.toFixed(2)}/un</span>
              <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded border border-slate-100">
                <button 
                  onClick={() => handleQuantityChange(item.cartItemId, -1)}
                  className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded bg-white border border-slate-200 hover:text-rose-500 transition-all"
                  aria-label={`Diminuir quantidade de ${item.name}`}
                >
                  <Minus size={9} strokeWidth={3} />
                </button>
                <span className="text-[10px] font-black w-3 sm:w-4 text-center">{item.quantity}</span>
                <button 
                  onClick={() => handleQuantityChange(item.cartItemId, 1)}
                  className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded bg-white border border-slate-200 hover:text-emerald-500 transition-all"
                  aria-label={`Aumentar quantidade de ${item.name}`}
                >
                  <Plus size={9} strokeWidth={3} />
                </button>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      <div className="p-2 sm:p-3 bg-white border-t border-slate-100">
        <div className="flex justify-between items-center mb-2 sm:mb-3">
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mb-0.5">Total</span>
            <span className="text-[10px] font-medium text-slate-500">{cart.length} item(s)</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 leading-none">R$ {cartTotal.toFixed(2).replace('.', ',')}</div>
        </div>
        <Button onClick={onOpenCheckout} disabled={cart.length === 0 || isSubmitting} isLoading={isSubmitting} fullWidth size="lg" className="h-9 sm:h-10 rounded-lg text-[9px] sm:text-[10px] uppercase tracking-wider font-black gap-1.5 sm:gap-2 shadow-md">
          IR PARA PAGAMENTO <CheckCircle size={14} strokeWidth={3} />
        </Button>
      </div>
    </aside>
  );
});
