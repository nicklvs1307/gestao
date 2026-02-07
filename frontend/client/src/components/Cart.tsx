import React, { useState } from 'react';
import type { LocalCartItem } from '../types';
import DeliveryCheckout from './DeliveryCheckout';
import './DeliveryCart.css'; 
import { Trash2, Minus, Plus, X, ArrowLeft, ShoppingBasket, Truck } from 'lucide-react';
import { cn } from '../lib/utils';
import { useRestaurant } from '../context/RestaurantContext';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

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
      <div className={cn("cart-panel", isOpen && "open", isDelivery && "delivery-cart-panel", "bg-slate-50 shadow-2xl ring-1 ring-black/5 flex flex-col")}>
        
        {/* Header fixo no topo do painel */}
        <div className="cart-header border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center px-4 h-16 shrink-0">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={handleBackOrClose}>
            {isCheckoutMode ? <ArrowLeft size={20} /> : <X size={20} />}
          </Button>
          <h2 className="cart-title flex-1 text-center text-slate-900 font-black italic uppercase tracking-tighter mr-10">
            {isCheckoutMode && isDelivery ? 'Finalizar Pedido' : (isDelivery ? 'Minha Sacola' : 'Novo Pedido')}
          </h2>
        </div>

        {/* Wrapper que desliza lateralmente */}
        <div className={cn("cart-content-wrapper flex-1 overflow-hidden", isCheckoutMode && "checkout-active")}>
          
          {/* TELA 1: ITENS DO CARRINHO */}
          <div className="cart-screen cart-items-screen flex flex-col h-full">
            <div className="cart-body flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-300 opacity-50">
                    <ShoppingBasket size={64} strokeWidth={1} className="mb-4" />
                    <p className="font-black uppercase tracking-widest text-[10px]">Sua sacola está vazia</p>
                </div>
              ) : (
                items.map(item => (
                  <Card key={item.localId} className="flex gap-4 p-3 border-slate-100 shadow-sm">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 shadow-inner bg-slate-50">
                        {item.product.imageUrl ? (
                          <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-200 italic font-black text-xs">NO PIC</div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-black text-slate-900 leading-tight truncate uppercase italic tracking-tighter">{item.product.name}</div>
                        {item.sizeJson && <div className="text-[8px] font-black text-primary uppercase mt-0.5 italic tracking-widest">{JSON.parse(item.sizeJson).name}</div>}
                        {item.addonsJson && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {JSON.parse(item.addonsJson).map((addon: any) => (
                              <span key={addon.id} className="text-[7px] bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded-md font-bold border border-slate-100 uppercase tracking-tighter">
                                + {addon.quantity && addon.quantity > 1 ? `${addon.quantity}x ` : ''}{addon.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-black text-slate-900">R$ {item.priceAtTime.toFixed(2).replace('.', ',')}</div>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <button className="p-1.5 text-slate-200 hover:text-red-500 transition-colors" onClick={() => onRemoveItem(item.localId)}><Trash2 size={16} /></button>
                      <div className="flex items-center bg-slate-50 rounded-xl p-0.5 border border-slate-100">
                        <button className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-primary transition-colors" onClick={() => onUpdateItemQuantity(item.localId, item.quantity - 1)}><Minus size={12} strokeWidth={3} /></button>
                        <span className="w-6 text-center text-[10px] font-black text-slate-900">{item.quantity}</span>
                        <button className="w-7 h-7 flex items-center justify-center text-slate-900" onClick={() => onUpdateItemQuantity(item.localId, item.quantity + 1)}><Plus size={12} strokeWidth={3} /></button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>

            <div className="cart-footer p-6 bg-white border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] shrink-0">
                {isDelivery && deliveryFee > 0 && (
                  <div className="flex justify-between items-center mb-2 px-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Truck size={12} /> Taxa de Entrega</span>
                      <span className="text-base font-bold text-slate-600 italic tracking-tighter">R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                <div className="flex justify-between items-center mb-6 px-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Final</span>
                    <span className="text-3xl font-black text-slate-900 italic tracking-tighter">R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full">
                    <Button 
                        variant="secondary"
                        className="h-14 rounded-2xl text-[9px] uppercase tracking-widest"
                        onClick={handleCloseWrapper}
                    >
                        Adicionar Mais
                    </Button>
                    
                    <Button 
                      className={cn(
                        "h-14 rounded-2xl text-[9px] uppercase tracking-widest italic flex items-center justify-center gap-2",
                        !isStoreOpen && "bg-red-50 text-red-600 border-red-100 shadow-none hover:bg-red-50"
                      )}
                      onClick={handleProceedToCheckout}
                      disabled={items.length === 0 || isPlacingOrder || !isStoreOpen}
                      isLoading={isPlacingOrder}
                    >
                      {!isStoreOpen ? 'Loja Fechada' : (isDelivery ? 'Ir para Pagamento' : 'Enviar Pedido')}
                    </Button>
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
                restaurantId={restaurantSettings?.restaurantId || ''}
              />
            )}
          </div>

        </div>
      </div>
    </>
  );
};

export default Cart;