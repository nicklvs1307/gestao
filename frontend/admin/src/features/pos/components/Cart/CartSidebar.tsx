import React, { useMemo, useCallback } from 'react';
import { ShoppingCart, Minus, Plus, Bike, ShoppingBag, User, X, ChevronRight, CheckCircle } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { useCartStore } from '../../hooks/useCartStore';
import { usePosStore } from '../../hooks/usePosStore';
import { Button } from '../../../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { TableSummary } from '../../../../types';

interface CartSidebarProps {
  tables: any[];
  tablesSummary: TableSummary[];
  onOpenCheckout: () => void;
}

export const CartSidebar = React.memo<CartSidebarProps>(({ tables, tablesSummary, onOpenCheckout }) => {
  const navigate = useNavigate();
  const { cart, updateQuantity, getCartTotal } = useCartStore();
  const { 
    orderMode, setOrderMode, 
    selectedTable, setSelectedTable, 
    customerName, setCustomerName,
    deliverySubType, setDeliverySubType,
    deliveryInfo, setDeliveryInfo,
    setActiveModal, setActiveDeliveryOrderId
  } = usePosStore();

  const cartTotal = useMemo(() => getCartTotal(), [getCartTotal, cart]);

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
    <aside className="w-[320px] bg-white border-r border-slate-200 flex flex-col shadow-xl z-20">
      <div className="p-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col">
            <h3 className={cn(
              "text-sm font-black uppercase italic tracking-tighter leading-none",
              orderMode === 'table' ? "text-emerald-600" : "text-blue-600"
            )}>
              {orderMode === 'table' ? `Mesa ${selectedTable || '?'}` : 'Venda Direta'}
            </h3>
          </div>
          <div className="flex bg-slate-200/50 p-0.5 rounded-md border border-slate-200">
            <button 
              onClick={() => handleOrderModeChange('table')}
              aria-pressed={orderMode === 'table'}
              className={cn("px-2 py-1 text-[8px] font-black uppercase rounded-sm transition-all", orderMode === 'table' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500")}
            >
              Mesa
            </button>
            <button 
              onClick={() => handleOrderModeChange('delivery')}
              aria-pressed={orderMode === 'delivery'}
              className={cn("px-2 py-1 text-[8px] font-black uppercase rounded-sm transition-all", orderMode === 'delivery' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500")}
            >
              Direta
            </button>
          </div>
        </div>

        {orderMode === 'table' && selectedTable && tableInfo && tableInfo.status !== 'free' && (
          <div className="mb-3 p-2 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-between animate-in zoom-in-95">
            <div>
              <p className="text-[7px] font-black text-emerald-600 uppercase tracking-widest">Conta Aberta</p>
              <p className="text-xs font-black text-emerald-900 italic">R$ {tableInfo.totalAmount.toFixed(2)}</p>
            </div>
            <button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[8px] font-black uppercase italic h-7 px-3 rounded-md shadow-md"
              onClick={() => handleCloseTable(tableInfo.tabs?.[0]?.orderId)}
            >
              FECHAR MESA
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
                className="w-full h-8 px-2 rounded border border-slate-200 bg-white text-slate-700 text-[10px] font-bold outline-none focus:border-orange-500 appearance-none cursor-pointer"
              >
                <option value="">Mesa...</option>
                {tables.map(t => <option key={t.id} value={t.number}>Mesa {t.number}</option>)}
              </select>
              <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 rotate-90" size={10} />
            </div>
            <input 
              placeholder="Identificação / Comanda" 
              value={customerName} 
              onChange={handleCustomerNameChange}
              className="w-full h-8 px-2 rounded border border-slate-200 text-[10px] font-bold outline-none focus:border-orange-500"
              aria-label="Nome do cliente ou identificação"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              <button 
                onClick={() => handleDeliverySubTypeChange('delivery')}
                aria-pressed={deliverySubType === 'delivery'}
                className={cn("flex items-center justify-center h-8 rounded border transition-all gap-1.5", deliverySubType === 'delivery' ? "bg-orange-50 border-orange-400 text-orange-700 shadow-sm" : "bg-white border-slate-200 text-slate-400")}
              >
                <Bike size={14} />
                <span className="text-[8px] font-black uppercase">Entrega</span>
              </button>
              <button 
                onClick={() => handleDeliverySubTypeChange('pickup')}
                aria-pressed={deliverySubType === 'pickup'}
                className={cn("flex items-center justify-center h-8 rounded border transition-all gap-1.5", deliverySubType === 'pickup' ? "bg-blue-50 border-blue-400 text-blue-700 shadow-sm" : "bg-white border-slate-200 text-slate-400")}
              >
                <ShoppingBag size={14} />
                <span className="text-[8px] font-black uppercase">Balcão</span>
              </button>
            </div>

            <div className="flex gap-1">
              <button 
                onClick={handleOpenDeliveryModal}
                className="flex-1 h-9 border border-slate-200 rounded px-3 flex items-center justify-between hover:border-orange-500 hover:bg-orange-50/30 transition-all bg-white overflow-hidden"
                aria-label={deliverySubType === 'delivery' ? 'Selecionar endereço de entrega' : 'Selecionar cliente'}
              >
                <div className="min-w-0 flex flex-col items-start">
                  <span className="text-[7px] font-black text-orange-600 uppercase tracking-widest leading-none mb-0.5">{deliverySubType === 'delivery' ? 'Endereço' : 'Cliente'}</span>
                  <span className="text-[10px] font-bold text-slate-700 truncate w-full text-left">{deliveryInfo.name || 'Vincular Cliente...'}</span>
                </div>
                <User size={14} className="text-orange-400 shrink-0" />
              </button>
              {deliveryInfo.name && (
                <button 
                  onClick={handleClearDeliveryInfo}
                  className="w-9 h-9 rounded border border-rose-100 text-rose-500 hover:bg-rose-50 flex items-center justify-center bg-white transition-all"
                  aria-label="Limpar informações de entrega"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar bg-slate-50/30">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-30 space-y-1">
            <ShoppingCart size={24} />
            <p className="text-[7px] font-black uppercase tracking-widest italic">Vazio</p>
          </div>
        ) : cart.map(item => (
          <div key={item.cartItemId} className="p-2 bg-white border border-slate-200 rounded shadow-sm animate-in slide-in-from-left-1">
            <div className="flex justify-between items-start gap-1">
              <div className="min-w-0">
                <span className="font-black text-[9px] text-slate-900 block uppercase italic leading-none truncate">{item.name}</span>
                {item.observation && (
                  <span className="inline-block mt-0.5 text-[7px] text-amber-600 font-bold uppercase truncate max-w-full">[{item.observation}]</span>
                )}
              </div>
              <span className="font-black text-[9px] text-slate-900 italic shrink-0">R$ {(item.price * item.quantity).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[8px] font-bold text-slate-400 italic">R$ {item.price.toFixed(2)}/un</span>
              <div className="flex items-center gap-1.5 bg-slate-50 p-0.5 rounded border border-slate-100">
                <button 
                  onClick={() => handleQuantityChange(item.cartItemId, -1)}
                  className="w-7 h-7 flex items-center justify-center rounded bg-white border border-slate-200 hover:text-rose-500 transition-all"
                  aria-label={`Diminuir quantidade de ${item.name}`}
                >
                  <Minus size={10} strokeWidth={3} />
                </button>
                <span className="text-[10px] font-black w-4 text-center italic">{item.quantity}</span>
                <button 
                  onClick={() => handleQuantityChange(item.cartItemId, 1)}
                  className="w-7 h-7 flex items-center justify-center rounded bg-white border border-slate-200 hover:text-emerald-500 transition-all"
                  aria-label={`Aumentar quantidade de ${item.name}`}
                >
                  <Plus size={10} strokeWidth={3} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 bg-white border-t border-slate-100">
        <div className="flex justify-between items-center mb-3">
          <div className="flex flex-col">
            <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest leading-none mb-0.5">Total Carrinho</span>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{cart.length} registro(s)</span>
          </div>
          <div className="text-xl font-black italic text-slate-900 tracking-tighter leading-none">R$ {cartTotal.toFixed(2).replace('.', ',')}</div>
        </div>
        <Button onClick={onOpenCheckout} disabled={cart.length === 0} fullWidth size="lg" className="h-10 rounded-lg text-[9px] uppercase tracking-widest font-black italic gap-2 shadow-md">
          PAGAMENTO <CheckCircle size={14} strokeWidth={3} />
        </Button>
      </div>
    </aside>
  );
});
