import React from 'react';
import { Clock, ShoppingBag } from 'lucide-react';
import type { Restaurant, RestaurantSettings } from '../../types';
import { getImageUrl } from '../../utils/image';

interface DeliveryHeaderProps {
  restaurant: Restaurant;
  isStoreOpen: boolean;
  onSearchClick: () => void;
}

const DeliveryHeader: React.FC<DeliveryHeaderProps> = ({ restaurant, isStoreOpen, onSearchClick }) => {
  const settings = restaurant.settings;

  return (
    <header className="relative mb-4">
      <div className="h-32 md:h-44 w-full bg-muted relative overflow-hidden">
        {settings?.backgroundImageUrl ? (
          <>
            <img
              src={getImageUrl(settings.backgroundImageUrl)}
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              alt="Capa do restaurante"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/50 z-10" />
          </>
        ) : (
          <div className="absolute inset-0 bg-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 z-20" />
      </div>

      <div className="relative -mt-16 flex justify-center z-20">
        <div className="w-24 h-24 rounded-full border-[4px] border-background bg-card shadow-2xl overflow-hidden flex items-center justify-center transition-transform hover:scale-105 duration-300">
          {restaurant.logoUrl ? (
            <img src={getImageUrl(restaurant.logoUrl)} className="w-full h-full object-cover" alt="Logo" loading="lazy" />
          ) : (
            <div className="w-full h-full bg-primary flex items-center justify-center">
              <span className="text-2xl font-black italic text-white uppercase">{restaurant.name.substring(0, 2)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 px-5 text-center">
        <h1 className="text-xl font-black text-slate-900 tracking-tight mb-1 uppercase italic leading-none">{restaurant.name}</h1>
        
        {restaurant.address && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`}
            target="_blank"
            rel="noreferrer"
            className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-3 px-8 block truncate hover:text-primary transition-colors text-center"
          >
            📍 {restaurant.address}
          </a>
        )}
        
        <div className="flex flex-wrap justify-center items-center gap-3">
          {isStoreOpen ? (
            <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 border border-emerald-500/20 shadow-sm">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Aberto
            </span>
          ) : (
            <span className="bg-destructive/10 text-destructive px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 border border-destructive/20 shadow-sm">
              <span className="w-1.5 h-1.5 bg-destructive rounded-full"></span> Fechado
            </span>
          )}
          
          <div className="flex items-center gap-4 text-muted-foreground bg-muted/30 px-4 py-1.5 rounded-full border border-border/40 backdrop-blur-sm shadow-sm">
            <span className="text-[10px] font-bold uppercase flex items-center gap-1.5">
              <Clock size={14} className="text-primary" /> {settings?.deliveryTime || '30-45 min'}
            </span>
            <div className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
            <span className="text-[10px] font-bold uppercase flex items-center gap-1.5">
              <ShoppingBag size={14} className="text-primary" /> {settings?.deliveryFee ? `R$ ${settings.deliveryFee.toFixed(2).replace('.', ',')}` : 'Frete Grátis'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default React.memo(DeliveryHeader);
