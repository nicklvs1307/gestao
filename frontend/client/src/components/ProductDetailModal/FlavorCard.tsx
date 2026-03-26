import React from 'react';
import { Minus, Plus, Check } from 'lucide-react';
import { Card } from './ui/Card';
import { getImageUrl } from '../utils/image';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface FlavorCardProps {
  item: any;
  isSelected: boolean;
  onToggle: () => void;
  price: number;
  quantity: number;
  fractionText?: string;
  showControls: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
}

const FlavorCard: React.FC<FlavorCardProps> = ({
  item,
  isSelected,
  onToggle,
  price,
  quantity,
  fractionText,
  showControls,
  onIncrement,
  onDecrement,
}) => {
  const isPromoActive = item.promoPrice && !item.promoStartDate || item.promoStartDate && new Date() >= new Date(item.promoStartDate) && (!item.promoEndDate || new Date() <= new Date(item.promoEndDate));
  const displayPrice = isPromoActive ? item.promoPrice : price;

  return (
    <motion.div 
      layout 
      initial={false} 
      animate={{ height: isSelected ? 'auto' : '9.5rem' }} 
      transition={{ type: "spring", stiffness: 300, damping: 30 }} 
      className="w-full"
    >
      <Card 
        onClick={onToggle} 
        noPadding 
        className={cn(
          "flex h-full overflow-hidden relative border-2 active:scale-[0.98] transition-all", 
          isSelected ? "border-primary bg-white shadow-xl shadow-primary/10" : "border-slate-100 bg-white hover:border-slate-200", 
          isPromoActive && "promo-glowing-border"
        )}
      >
        <AnimatePresence>
          {isSelected && (
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              className="absolute top-2 right-2 z-20 bg-primary text-white px-2 py-1 rounded-lg shadow-lg border-2 border-white text-[10px] font-black italic"
              aria-label={`Selecionado: ${quantity}`}
            >
              {fractionText || <Check size={12} strokeWidth={4} />}
            </motion.div>
          )}
          {isPromoActive && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }} 
              className="absolute top-2 left-2 z-20 bg-emerald-500 text-white px-2 py-0.5 rounded-md shadow-lg text-[8px] font-black uppercase tracking-tighter italic animate-pulse"
            >
              Oferta
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="w-32 md:w-36 shrink-0 bg-slate-50 relative overflow-hidden border-r border-slate-50 min-h-[9.5rem]">
          {item.imageUrl ? (
            <img 
              src={getImageUrl(item.imageUrl)} 
              alt={item.name}
              className="w-full h-full object-cover" 
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-slate-200">
              <PizzaIcon size={40} />
            </div>
          )}
          {isSelected && <div className="absolute inset-0 bg-primary/10 backdrop-blur-[1px]" />}
        </div>
        
        <div className="flex flex-col flex-grow p-4 min-w-0 justify-between">
          <div className="space-y-1">
            <h3 className={cn(
              "text-xs md:text-sm font-black uppercase italic tracking-tighter truncate", 
              isSelected ? "text-primary" : "text-slate-900"
            )}>
              {item.name}
            </h3>
            <p className={cn(
              "text-[9px] md:text-[10px] text-slate-500 leading-relaxed font-medium uppercase tracking-tight", 
              !isSelected && "line-clamp-2"
            )}>
              {item.description}
            </p>
          </div>
          
          <div className="flex justify-between items-end mt-2">
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-400 uppercase italic leading-none mb-1">Por apenas</span>
              <div className="flex flex-col items-start gap-0">
                {isPromoActive && (
                  <span className="text-[9px] font-bold text-slate-400 line-through decoration-rose-500/50 leading-none mb-0.5">
                    R$ {Number(price || 0).toFixed(2).replace('.', ',')}
                  </span>
                )}
                <div className="flex items-baseline gap-0.5">
                  <span className={cn(
                    "text-[9px] font-black", 
                    isPromoActive ? "text-emerald-600" : "text-primary"
                  )}>
                    R$
                  </span>
                  <span className={cn(
                    "text-lg font-black tracking-tighter italic", 
                    isPromoActive ? "text-emerald-600" : "text-slate-900"
                  )}>
                    {Number(displayPrice || 0).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            </div>
            
            {isSelected && showControls ? (
              <div 
                className="flex items-center bg-slate-50 rounded-xl p-0.5 border border-slate-100 shadow-inner"
                onClick={e => e.stopPropagation()}
                role="group"
                aria-label="Controle de quantidade"
              >
                <button 
                  onClick={(e) => { e.stopPropagation(); onDecrement(); }} 
                  className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500"
                  aria-label="Diminuir quantidade"
                >
                  <Minus size={12} strokeWidth={3} />
                </button>
                <span className="w-5 text-center font-black text-xs text-slate-900 italic" aria-live="polite">{quantity}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); onIncrement(); }} 
                  className="w-7 h-7 flex items-center justify-center text-primary"
                  aria-label="Aumentar quantidade"
                >
                  <Plus size={12} strokeWidth={3} />
                </button>
              </div>
            ) : isSelected && (
              <div className="flex flex-col items-end gap-1">
                <span className="text-[7px] font-black text-primary uppercase tracking-[0.2em] italic">Ok</span>
                <div className="w-8 h-1 bg-primary rounded-full animate-pulse" />
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default React.memo(FlavorCard);

function PizzaIcon({ size }: { size: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 1 0 20" />
      <path d="M12 2a10 10 0 0 0 0 20" />
      <path d="M2 12h20" />
    </svg>
  );
}
