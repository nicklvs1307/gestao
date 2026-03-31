import React, { useMemo, useCallback, useState } from 'react';
import { 
  ShoppingCart, Minus, Plus, Bike, ShoppingBag, User, X, 
  ChevronDown, ChevronUp, UtensilsCrossed, Store
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { useCartStore, useCartTotal } from '../../hooks/useCartStore';
import { usePosStore, PosTab } from '../../hooks/usePosStore';
import { Button } from '../../../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { TableSummary, Addon } from '../../../../types';
import { usePrefersReducedMotion } from '../../../../hooks/usePrefersReducedMotion';

interface CartSidebarProps {
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
    try { return JSON.parse(addonsJson); } catch { return []; }
  }, []);

  const toggleExpand = useCallback((itemId: string | undefined) => {
    setExpandedItemId(prev => prev === itemId ? null : (itemId || null));
  }, []);

  const { 
    activeTab,
    selectedTable, setSelectedTable, 
    customerName, setCustomerName,
    deliverySubType, setDeliverySubType,
    deliveryInfo, setDeliveryInfo,
    setActiveModal, setActiveDeliveryOrderId,
    setActiveTab
  } = usePosStore();

  const handleQuantityChange = useCallback((cartItemId: string | undefined, delta: number) => {
    if (cartItemId) updateQuantity(cartItemId, delta);
  }, [updateQuantity]);

  const handleCloseTable = useCallback((orderId: string | undefined) => {
    if (orderId) navigate(`/pos/checkout/${orderId}`);
    else toast.error("Pedido não localizado.");
  }, [navigate]);

  const tableInfo = useMemo(() => {
    if (activeTab === 'table' && selectedTable) {
      return tablesSummary.find(t => t.number === parseInt(selectedTable));
    }
    return null;
  }, [activeTab, selectedTable, tablesSummary]);

  const tabConfig: Record<PosTab, { label: string; color: string; icon: React.ReactNode }> = {
    table: { label: `Mesa ${selectedTable || '?'}`, color: 'emerald', icon: <UtensilsCrossed size={16} /> },
    counter: { label: 'Balcão', color: 'blue', icon: <Store size={16} /> },
    delivery: { label: 'Entrega', color: 'orange', icon: <Bike size={16} /> },
  };

  const currentTab = tabConfig[activeTab];

  return (
    <aside className="w-[340px] bg-white border-r border-slate-200 flex flex-col shadow-xl z-20">
      {/* Header da Sidebar */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              activeTab === 'table' && "bg-emerald-100 text-emerald-600",
              activeTab === 'counter' && "bg-blue-100 text-blue-600",
              activeTab === 'delivery' && "bg-orange-100 text-orange-600",
            )}>
              {currentTab.icon}
            </div>
            <div>
              <h3 className={cn(
                "text-sm font-black uppercase tracking-tight leading-none",
                activeTab === 'table' && "text-emerald-600",
                activeTab === 'counter' && "text-blue-600",
                activeTab === 'delivery' && "text-orange-600",
              )}>
                {currentTab.label}
              </h3>
              <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">
                {activeTab === 'table' ? 'Conta por mesa' : activeTab === 'counter' ? 'Venda direta' : 'Delivery / Retirada'}
              </p>
            </div>
          </div>
        </div>

        {/* Alerta de conta aberta (Mesa) */}
        {activeTab === 'table' && selectedTable && tableInfo && tableInfo.status !== 'free' && (
          <div className={cn(
            "mb-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between",
            !prefersReducedMotion && "animate-in zoom-in-95"
          )}>
            <div>
              <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Conta Aberta</p>
              <p className="text-base font-black text-emerald-900">R$ {tableInfo.totalAmount.toFixed(2)}</p>
            </div>
            <button 
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase h-8 px-3 rounded-lg shadow-md transition-colors"
              onClick={() => handleCloseTable(tableInfo.tabs?.[0]?.orderId)}
            >
              FECHAR
            </button>
          </div>
        )}

        {/* Campos por modo */}
        {activeTab === 'table' && (
          <div className="space-y-2">
            <div className="relative">
              <select 
                value={selectedTable} 
                onChange={(e) => setSelectedTable(e.target.value)}
                aria-label="Selecionar mesa"
                className="w-full h-10 px-3 pr-8 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-bold uppercase outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100 appearance-none cursor-pointer transition-all"
              >
                <option value="">Selecionar mesa...</option>
                {tables.map(t => <option key={t.id} value={t.number}>Mesa {t.number}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>
            <input 
              placeholder="Nome do cliente (opcional)" 
              value={customerName} 
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100 transition-all"
              aria-label="Nome do cliente"
            />
          </div>
        )}

        {activeTab === 'delivery' && (
          <div className="space-y-2">
            {/* Cliente / Endereço */}
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveModal('delivery_info')}
                className="flex-1 h-10 border border-slate-200 rounded-lg px-3 flex items-center justify-between hover:border-orange-500 hover:bg-orange-50/30 transition-all bg-white overflow-hidden"
                aria-label="Selecionar cliente/endereço"
              >
                <div className="min-w-0 flex flex-col items-start">
                  <span className="text-[9px] font-bold text-orange-600 uppercase tracking-wider leading-none">
                    {deliveryInfo.address ? 'Endereço' : 'Cliente'}
                  </span>
                  <span className="text-xs font-medium text-slate-700 truncate w-full text-left">
                    {deliveryInfo.name ? (deliveryInfo.address ? deliveryInfo.address.substring(0, 30) + '...' : deliveryInfo.name) : 'Vincular cliente...'}
                  </span>
                </div>
                <User size={14} className="text-orange-400 shrink-0" />
              </button>
              {deliveryInfo.name && (
                <button 
                  onClick={() => setDeliveryInfo({ name: '', phone: '', address: '', deliveryType: 'delivery' })}
                  className="w-10 h-10 rounded-lg border border-rose-100 text-rose-500 hover:bg-rose-50 flex items-center justify-center bg-white transition-all"
                  aria-label="Limpar informações"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Balcão: nome + telefone opcionais */}
        {activeTab === 'counter' && (
          <div className="space-y-2">
            <input 
              placeholder="Nome do cliente (opcional)" 
              value={customerName} 
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all"
              aria-label="Nome do cliente"
            />
            <input 
              placeholder="Telefone (opcional)" 
              value={deliveryInfo.phone || ''} 
              onChange={(e) => setDeliveryInfo(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all"
              aria-label="Telefone do cliente"
            />
          </div>
        )}
      </div>

      {/* Itens do Carrinho */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar bg-slate-50/30">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <ShoppingCart size={28} className="text-slate-300" />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Carrinho vazio</p>
              <p className="text-[10px] text-slate-300 mt-1">
                {activeTab === 'table' ? 'Selecione uma mesa e adicione itens' : 'Adicione itens do catálogo'}
              </p>
            </div>
          </div>
        ) : cart.map(item => {
          const itemAddons = parseAddons(item.addonsJson);
          const isExpanded = expandedItemId === item.cartItemId;
          const hasDetails = itemAddons.length > 0 || item.selectedSize;

          return (
            <div key={item.cartItemId} className={cn(
              "p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm",
              !prefersReducedMotion && "animate-in slide-in-from-left-1"
            )}>
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-xs text-slate-900 block truncate">{item.name}</span>
                    {hasDetails && (
                      <button 
                        onClick={() => toggleExpand(item.cartItemId)}
                        className="p-0.5 hover:bg-slate-100 rounded transition-colors shrink-0"
                        aria-label={isExpanded ? 'Fechar detalhes' : 'Ver detalhes'}
                      >
                        {isExpanded ? <ChevronUp size={12} className="text-orange-500" /> : <ChevronDown size={12} className="text-slate-400" />}
                      </button>
                    )}
                  </div>
                  {item.observation && (
                    <span className="inline-block mt-1 text-[10px] text-amber-600 font-medium truncate max-w-full">
                      Obs: {item.observation}
                    </span>
                  )}
                </div>
                <span className="font-bold text-xs text-slate-900 shrink-0">
                  R$ {(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
              
              {isExpanded && hasDetails && (
                <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                  {item.selectedSize && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-500">Tamanho:</span>
                      <span className="text-slate-700 font-medium">{item.selectedSize.name}</span>
                    </div>
                  )}
                  {itemAddons.map((addon, idx) => (
                    <div key={idx} className="flex justify-between text-[10px]">
                      <span className="text-slate-500">+ {addon.name}</span>
                      <span className="text-emerald-600 font-medium">
                        {addon.price > 0 ? `R$ ${addon.price.toFixed(2)}` : 'Grátis'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] font-medium text-slate-400">R$ {item.price.toFixed(2)}/un</span>
                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
                  <button 
                    onClick={() => handleQuantityChange(item.cartItemId, -1)}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-white border border-slate-200 hover:text-rose-500 hover:border-rose-200 transition-all"
                    aria-label={`Diminuir quantidade de ${item.name}`}
                  >
                    <Minus size={12} strokeWidth={3} />
                  </button>
                  <span className="text-xs font-black w-5 text-center">{item.quantity}</span>
                  <button 
                    onClick={() => handleQuantityChange(item.cartItemId, 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-white border border-slate-200 hover:text-emerald-500 hover:border-emerald-200 transition-all"
                    aria-label={`Aumentar quantidade de ${item.name}`}
                  >
                    <Plus size={12} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer - Total + Botão */}
      <div className="p-3 bg-white border-t border-slate-100">
        <div className="flex justify-between items-center mb-3">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider leading-none">Total</span>
            <span className="text-[10px] font-medium text-slate-500">{cart.length} item(ns)</span>
          </div>
          <div className="text-xl font-black text-slate-900 leading-none">
            R$ {cartTotal.toFixed(2).replace('.', ',')}
          </div>
        </div>
        <Button 
          onClick={onOpenCheckout} 
          disabled={cart.length === 0 || isSubmitting} 
          isLoading={isSubmitting} 
          fullWidth 
          size="lg" 
          className={cn(
            "h-11 rounded-xl text-xs uppercase tracking-wider font-black gap-2 shadow-md transition-all",
            activeTab === 'table' && "bg-emerald-600 hover:bg-emerald-700",
            activeTab === 'counter' && "bg-blue-600 hover:bg-blue-700",
            activeTab === 'delivery' && "bg-orange-600 hover:bg-orange-700",
          )}
        >
          <ShoppingCart size={16} strokeWidth={3} />
          IR PARA PAGAMENTO
        </Button>
      </div>
    </aside>
  );
});
