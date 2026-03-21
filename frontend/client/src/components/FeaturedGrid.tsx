import React from 'react';
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
  if (products.length === 0) return null;

  return (
    <div className="px-5 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
          <Zap size={20} fill="currentColor" />
        </div>
        <h3 className="text-lg font-black italic uppercase tracking-tighter text-slate-900 leading-none">Destaques</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
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
              className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-lg shadow-slate-200/50 flex flex-col group active:bg-slate-50 transition-colors"
            >
              {/* Media Container */}
              <div className="aspect-square relative overflow-hidden bg-slate-100">
                {isVideo(product.imageUrl) ? (
                  <video src={mediaUrl} autoPlay muted loop playsInline className="w-full h-full object-cover" />
                ) : (
                  <img src={mediaUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                )}
                
                {activePromotion && (
                  <div className="absolute top-2 left-2 bg-red-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase z-10 animate-pulse">
                    Oferta
                  </div>
                )}
              </div>

              {/* Info Container */}
              <div className="p-3 flex flex-col flex-1 justify-between">
                <div>
                  <h4 className="text-[11px] font-black text-slate-900 uppercase italic tracking-tighter line-clamp-2 leading-tight mb-1">
                    {product.name}
                  </h4>
                  <p className="text-[9px] text-slate-400 font-medium line-clamp-1">
                    {product.description}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex flex-col">
                    <span className="text-[12px] font-black text-slate-900 italic tracking-tighter">
                      R$ {finalPrice.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="bg-primary text-white p-1.5 rounded-xl shadow-lg shadow-primary/20">
                    <Plus size={14} strokeWidth={3} />
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
