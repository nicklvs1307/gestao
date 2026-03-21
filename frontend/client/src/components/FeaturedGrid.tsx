import React, { useEffect, useRef } from 'react';
import type { Product } from '../types';
import { motion } from 'framer-motion';
import { Zap, Plus } from 'lucide-react';
import { isVideo } from '../utils/media';
import { getImageUrl } from '../utils/image';
import { calculateStartingPrice, calculateDiscountedPrice } from '../utils/product';

interface FeaturedGridProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

const FeaturedGrid: React.FC<FeaturedGridProps> = ({ products, onProductClick }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (products.length <= 3) return;

    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        // Se estiver no final, volta para o começo
        if (scrollLeft + clientWidth >= scrollWidth - 20) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          // Rola aproximadamente a largura de um item (110px + 12px de gap)
          scrollRef.current.scrollBy({ left: 122, behavior: 'smooth' });
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [products]);

  if (products.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3 px-5">
        <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600">
          <Zap size={14} fill="currentColor" />
        </div>
        <h3 className="text-[12px] font-black italic uppercase tracking-tighter text-slate-900 leading-none">Destaques</h3>
      </div>

      <div 
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-5 no-scrollbar scroll-smooth pb-2"
      >
        {products.map((product) => {
          const basePrice = calculateStartingPrice(product);
          const activePromotion = product.promotions?.find(p => p.isActive);
          const finalPrice = activePromotion ? calculateDiscountedPrice(basePrice, activePromotion) : basePrice;
          const mediaUrl = getImageUrl(product.imageUrl);

          return (
            <motion.div
              key={product.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => onProductClick(product)}
              // Largura calculada para caber 3 itens com gaps
              className="min-w-[105px] max-w-[105px] bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm shadow-slate-200/50 flex flex-col group active:bg-slate-50 transition-colors"
            >
              {/* Media Container - Mini 16:11 */}
              <div className="aspect-[16/11] relative overflow-hidden bg-slate-100">
                {isVideo(product.imageUrl) ? (
                  <video src={mediaUrl} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                ) : (
                  <img src={mediaUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                )}
                
                {activePromotion && (
                  <div className="absolute top-1 left-1 bg-red-600 text-white text-[5px] font-black px-1 py-0.5 rounded-full uppercase z-10 animate-pulse">
                    Oferta
                  </div>
                )}
              </div>

              {/* Info Container - Ultra compacto */}
              <div className="p-2 flex flex-col flex-1 justify-between">
                <div>
                  <h4 className="text-[8px] font-black text-slate-900 uppercase italic tracking-tighter line-clamp-1 leading-tight mb-0.5">
                    {product.name}
                  </h4>
                  <p className="text-[6px] text-slate-400 font-medium line-clamp-1 leading-none">
                    {product.description}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] font-black text-slate-900 italic tracking-tighter">
                    R$ {finalPrice.toFixed(2).replace('.', ',')}
                  </span>
                  <div className="bg-primary text-white p-0.5 rounded-md">
                    <Plus size={10} strokeWidth={4} />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default FeaturedGrid;
