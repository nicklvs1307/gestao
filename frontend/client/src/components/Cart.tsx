import React, { useState } from 'react';
import type { LocalCartItem } from '../types';
import DeliveryCheckout from './DeliveryCheckout';
import './DeliveryCart.css'; 
import { Pizza, Trash2, Minus, Plus, X, ArrowLeft, ShoppingBasket, Truck } from 'lucide-react';
import { cn } from '../lib/utils';
import { useRestaurant } from '../context/RestaurantContext';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: LocalCartItem[];
  total: number;
  onRemoveItem: (localId: number) => void;
  onUpdateItemQuantity: (localId: number, newQuantity: number) => void;
  onSubmitOrder: (deliveryInfo?: any) => void;
  isPlacingOrder?: boolean;
  isDelivery?: boolean;
}

const Cart: React.FC<CartProps> = ({ isOpen, onClose, items, total, onRemoveItem, onUpdateItemQuantity, onSubmitOrder, isPlacingOrder, isDelivery = false }) => {
  const [isCheckoutMode, setCheckoutMode] = useState(false);
  const { restaurantSettings } = useRestaurant();
  const isStoreOpen = restaurantSettings?.isOpen ?? true;

  const deliveryFee = isDelivery && restaurantSettings?.deliveryFee ? restaurantSettings.deliveryFee : 0;
  const finalTotal = total + deliveryFee;

  const handleBackOrClose = () => {
    if (isCheckoutMode) {
      setCheckoutMode(false);
    } else {
      onClose();
    }
  };

  const handleCloseWrapper = () => {
    setCheckoutMode(false);
    onClose();
  };

  const handleProceedToCheckout = () => {
    if (items.length === 0) return;
    if (isDelivery) {
      setCheckoutMode(true);
    } else {
      onSubmitOrder(); 
    }
  };

  return (
    <>
      <div className={cn("cart-overlay", isOpen && "open", "backdrop-blur-sm bg-black/40")} onClick={handleCloseWrapper}></div>
      <div className={cn("cart-panel", isOpen && "open", isDelivery && "delivery-cart-panel", "bg-slate-50 shadow-2xl ring-1 ring-black/5")}>
        
        {/* Header fixo no topo do painel */}
        <div className="cart-header border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center px-4 h-16 shrink-0">
          <button className="w-10 h-10 flex items-center justify-center text-slate-900 hover:bg-slate-100 rounded-full transition-colors" onClick={handleBackOrClose}>
            {isCheckoutMode ? <ArrowLeft size={20} /> : <X size={20} />}
          </button>
          <h2 className="cart-title flex-1 text-center text-slate-900 font-black italic uppercase tracking-tighter mr-10">
            {isCheckoutMode && isDelivery ? 'Finalizar Pedido' : (isDelivery ? 'Minha Sacola' : 'Novo Pedido')}
          </h2>
        </div>

        {/* Wrapper que desliza lateralmente (CSS width: 200%) */}
        <div className={cn("cart-content-wrapper flex-1 overflow-hidden", isCheckoutMode && "checkout-active")}>
          
          {/* TELA 1: ITENS DO CARRINHO */}
          <div className="cart-screen cart-items-screen flex flex-col h-full">
            <div className="cart-body flex-1 overflow-y-auto p-4 space-y-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-300">
                    <ShoppingBasket size={64} strokeWidth={1} className="mb-4 opacity-20" />
                    <p className="font-black uppercase tracking-widest text-xs">Sua sacola está vazia</p>
                </div>
              ) : (
                items.map(item => (
                  <div key={item.localId} className="flex gap-4 p-4 rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-md">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 shadow-inner bg-slate-100">
                        <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black text-slate-900 leading-tight truncate">{item.product.name}</div>
                      {item.sizeJson && <div className="text-[9px] font-black text-orange-600 uppercase mt-1 italic tracking-widest">{JSON.parse(item.sizeJson).name}</div>}
                      {item.addonsJson && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {JSON.parse(item.addonsJson).map((addon: any) => (
                            <span key={addon.id} className="text-[8px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold border border-slate-200 uppercase tracking-tighter">
                              + {addon.quantity && addon.quantity > 1 ? `${addon.quantity}x ` : ''}{addon.name}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-sm font-black text-slate-900 mt-3">R$ {item.priceAtTime.toFixed(2).replace('.', ',')}</div>
                    </div>
                    <div className="flex flex-col items-end justify-between py-1">
                      <button className="p-1.5 text-slate-300 hover:text-red-500 transition-colors" onClick={() => onRemoveItem(item.localId)}><Trash2 size={16} /></button>
                      <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                        <button className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors" onClick={() => onUpdateItemQuantity(item.localId, item.quantity - 1)}><Minus size={14} strokeWidth={3} /></button>
                        <span className="w-6 text-center text-xs font-black text-slate-900">{item.quantity}</span>
                        <button className="w-8 h-8 flex items-center justify-center text-slate-900" onClick={() => onUpdateItemQuantity(item.localId, item.quantity + 1)}><Plus size={14} strokeWidth={3} /></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="cart-footer p-6 bg-white border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] shrink-0">
                {isDelivery && deliveryFee > 0 && (
                  <div className="flex justify-between items-center mb-2 px-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1"><Truck size={12} /> Taxa de Entrega</span>
                      <span className="text-lg font-bold text-slate-600 italic tracking-tighter">R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                <div className="flex justify-between items-center mb-6 px-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Final</span>
                    <span className="text-3xl font-black text-slate-900 italic tracking-tighter">R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
                </div>
                                <div className="grid grid-cols-2 gap-3 w-full">
                                    <button 
                                        className="w-full bg-slate-100 text-slate-500 font-black py-5 rounded-[2rem] text-[10px] uppercase tracking-widest transition-all hover:bg-slate-200"
                                        onClick={handleCloseWrapper}
                                    >
                                        Adicionar Mais
                                    </button>
                                    
                                    <button 
                                      className={cn(
                                        "w-full font-black py-5 rounded-[2rem] text-[10px] uppercase tracking-[0.15em] transition-all active:scale-95 disabled:opacity-50 shadow-xl flex items-center justify-center gap-2",
                                        isStoreOpen ? "bg-slate-900 text-white shadow-slate-200" : "bg-red-100 text-red-600 shadow-none cursor-not-allowed"
                                      )}
                                      onClick={handleProceedToCheckout}
                                      disabled={items.length === 0 || isPlacingOrder || !isStoreOpen}
                                    >
                                      {!isStoreOpen ? 'Loja Fechada' : (isPlacingOrder ? 'Enviando...' : (isDelivery ? 'Ir para Pagamento' : 'Enviar Pedido'))}
                                    </button>
                                </div>
            </div>
          </div>

          {/* Tela 2: Checkout */}
          <div className={cn("cart-screen cart-checkout-screen h-full overflow-y-auto bg-white", !isCheckoutMode && "pointer-events-none")}>
            {isDelivery && isCheckoutMode && (
              <DeliveryCheckout 
                onSubmit={onSubmitOrder} 
                onClose={() => setCheckoutMode(false)} 
                total={total}
                deliveryFee={deliveryFee}
              />
            )}
          </div>

        </div>
      </div>
    </>
  );
};

export default Cart;
