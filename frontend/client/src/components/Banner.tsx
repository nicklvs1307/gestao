import React, { useState, useEffect } from 'react';
import { getActivePromotions, getProducts } from '../services/api';
import type { Promotion, Product } from '../types';
import { Star, Flame, Award } from 'lucide-react';
import { cn } from '../lib/utils';

interface BannerProps {
  onProductClick: (product: Product) => void;
  restaurantId: string;
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

type BannerItem = { type: 'promotion'; data: Promotion } | { type: 'featured'; data: Product };

const Banner: React.FC<BannerProps> = ({ onProductClick, restaurantId }) => {
  const [bannerItems, setBannerItems] = useState<BannerItem[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const fetchBannerData = async () => {
      try {
        const [activePromotions, allProducts] = await Promise.all([
          getActivePromotions(restaurantId),
          getProducts(restaurantId)
        ]);

        const promotionsWithProducts = activePromotions.filter(p => p.product);
        const featuredProducts = allProducts.filter(p => p.isFeatured);

        const bannerItems: BannerItem[] = [];

        if (promotionsWithProducts.length > 0) {
          bannerItems.push(...promotionsWithProducts.map(p => ({ type: 'promotion' as const, data: p })));
        }

        if (featuredProducts.length > 0) {
          bannerItems.push(...featuredProducts.map(p => ({ type: 'featured' as const, data: p })));
        }

        setBannerItems(bannerItems);
      } catch (error) {
        console.error("Failed to fetch banner data:", error);
      }
    };

    fetchBannerData();
  }, [restaurantId]);

  useEffect(() => {
    if (bannerItems.length === 0) return;

    const timer = setInterval(() => {
      setCurrentSlide(prevSlide => (prevSlide + 1) % bannerItems.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [bannerItems.length]);

  if (bannerItems.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full h-64 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-primary/10 border border-white/10 group">
      {bannerItems.map((item, index) => {
        const product = item.type === 'promotion' ? item.data.product! : item.data;
        const isActive = currentSlide === index;

        let title = 'Destaque da Casa';
        let priceElement = (
             <span className="text-2xl font-black italic tracking-tighter">
                R$ {product.price.toFixed(2).replace('.', ',')}
             </span>
        );

        if (item.type === 'promotion') {
          const promo = item.data;
          const discountedPrice = calculateDiscountedPrice(product.price, promo);
          title = promo.name;
          priceElement = (
            <div className="flex flex-col items-end">
              <span className="text-[12px] line-through opacity-60 font-bold">R$ {product.price.toFixed(2).replace('.', ',')}</span>
              <span className="text-3xl font-black italic text-white tracking-tighter">R$ {discountedPrice.toFixed(2).replace('.', ',')}</span>
            </div>
          );
        }

        return (
          <div
            key={`${item.type}-${item.data.id}`}
            className={cn(
                "absolute inset-0 transition-all duration-1000 ease-in-out cursor-pointer",
                isActive ? "opacity-100 scale-100 z-10" : "opacity-0 scale-105 z-0"
            )}
            onClick={() => onProductClick(product)}
          >
            {/* Imagem de Fundo com Zoom Lento e Opacidade Realista */}
            <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] ease-linear"
                style={{ 
                    backgroundImage: `url('${product.imageUrl}')`,
                    transform: isActive ? 'scale(1.15)' : 'scale(1)'
                }}
            />
            
            {/* Gradiente de Contraste Profissional - Menos invasivo no topo */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

            {/* Conteúdo Posicionado */}
            <div className="absolute inset-0 p-8 flex flex-col justify-end text-white">
                <div className="flex justify-between items-end gap-6">
                    <div className="flex-1 min-w-0">
                        <div className={cn(
                            "flex items-center gap-2 px-4 py-1.5 rounded-full w-fit mb-3 border border-white/20 backdrop-blur-md shadow-xl",
                            item.type === 'promotion' ? "bg-orange-500/90" : "bg-primary/90"
                        )}>
                            {item.type === 'promotion' ? <Flame size={14} className="fill-white" /> : <Award size={14} />}
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                                {item.type === 'promotion' ? 'Oferta Especial' : 'Destaque'}
                            </span>
                        </div>
                        <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none mb-2 truncate drop-shadow-lg">
                            {product.name}
                        </h2>
                        <p className="text-sm font-medium opacity-90 line-clamp-1 max-w-[85%] drop-shadow-md">{product.description}</p>
                    </div>
                    
                    <div className="shrink-0 pb-1 drop-shadow-2xl">
                        {priceElement}
                    </div>
                </div>
            </div>
          </div>
        );
      })}

      {/* Indicadores Minimalistas */}
      <div className="absolute top-4 right-6 flex gap-1.5 z-20">
        {bannerItems.map((_, index) => (
          <div
            key={index}
            className={cn(
                "h-1 rounded-full transition-all duration-500",
                currentSlide === index ? "bg-white w-6" : "bg-white/30 w-2"
            )}
          />
        ))}
      </div>
    </div>
  );
};

export default Banner;