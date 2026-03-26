import React, { useMemo } from 'react';
import type { Product, Category } from '../../types';
import DeliveryProductCard from '../DeliveryProductCard';

interface ProductSectionProps {
  categories: Category[];
  activeCategory: string;
  onProductClick: (product: Product) => void;
}

interface Category {
  id: string;
  name: string;
  products?: Product[];
}

const ProductSection: React.FC<ProductSectionProps> = ({ categories, activeCategory, onProductClick }) => {
  const getVisibleProducts = useMemo(() => {
    return (category: Category) => {
      return (category.products || []).filter((p: Product) => 
        p.isAvailable && (p.allowDelivery || p.allowOnline) && !p.isFlavor
      );
    };
  }, []);

  const visibleCategories = useMemo(() => {
    return categories.filter(cat => {
      if (activeCategory !== 'todos' && activeCategory !== cat.id) return false;
      const products = getVisibleProducts(cat);
      return products.length > 0;
    });
  }, [categories, activeCategory, getVisibleProducts]);

  return (
    <main className="p-5 space-y-8">
      {visibleCategories.map(category => {
        const products = getVisibleProducts(category);
        
        return (
          <section key={category.id} aria-labelledby={`category-${category.id}`}>
            <h2 id={`category-${category.id}`} className="text-lg font-black text-foreground mb-4 italic uppercase tracking-tighter">
              {category.name}
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {products.map(product => (
                <DeliveryProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={onProductClick}
                />
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
};

export default React.memo(ProductSection);
