import React from 'react';
import ProductCard from './ProductCard';
import type { Product } from '../types';

interface ProductGridProps {
  products: Product[];
  onProductClick: (product: Product) => void;
  onAddToCartFromCard: (product: Product) => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, onProductClick, onAddToCartFromCard }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {products.length === 0 ? (
            <p className="col-span-full text-center text-muted-foreground py-10">Nenhum produto disponível nesta categoria.</p>
        ) : (
            products.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onProductClick={onProductClick} 
                  onAddToCartFromCard={onAddToCartFromCard} 
                />
            ))
        )}
    </div>
  );
};

export default ProductGrid;
