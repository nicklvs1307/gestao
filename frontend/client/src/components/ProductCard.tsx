import React from 'react';
import type { Product, Promotion } from '../types';

interface ProductCardProps {
  product: Product;
  onProductClick: (product: Product) => void;
  onAddToCartFromCard: (product: Product) => void;
}

// Função para calcular o preço com desconto
const calculateDiscountedPrice = (price: number, promotion: Promotion) => {
  if (promotion.discountType === 'percentage') {
    return price * (1 - promotion.discountValue / 100);
  }
  if (promotion.discountType === 'fixed_amount') {
    return price - promotion.discountValue;
  }
  return price;
};

const ProductCard: React.FC<ProductCardProps> = ({ product, onProductClick, onAddToCartFromCard }) => {
  const activePromotion = product.promotions?.find(p => p.isActive);

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    onAddToCartFromCard(product);
  };

  const formatPrice = (val: number) => val.toFixed(2).replace('.', ',');

  return (
    <div 
      className="group bg-white rounded-[32px] overflow-hidden shadow-md border border-slate-100 flex flex-col transition-all active:scale-[0.98]"
      onClick={() => onProductClick(product)}
    >
      <div className="h-56 relative overflow-hidden">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-slate-50 flex items-center justify-center text-muted-foreground">
            <span className="text-xs font-bold uppercase">Sem Imagem</span>
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 items-start">
          {activePromotion && (
            <div className="bg-destructive text-white font-black text-[10px] px-3 py-1 rounded-full uppercase italic shadow-md">
              Promoção
            </div>
          )}
          {product.isFeatured && (
            <div className="bg-primary text-primary-foreground font-black text-[10px] px-3 py-1 rounded-full uppercase italic shadow-md">
              Mais Pedido
            </div>
          )}
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2 gap-2">
          <h3 className="text-xl font-black text-foreground leading-tight italic line-clamp-2">
            {product.name}
          </h3>
          <div className="flex flex-col items-end">
             {activePromotion ? (
                <>
                  <span className="text-xs text-muted-foreground line-through font-bold">R$ {formatPrice(product.price)}</span>
                  <span className="text-xl font-black text-primary italic whitespace-nowrap">
                    R$ {formatPrice(calculateDiscountedPrice(product.price, activePromotion))}
                  </span>
                </>
             ) : (
                <span className="text-xl font-black text-primary italic whitespace-nowrap">
                  R$ {formatPrice(product.price)}
                </span>
             )}
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mb-6 line-clamp-3 flex-grow">
          {product.description}
        </p>
        
        <button 
          className="w-full bg-foreground text-background py-4 rounded-2xl font-black text-sm hover:bg-primary hover:text-white transition-colors shadow-xl uppercase tracking-wide"
          onClick={handleAddToCartClick}
        >
          Adicionar ao Pedido
        </button>
      </div>
    </div>
  );
};

export default ProductCard;