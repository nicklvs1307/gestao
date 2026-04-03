import React, { useState, useMemo } from 'react';
import type { AddonOption } from '../../types';
import { toast } from 'sonner';
import { 
  Minus, 
  Plus, 
  Check,
  Search
} from 'lucide-react';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';
import { useDebounce } from '../../hooks';

interface AddonGroup {
  id: string;
  name: string;
  isFlavorGroup?: boolean;
  isRequired?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
  addons: AddonOption[];
}

interface AddonSelectorProps {
  addonGroups: AddonGroup[];
  selectedAddons: AddonOption[];
  onAddonChange: (addon: AddonOption, delta: number, group: AddonGroup) => void;
  config: { active: boolean; maxFlavors: number; priceRule: string };
}

const AddonSelector: React.FC<AddonSelectorProps> = ({
  addonGroups,
  selectedAddons,
  onAddonChange,
  config,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const getAddonPromotion = (addon: any) => {
    return null;
  };

  const isPromoActive = (addon: any) => {
    if (!addon.promoPrice) return false;
    const now = new Date();
    const start = addon.promoStartDate ? new Date(addon.promoStartDate) : null;
    const end = addon.promoEndDate ? new Date(addon.promoEndDate) : null;
    
    if (start && now < start) return false;
    if (end && now > end) return false;
    
    return true;
  };

  const getAddonPrice = (addon: any) => {
    return isPromoActive(addon) ? Number(addon.promoPrice) : Number(addon.price);
  };

  const getFractionText = (addon: any, group: AddonGroup, config: { maxFlavors: number }) => {
    if (!group.isFlavorGroup) return undefined;
    
    const allSelectedInGroup = group.addons
      .filter((a: any) => selectedAddons.some(sa => sa.id === a.id))
      .map((a: any) => ({
        id: a.id,
        quantity: selectedAddons.find(sa => sa.id === a.id)?.quantity || 0
      }));
    
    let startIndex = 0;
    for (const s of allSelectedInGroup) {
      if (s.id === addon.id) break;
      startIndex += s.quantity;
    }
    
    const currentQty = selectedAddons.find(sa => sa.id === addon.id)?.quantity || 0;
    
    if (currentQty > 1) {
      return `${startIndex + 1}-${startIndex + currentQty}/${config.maxFlavors}`;
    } else {
      return `${startIndex + 1}/${config.maxFlavors}`;
    }
  };

  return (
    <div className="space-y-6">
      {addonGroups.length > 0 && (
        <div className="relative sticky top-0 z-20 bg-slate-50 py-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true" />
            <input
              type="text"
              placeholder="Pesquisar sabor ou adicional..."
              className="w-full bg-white border-2 border-slate-100 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold focus:border-primary outline-none transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Pesquisar sabor ou adicional"
            />
          </div>
        </div>
      )}

      {addonGroups.map((group) => {
        const filteredAddons = group.addons.filter((a: any) => 
          a.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          (a.description && a.description.toLowerCase().includes(debouncedSearch.toLowerCase()))
        );

        if (filteredAddons.length === 0 && debouncedSearch) return null;

        const isFlavor = group.isFlavorGroup;
        const limit = isFlavor ? (group.maxQuantity || 1) : (group.maxQuantity || 0);
        const selectedInGroup = selectedAddons.filter(sa => group.addons.some(ga => ga.id === sa.id));
        const totalInGroup = selectedInGroup.reduce((sum, a) => sum + (a.quantity || 0), 0);
        const hasImages = group.addons.some(a => a.imageUrl);

        return (
          <div key={group.id} className="space-y-4 scroll-mt-24" aria-labelledby={`group-${group.id}`}>
            <div className="flex items-center justify-between">
              <h4 id={`group-${group.id}`} className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <div className="w-1.5 h-4 bg-primary rounded-full shadow-lg shadow-primary/30" />
                {group.name}
              </h4>
              <div className="flex gap-2">
                {isFlavor ? (
                  <span className={cn(
                    "text-[8px] px-2 py-1 rounded-md font-black uppercase tracking-widest border transition-all", 
                    totalInGroup === limit ? "bg-primary text-white border-primary" : "bg-white text-primary border-primary/20"
                  )}>
                    Sabores: {totalInGroup}/{limit}
                  </span>
                ) : (
                  <>
                    {group.isRequired && (
                      <span className="text-[8px] bg-orange-500 text-white px-2 py-1 rounded-md font-black uppercase tracking-widest">
                        Obrigatório
                      </span>
                    )}
                    {group.maxQuantity > 1 && (
                      <span className="text-[8px] bg-slate-900 text-white px-2 py-1 rounded-md font-black uppercase tracking-widest">
                        Até {group.maxQuantity} itens
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className={cn(
              "grid gap-3", 
              (isFlavor || hasImages) ? "grid-cols-1 md:grid-cols-2" : "grid-colss-1"
            )}>
              {filteredAddons.map((addon: any) => {
                const selected = selectedAddons.find(a => a.id === addon.id);
                const isSelected = !!selected;
                const currentQty = selected?.quantity || 0;
                const activePromo = isPromoActive(addon);

                if (isFlavor || hasImages) {
                  return (
                    <FlavorCard
                      key={addon.id}
                      item={addon}
                      isSelected={isSelected}
                      onToggle={() => {
                        if (isSelected && isFlavor) return onAddonChange(addon, -1, group);
                        if (isFlavor && totalInGroup >= config.maxFlavors) return toast.warning(`Limite de ${config.maxFlavors} sabores atingido.`);
                        onAddonChange(addon, 1, group);
                      }}
                      price={addon.price}
                      quantity={currentQty}
                      fractionText={isSelected ? getFractionText(addon, group, config) : undefined}
                      showControls={isSelected}
                      onIncrement={() => onAddonChange(addon, 1, group)}
                      onDecrement={() => onAddonChange(addon, -1, group)}
                    />
                  );
                }

                return (
                  <Card 
                    key={addon.id} 
                    onClick={() => onAddonChange(addon, isSelected ? -currentQty : 1, group)} 
                    className={cn(
                      "flex items-center justify-between p-4 border-2 transition-all duration-300 relative", 
                      isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-white hover:border-slate-200 shadow-sm",
                      activePromo && "promo-glowing-border"
                    )}
                  >
                    {activePromo && (
                      <div className="absolute -top-1 -left-1 z-20 bg-emerald-500 text-white px-1.5 py-0.5 rounded-md shadow-lg text-[7px] font-black uppercase tracking-tighter italic animate-bounce">
                        Oferta
                      </div>
                    )}
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all", 
                        isSelected ? "border-primary bg-primary" : "border-slate-300"
                      )}>
                        {isSelected && <Check size={12} className="text-white" strokeWidth={4} />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-black text-xs uppercase italic tracking-tighter truncate", 
                            isSelected ? "text-primary" : "text-slate-700"
                          )}>
                            {addon.name}
                          </span>
                          {isSelected && isFlavor && (
                            <span className="text-[8px] font-black bg-primary text-white px-1 rounded italic">
                              {getFractionText(addon, group, config)}
                            </span>
                          )}
                        </div>
                        {addon.description && (
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight truncate">
                            {addon.description}
                          </p>
                        )}
                        {addon.price > 0 ? (
                          <div className="flex items-center gap-2 mt-1">
                            {isPromoActive(addon) ? (
                              <>
                                <span className="text-[9px] font-bold text-slate-400 line-through decoration-rose-500/50 uppercase italic">
                                  + R$ {Number(addon.price).toFixed(2).replace('.', ',')}
                                </span>
                                <span className="text-[10px] font-black text-emerald-600 uppercase italic">
                                  + R$ {Number(addon.promoPrice).toFixed(2).replace('.', ',')}
                                </span>
                              </>
                            ) : (
                              <span className="text-[9px] font-black text-slate-500 uppercase italic">
                                + R$ {Number(addon.price).toFixed(2).replace('.', ',')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-block mt-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md uppercase italic">Grátis</span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div 
                        className="flex items-center bg-white rounded-xl p-1 border border-slate-100 shadow-sm"
                        onClick={e => e.stopPropagation()}
                        role="group"
                        aria-label="Controle de quantidade"
                      >
                        <button 
                          onClick={() => onAddonChange(addon, -1, group)} 
                          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                          aria-label={`Remover ${addon.name}`}
                        >
                          <Minus size={12} strokeWidth={3} />
                        </button>
                        <span className="w-5 text-center font-black text-xs text-slate-900 italic" aria-live="polite">{currentQty}</span>
                        <button 
                          onClick={() => onAddonChange(addon, 1, group)}
                          disabled={addon.maxQuantity > 0 && currentQty >= (addon.maxQuantity || 1)}
                          className={cn(
                            "w-7 h-7 flex items-center justify-center", 
                            (addon.maxQuantity > 0 && currentQty >= (addon.maxQuantity || 1)) ? "text-slate-200" : "text-primary"
                          )}
                          aria-label={`Adicionar ${addon.name}`}
                        >
                          <Plus size={12} strokeWidth={3} />
                        </button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(AddonSelector);

import FlavorCard from './FlavorCard';
