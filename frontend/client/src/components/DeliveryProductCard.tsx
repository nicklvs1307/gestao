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
      className="group bg-white p-3 rounded-[24px] border border-slate-100 transition-all active:scale-96 hover:shadow-xl cursor-pointer flex flex-col h-full shadow-sm"
      onClick={handleClick}
    >
      <div className="h-40 w-full rounded-2xl overflow-hidden mb-3 bg-slate-50 relative">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-muted-foreground">
             <ShoppingBag size={32} className="opacity-20" />
          </div>
        )}
        {hasDiscount && (
             <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                Promoção
             </div>
        )}
      </div>
      
      <div className="flex flex-col flex-grow">
          <h3 className="text-[15px] font-extrabold text-slate-900 leading-tight line-clamp-1">{product.name}</h3>
          <p className="text-[11px] text-slate-500 my-2 line-clamp-2 flex-grow leading-relaxed">{product.description}</p>
          
          <div className="flex justify-between items-center mt-2">
            <div className="flex flex-col">
                 {hasDiscount && (
                     <span className="text-[10px] text-slate-400 line-through font-bold">R$ {product.price.toFixed(2).replace('.', ',')}</span>
                 )}
                 <span className="text-base font-black text-slate-900">R$ {finalPrice.toFixed(2).replace('.', ',')}</span>
            </div>
            <button className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg transition-transform active:scale-90">
                <Plus size={18} strokeWidth={3} />
            </button>
          </div>
      </div>
    </div>
  );
};

export default DeliveryProductCard;
