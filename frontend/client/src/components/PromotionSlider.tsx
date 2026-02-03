import React, { useState, useEffect, useRef } from 'react';
import { getActivePromotions } from '../services/api';
import type { Promotion, Product } from '../types';
import { Flame, Clock, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface PromotionSliderProps {
  onProductClick: (product: Product) => void;
  restaurantId: string;
}

const PromotionSlider: React.FC<PromotionSliderProps> = ({ onProductClick, restaurantId }) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const data = await getActivePromotions(restaurantId);
        setPromotions(data.filter(p => p.product));
      } catch (error) {
        console.error(error);
      }
    };
    fetchPromos();
  }, [restaurantId]);

  // Lógica de Scroll Automático
  useEffect(() => {
    if (promotions.length <= 1) return;

    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        const maxScroll = scrollWidth - clientWidth;
        
        if (scrollLeft >= maxScroll - 10) {
          // Volta pro início se chegar no fim
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          // Rola para o próximo card (aprox 300px)
          scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
      }
    }, 4000); // Rola a cada 4 segundos

    return () => clearInterval(interval);
  }, [promotions]);

  if (promotions.length === 0) return null;

  const calculateDiscountedPrice = (price: number, promo: Promotion) => {
    if (promo.discountType === 'percentage') return price * (1 - promo.discountValue / 100);
    return price - promo.discountValue;
  };

  return (
    <div className="space-y-4 mb-8">
      <div className="flex justify-between items-end px-5">
          <div className="flex items-center gap-2">
              <div className="bg-red-100 p-2 rounded-xl text-red-600 animate-pulse">
                  <Flame size={20} fill="currentColor" />
              </div>
              <div>
                  <h3 className="text-lg font-black italic uppercase tracking-tighter text-slate-900 leading-none">Ofertas de Hoje</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Tempo limitado</p>
              </div>
          </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto px-5 no-scrollbar pb-4 scroll-smooth"
      >
        {promotions.map((promo) => {
          const product = promo.product!;
          const discountedPrice = calculateDiscountedPrice(product.price, promo);

          return (
            <div 
              key={promo.id}
              onClick={() => onProductClick(product)}
              className="min-w-[280px] md:min-w-[320px] bg-white rounded-3xl p-3 border border-slate-100 shadow-xl shadow-slate-200/50 flex gap-4 active:scale-95 transition-all cursor-pointer"
            >
              <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 border border-slate-50 shadow-inner">
                  <img src={product.imageUrl} className="w-full h-full object-cover" alt={product.name} />
              </div>
              
              <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                      <h4 className="font-black text-sm text-slate-900 leading-tight line-clamp-1 italic uppercase">{product.name}</h4>
                      <div className="flex items-center gap-1 text-[9px] font-bold text-red-500 mt-1 uppercase">
                          <Clock size={10} /> Expira em breve
                      </div>
                  </div>

                  <div className="flex items-end justify-between">
                      <div className="flex flex-col">
                          <span className="text-[10px] line-through text-slate-300 font-bold leading-none">R$ {product.price.toFixed(2)}</span>
                          <span className="text-xl font-black italic text-emerald-600 tracking-tighter">R$ {discountedPrice.toFixed(2)}</span>
                      </div>
                      <div className="bg-slate-900 text-white p-2 rounded-xl shadow-lg group-hover:bg-primary transition-colors">
                          <ChevronRight size={16} />
                      </div>
                  </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PromotionSlider;