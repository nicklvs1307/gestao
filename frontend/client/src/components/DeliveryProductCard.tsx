import React from 'react';
import type { Product, Promotion } from '../types';
import { Plus, ShoppingBag } from 'lucide-react';
import { cn } from '../lib/utils';

interface DeliveryProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

const calculateDiscountedPrice = (price: number, promotion: Promotion) => {
  if (promotion.discountType === 'percentage') {
    return price * (1 - promotion.discountValue / 100);
  }
  if (promotion.discountType === 'fixed_amount') {
    return price - promotion.discountValue;
  }
  return price;
};

const DeliveryProductCard: React.FC<DeliveryProductCardProps> = ({ product, onAddToCart }) => {
  const activePromotion = product.promotions?.find(p => p.isActive);
  const hasDiscount = !!activePromotion;
  const finalPrice = hasDiscount ? calculateDiscountedPrice(product.price, activePromotion) : product.price;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product);
  };

  return (
    <div 
      className="group bg-card p-2 rounded-[2rem] border border-border/40 transition-all active:scale-[0.98] hover:shadow-2xl hover:shadow-primary/5 cursor-pointer flex flex-col h-full shadow-sm relative overflow-hidden"
      onClick={handleClick}
    >
      {/* Imagem com Aspect Ratio fixo */}
      <div className="aspect-[4/3] w-full rounded-[1.6rem] overflow-hidden mb-3 bg-muted relative">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-muted-foreground/30 bg-muted">
             <ShoppingBag size={40} strokeWidth={1.5} />
          </div>
        )}
        
        {/* Badge de Promoção Flutuante */}
        {hasDiscount && (
             <div className="absolute top-3 right-3 bg-primary text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg animate-bounce">
                Oferta
             </div>
        )}
      </div>
      
      <div className="flex flex-col flex-grow px-2 pb-2">
          <h3 className="text-sm font-black text-foreground leading-tight line-clamp-1 uppercase italic tracking-tight">{product.name}</h3>
          <p className="text-[10px] text-muted-foreground my-2 line-clamp-2 flex-grow leading-relaxed font-medium">{product.description}</p>
          
          <div className="flex justify-between items-end mt-2">
            <div className="flex flex-col">
                 {hasDiscount && (
                     <span className="text-[9px] text-muted-foreground/60 line-through font-bold">R$ {product.price.toFixed(2).replace('.', ',')}</span>
                 )}
                 <div className="flex items-baseline gap-0.5">
                    <span className="text-[10px] font-bold text-primary">R$</span>
                    <span className="text-lg font-black text-foreground tracking-tighter">
                        {finalPrice.toFixed(2).replace('.', ',')}
                    </span>
                 </div>
            </div>
            
            {/* Botão de Adicionar Estilizado */}
            <button className="w-10 h-10 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 transition-all hover:scale-110 active:scale-90 group-hover:rotate-6">
                <Plus size={20} strokeWidth={3} />
            </button>
          </div>
      </div>
    </div>
  );
};

export default DeliveryProductCard;
