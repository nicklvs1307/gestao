import React, { useState, useEffect, useRef } from 'react';
import { getActivePromotions } from '../services/api';
import type { Promotion, Product } from '../types';
import { Flame, Clock, ChevronRight, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

interface PromotionSliderProps {
  onProductClick: (product: Product) => void;
  restaurantId: string;
  allProducts: Product[]; // Necessário para encontrar o pai do addon
}

const PromotionSlider: React.FC<PromotionSliderProps> = ({ onProductClick, restaurantId, allProducts }) => {
  return null; // Componente desativado a pedido do usuário
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const data = await getActivePromotions(restaurantId);
        // Agora aceitamos promoções de produtos OU de adicionais
        setPromotions(data.filter((p: Promotion) => p.product || p.addonId));
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
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [promotions]);

  if (promotions.length === 0) return null;

  const calculateDiscountedPrice = (price: number, promo: Promotion) => {
    if (promo.discountType === 'percentage') return price * (1 - promo.discountValue / 100);
    return price - promo.discountValue;
  };

  const handlePromoClick = (promo: Promotion) => {
    if (promo.product) {
        onProductClick(promo.product);
    } else if (promo.addonId) {
        // Encontrar o primeiro produto que tem esse addon para abrir o modal
        const parentProduct = allProducts.find(p => 
            p.addonGroups?.some(g => g.addons.some(a => a.id === promo.addonId)) ||
            p.categories?.some(cat => cat.addonGroups?.some(g => g.addons.some(a => a.id === promo.addonId)))
        );
        if (parentProduct) {
            onProductClick(parentProduct);
        }
    }
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
          const isAddonPromo = !!promo.addonId;
          const displayItem = isAddonPromo ? promo.addon : promo.product;
          
          if (!displayItem) return null;

          const basePrice = displayItem.price || 0;
          const discountedPrice = calculateDiscountedPrice(basePrice, promo);
          
          let discountText = '';
          if (promo.discountType === 'percentage') {
            discountText = `${promo.discountValue}% OFF`;
          } else {
            const savings = basePrice - discountedPrice;
            discountText = `R$ ${savings.toFixed(0)} OFF`;
          }

          return (
            <div 
              key={promo.id}
              onClick={() => handlePromoClick(promo)}
              className="min-w-[280px] md:min-w-[320px] bg-white rounded-3xl p-3 border border-slate-100 shadow-xl shadow-slate-200/50 flex gap-4 active:scale-[0.98] transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 z-10">
                <div className="bg-red-600 text-white px-3 py-1 rounded-bl-2xl font-black italic text-[8px] uppercase tracking-tighter shadow-lg">
                    {discountText}
                </div>
              </div>
              <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 border border-slate-50 shadow-inner bg-slate-50 flex items-center justify-center">
                  {displayItem.imageUrl ? (
                      <img src={displayItem.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={displayItem.name} />
                  ) : (
                      <Zap size={32} className="text-slate-200" />
                  )}
              </div>
              
              <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                      <h4 className="font-black text-sm text-slate-900 leading-tight line-clamp-1 italic uppercase">
                          {isAddonPromo && <span className="text-[8px] text-orange-500 block mb-1">Adicional em Oferta</span>}
                          {displayItem.name}
                      </h4>
                      <div className="flex items-center gap-1 text-[9px] font-bold text-red-500 mt-1 uppercase">
                          <Clock size={10} /> Expira em breve
                      </div>
                  </div>

                  <div className="flex items-end justify-between">
                      <div className="flex flex-col">
                          <span className="text-[10px] line-through text-slate-300 font-bold leading-none">R$ {basePrice.toFixed(2).replace('.', ',')}</span>
                          <span className="text-xl font-black italic text-emerald-600 tracking-tighter">R$ {discountedPrice.toFixed(2).replace('.', ',')}</span>
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