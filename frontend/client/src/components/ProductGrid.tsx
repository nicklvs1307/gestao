import { cn } from '../lib/utils';
import type { Product } from '../types';
import DeliveryProductCard from './DeliveryProductCard';

interface ProductGridProps {
  products: Product[];
  isLoading: boolean;
  onProductClick: (product: Product) => void;
}

export const ProductGrid = ({ 
  products, 
  isLoading, 
  onProductClick 
}: ProductGridProps) => {
  if (isLoading && products.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="aspect-[4/5] bg-slate-100 animate-pulse rounded-3xl" />
        ))}
      </div>
    );
  }

  if (!isLoading && products.length === 0) {
    return (
      <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4 grayscale">
        <Search size={48} strokeWidth={1} />
        <p className="font-black uppercase tracking-widest text-xs">Nenhum item encontrado</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {products.map(product => (
        <DeliveryProductCard 
          key={product.id} 
          product={product} 
          onAddToCart={() => onProductClick(product)} 
        />
      ))}
    </div>
  );
};