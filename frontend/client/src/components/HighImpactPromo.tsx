import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getActivePromotions, getProducts } from '../services/api';
import type { Promotion, Product } from '../types';
import { ChevronRight, Zap } from 'lucide-react';
import { isVideo } from '../utils/media';

interface HighImpactPromoProps {
  restaurantId: string;
  onProductClick: (product: Product) => void;
}

type PromoItem = {
  id: string;
  title: string;
  subtitle: string;
  mediaUrl: string;
  product: Product;
  color?: string;
};

const HighImpactPromo: React.FC<HighImpactPromoProps> = ({ restaurantId, onProductClick }) => {
  const [items, setItems] = useState<PromoItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [promotions, products] = await Promise.all([
          getActivePromotions(restaurantId),
          getProducts(restaurantId)
        ]);

        const bannerItems: PromoItem[] = [];

        // Adiciona Promoções Ativas
        promotions.filter(p => p.product).forEach(p => {
          bannerItems.push({
            id: p.id,
            title: p.name,
            subtitle: p.description || 'Oferta Imperdível',
            mediaUrl: p.product!.imageUrl,
            product: p.product!,
            color: 'bg-red-600'
          });
        });

        // Adiciona Destaques que não estão em promoção
        products.filter(p => p.isFeatured && !promotions.some(promo => promo.productId === p.id)).forEach(p => {
          bannerItems.push({
            id: p.id,
            title: p.name,
            subtitle: 'Destaque da Semana',
            mediaUrl: p.imageUrl,
            product: p,
            color: 'bg-primary'
          });
        });

        setItems(bannerItems);
      } catch (error) {
        console.error("Erro ao carregar banners:", error);
      }
    };

    fetchData();
  }, [restaurantId]);

  useEffect(() => {
    if (items.length === 0) return;

    const duration = 5000; // 5 segundos por slide
    const interval = 50; // Atualiza progresso a cada 50ms
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setCurrentIndex(current => (current + 1) % items.length);
          return 0;
        }
        return prev + step;
      });
    }, interval);

    timerRef.current = timer;
    return () => clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) return null;

  const currentItem = items[currentIndex];

  return (
    <div className="relative w-full aspect-[16/9] md:aspect-[21/9] rounded-[2rem] overflow-hidden shadow-2xl group cursor-pointer"
         onClick={() => onProductClick(currentItem.product)}>
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentItem.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute inset-0"
        >
          {isVideo(currentItem.mediaUrl) ? (
            <video
              src={currentItem.mediaUrl}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={currentItem.mediaUrl}
              alt={currentItem.title}
              className="w-full h-full object-cover"
            />
          )}

          {/* Overlay de Gradiente */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          {/* Badge "PROMO" animado estilo iFood */}
          <div className="absolute top-4 left-4 z-20">
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg border border-white/20"
            >
              <Zap size={12} fill="white" className="animate-pulse" /> Oferta
            </motion.div>
          </div>

          {/* Conteúdo do Texto */}
          <div className="absolute bottom-6 left-6 right-6 z-20">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-2xl md:text-4xl font-black text-white italic uppercase leading-none tracking-tighter drop-shadow-2xl">
                {currentItem.title}
              </h2>
              <p className="text-white/80 text-xs md:text-sm font-bold uppercase tracking-widest mt-1 drop-shadow-md">
                {currentItem.subtitle}
              </p>
            </motion.div>
          </div>

          {/* Botão de Call to Action */}
          <div className="absolute bottom-6 right-6 z-20">
             <motion.div 
               whileHover={{ scale: 1.1 }}
               whileTap={{ scale: 0.9 }}
               className="bg-white text-slate-900 p-3 rounded-2xl shadow-2xl flex items-center gap-2 group-hover:bg-primary group-hover:text-white transition-colors"
             >
                <ChevronRight size={24} strokeWidth={3} />
             </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Indicadores de Progresso (Dashed style do iFood) */}
      <div className="absolute bottom-2 left-6 right-6 flex gap-2 z-30">
        {items.map((item, idx) => (
          <div key={item.id} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
            {idx === currentIndex && (
              <motion.div 
                className="h-full bg-white"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1, ease: "linear" }}
              />
            )}
            {idx < currentIndex && <div className="h-full bg-white/60 w-full" />}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HighImpactPromo;
