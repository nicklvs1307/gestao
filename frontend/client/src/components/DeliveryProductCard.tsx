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
      className="group bg-white rounded-[2rem] border border-slate-100 transition-all active:scale-[0.98] hover:shadow-xl cursor-pointer flex h-36 overflow-hidden shadow-sm relative"
      onClick={handleClick}
    >
      {/* Imagem Estilo Borda Infinita (Esquerda) */}
      <div className="w-36 h-full shrink-0 bg-slate-50 relative overflow-hidden">
        {product.imageUrl ? (
          <>
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            />
            {/* Overlay sutil para integração da imagem */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/10" />
          </>
        ) : (
          <div className="flex items-center justify-center w-full h-full text-slate-200">
             <ShoppingBag size={40} strokeWidth={1} />
          </div>
        )}
        
        {/* Badge de Promoção Pequena na Imagem */}
        {hasDiscount && (
             <div className="absolute top-2 left-2 bg-primary text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-lg">
                Oferta
             </div>
        )}
      </div>
      
      {/* Conteúdo à Direita */}
      <div className="flex flex-col flex-grow p-4 min-w-0 justify-between">
          <div className="space-y-1">
              <div className="flex justify-between items-start gap-2">
                <h3 className="text-base font-black text-slate-900 leading-tight uppercase italic tracking-tighter truncate">{product.name}</h3>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-medium">{product.description}</p>
          </div>
          
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
                 {hasDiscount && (
                     <span className="text-[10px] text-slate-400 line-through font-bold">R$ {product.price.toFixed(2).replace('.', ',')}</span>
                 )}
                 <div className="flex items-baseline gap-1">
                    <span className="text-xs font-black text-primary">R$</span>
                    <span className="text-xl font-black text-slate-900 tracking-tighter">
                        {finalPrice.toFixed(2).replace('.', ',')}
                    </span>
                 </div>
            </div>
            
            {/* Botão de Adicionar mais discreto e elegante */}
            <div className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg transition-all group-hover:bg-primary group-hover:scale-105 active:scale-90">
                <Plus size={20} strokeWidth={3} />
            </div>
          </div>
      </div>
    </div>
  );
};

export default DeliveryProductCard;
