import React, { useState } from 'react';
import type { LocalCartItem } from '../types';
import DeliveryCheckout from './DeliveryCheckout';
import { Trash2, Minus, Plus, X, ArrowLeft, ShoppingBasket, Truck } from 'lucide-react';
import { cn } from '../lib/utils';
import { useRestaurant } from '../contexts/RestaurantContext';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { toast } from 'sonner';

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

    if (isDelivery && restaurantSettings?.minOrderValue > 0) {
      if (total < restaurantSettings.minOrderValue) {
        toast.error(`O valor mínimo para entrega é R$ ${restaurantSettings.minOrderValue.toFixed(2).replace('.', ',')}. Faltam R$ ${(restaurantSettings.minOrderValue - total).toFixed(2).replace('.', ',')}!`);
        return;
      }
    }

    if (isDelivery) {
      setCheckoutMode(true);
    } else {
      onSubmitOrder(); 
    }
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-foreground/50 backdrop-blur-sm z-[150] transition-opacity duration-300",
          isOpen ? "opacity-100 visible" : "opacity-0 invisible"
        )} 
        onClick={handleCloseWrapper}
      />

      {/* Slide Panel */}
      <div className={cn(
        "fixed top-0 right-0 w-full max-w-[400px] h-full bg-background shadow-2xl ring-1 ring-black/5 flex flex-col z-[200]",
        "transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        
        {/* Header */}
        <div className="border-b border-border bg-card/80 backdrop-blur-md flex items-center px-4 h-16 shrink-0">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={handleBackOrClose}>
            {isCheckoutMode ? <ArrowLeft size={20} /> : <X size={20} />}
          </Button>
          <h2 className="flex-1 text-center text-foreground font-bold uppercase tracking-tight mr-10 text-sm">
            {isCheckoutMode && isDelivery ? 'Finalizar Pedido' : (isDelivery ? 'Minha Sacola' : 'Novo Pedido')}
          </h2>
        </div>

        {/* Content wrapper for slide animation */}
        <div className={cn(
          "flex-1 flex overflow-hidden",
          "transition-transform duration-[400ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
          isCheckoutMode && "-translate-x-1/2"
        )} style={{ width: '200%' }}>
          
          {/* Screen 1: Cart Items */}
          <div className="flex flex-col h-full" style={{ width: '50%' }}>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30">
                    <ShoppingBasket size={64} strokeWidth={1} className="mb-4" />
                    <p className="font-bold uppercase tracking-widest text-xs">Sua sacola está vazia</p>
                </div>
              ) : (
                items.map(item => (
                  <Card key={item.localId} className="flex gap-4 p-3">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 shadow-inner bg-muted">
                        {item.product.imageUrl ? (
                          <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 font-bold text-xs italic">NO PIC</div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-bold text-foreground leading-tight truncate uppercase tracking-tight">{item.product.name}</div>
                        {item.sizeJson && <div className="text-[10px] font-bold text-primary uppercase mt-0.5 tracking-widest">{JSON.parse(item.sizeJson).name}</div>}
                        {item.addonsJson && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {JSON.parse(item.addonsJson).map((addon: any) => (
                              <span key={addon.id} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md font-semibold border border-border uppercase tracking-tight">
                                + {addon.quantity && addon.quantity > 1 ? `${addon.quantity}x ` : ''}{addon.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-bold text-foreground">R$ {item.priceAtTime.toFixed(2).replace('.', ',')}</div>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <button className="p-2 text-muted-foreground hover:text-destructive transition-colors" onClick={() => onRemoveItem(item.localId)}><Trash2 size={16} /></button>
                      <div className="flex items-center bg-muted rounded-xl p-0.5 border border-border">
                        <button className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors" onClick={() => onUpdateItemQuantity(item.localId, item.quantity - 1)}><Minus size={12} strokeWidth={3} /></button>
                        <span className="w-6 text-center text-xs font-bold text-foreground">{item.quantity}</span>
                        <button className="w-9 h-9 flex items-center justify-center text-foreground" onClick={() => onUpdateItemQuantity(item.localId, item.quantity + 1)}><Plus size={12} strokeWidth={3} /></button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-6 pb-24 md:pb-6 bg-card border-t border-border shadow-[0_-10px_30px_rgba(0,0,0,0.03)] shrink-0">
                {isDelivery && deliveryFee > 0 && (
                  <div className="flex justify-between items-center mb-2 px-2">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><Truck size={12} /> Taxa de Entrega</span>
                      <span className="text-base font-bold text-foreground">R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                <div className="flex justify-between items-center mb-6 px-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Final</span>
                    <span className="text-3xl font-bold text-foreground">R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
                </div>
                
                {isDelivery && restaurantSettings?.minOrderValue > 0 && total < restaurantSettings.minOrderValue && (
                  <div className="text-center bg-warning/10 text-warning rounded-lg py-2 px-3 mb-4 text-xs font-bold uppercase tracking-widest border border-warning/20">
                    Faltam R$ {(restaurantSettings.minOrderValue - total).toFixed(2).replace('.', ',')} para o mínimo
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3 w-full">
                    <Button 
                        variant="secondary"
                        className="h-14 rounded-2xl text-[10px] uppercase tracking-widest"
                        onClick={handleCloseWrapper}
                    >
                        Adicionar Mais
                    </Button>
                    
                    <Button 
                      className={cn(
                        "h-14 rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2",
                        !isStoreOpen && "bg-destructive/10 text-destructive border-destructive/20 shadow-none hover:bg-destructive/10"
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

          {/* Screen 2: Checkout */}
          <div className={cn("h-full overflow-y-auto bg-card", !isCheckoutMode && "pointer-events-none")} style={{ width: '50%' }}>
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
