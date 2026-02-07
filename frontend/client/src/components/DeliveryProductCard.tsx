import React from 'react';
import type { Product, Promotion } from '../types';
import { Plus, ShoppingBag } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

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
  const hasSizes = product.sizes && product.sizes.length > 0;
  const basePrice = hasSizes 
    ? Math.min(...product.sizes.map(s => s.price)) 
    : product.price;

  const activePromotion = product.promotions?.find(p => p.isActive);
  const hasDiscount = !!activePromotion;
  const finalPrice = hasDiscount ? calculateDiscountedPrice(basePrice, activePromotion) : basePrice;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product);
  };

  return (
    <Card 
      hoverEffect 
      className="flex h-36 overflow-hidden relative active:scale-[0.98]"
      noPadding
      onClick={handleClick}
    >
      {/* Imagem Estilo Borda Infinita (Esquerda) */}
      <div className="w-36 h-full shrink-0 bg-slate-50 relative overflow-hidden border-r border-slate-50">
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
             <div className="absolute top-2 left-2 bg-primary text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-lg z-10">
                Oferta
             </div>
        )}
      </div>
      
      {/* Conteúdo à Direita */}
      <div className="flex flex-col flex-grow p-4 min-w-0 justify-between">
          <div className="space-y-1">
              <div className="flex justify-between items-start gap-2">
                <h3 className="text-sm font-black text-slate-900 leading-tight uppercase italic tracking-tighter truncate">{product.name}</h3>
              </div>
              <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed font-medium">{product.description}</p>
          </div>
          
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
                 {hasSizes && (
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-0.5">A partir de</span>
                 )}
                 {hasDiscount && (
                     <span className="text-[10px] text-slate-400 line-through font-bold leading-none">R$ {basePrice.toFixed(2).replace('.', ',')}</span>
                 )}
                 <div className="flex items-baseline gap-1">
                    <span className="text-xs font-black text-primary">R$</span>
                    <span className="text-xl font-black text-slate-900 tracking-tighter">
                        {finalPrice.toFixed(2).replace('.', ',')}
                    </span>
                 </div>
            </div>
            
            {/* Botão de Adicionar padronizado */}
            <Button 
                size="icon" 
                className="w-10 h-10 rounded-2xl shadow-md active:scale-90"
                onClick={handleClick}
            >
                <Plus size={20} strokeWidth={3} />
            </Button>
          </div>
      </div>
    </Card>
  );
};

export default DeliveryProductCard;