import React, { useState, useEffect } from 'react';
import type { Product, SizeOption, AddonOption } from '../types';
import { toast } from 'sonner';
import { 
  X, 
  Minus, 
  Plus, 
  Check, 
  ShoppingBag,
  Pizza as PizzaIcon,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getImageUrl } from '../utils/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onAddToCart: (
    product: Product, 
    quantity: number, 
    selectedSize: SizeOption | null, 
    selectedAddons: AddonOption[],
    selectedFlavors?: Product[],
    observations?: string
  ) => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ isOpen, onClose, product, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<AddonOption[]>([]);
  const [observations, setObservations] = useState('');
  const [isAdded, setIsAdded] = useState(false);

  const addonGroups = React.useMemo(() => {
    if (!product) return [];
    
    // 1. Grupos diretos do produto
    const productGroups = (product.addonGroups || []).map(g => ({
        ...g,
        source: 'product'
    }));
    
    // 2. Grupos herdados das categorias (Agora com addons garantidos pelo backend)
    const categoryGroups = (product.categories || [])
        .flatMap(cat => (cat.addonGroups || []).map(g => ({
            ...g,
            source: 'category'
        })));
    
    const merged = [...productGroups, ...categoryGroups];
    const uniqueIds = new Set();
    
    return merged.filter(group => {
        if (!group || uniqueIds.has(group.id)) return false;
        uniqueIds.add(group.id);
        return true;
    }).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [product]);

  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      const sizes = product.sizes || [];
      setSelectedSize(sizes.length > 0 ? sizes[0] : null);
      setSelectedAddons([]);
      setObservations('');
      setIsAdded(false);
    }
  }, [isOpen, product]);

  const handleQuantityChange = (val: number) => {
      setQuantity(prev => Math.max(1, prev + val));
  };

  const getPizzaConfig = () => {
    if (!product?.pizzaConfig) return { active: false, maxFlavors: 1, priceRule: 'higher' };
    return typeof product.pizzaConfig === 'string' ? JSON.parse(product.pizzaConfig) : product.pizzaConfig;
  };

  const handleAddonQuantityChange = (addon: AddonOption, delta: number, group: any) => {
    if (isAdded) return;
    
    const config = getPizzaConfig();
    const currentAddon = selectedAddons.find(a => a.id === addon.id);
    const currentQty = currentAddon?.quantity || 0;
    const newQty = Math.max(0, currentQty + delta);
    
    // Limite individual por item
    const maxItemQty = addon.maxQuantity || 1;
    if (newQty > maxItemQty && delta > 0) return;

    // Limite total do grupo
    if (delta > 0) {
        const isFlavor = group.isFlavorGroup && config.active;
        const limit = isFlavor ? (config.maxFlavors || 1) : (group.maxQuantity || 0);

        if (limit > 0) {
            const currentTotal = selectedAddons
                .filter(a => group.addons.some((ga: any) => ga.id === a.id))
                .reduce((sum, a) => sum + (a.quantity || 0), 0);
            
            if (currentTotal + delta > limit) {
                toast.warning(isFlavor ? `Limite de ${limit} sabores atingido.` : `Limite de ${limit} itens em "${group.name}".`);
                return;
            }
        }
    }

    if (newQty === 0) {
      setSelectedAddons(prev => prev.filter(a => a.id !== addon.id));
    } else if (currentAddon) {
      setSelectedAddons(prev => prev.map(a => a.id === addon.id ? { ...a, quantity: newQty } : a));
    } else {
      setSelectedAddons(prev => [...prev, { ...addon, quantity: newQty }]);
    }
  };

  const calculateCurrentPrice = () => {
    if (!product) return 0;
    const config = getPizzaConfig();
    
    // Preço Base do Tamanho (ou Produto)
    let basePrice = selectedSize ? selectedSize.price : product.price;

    // Aplicar Promoção
    const promo = product.promotions?.find(p => p.isActive);
    if (promo) {
        if (promo.discountType === 'percentage') basePrice *= (1 - promo.discountValue / 100);
        else basePrice = Math.max(0, basePrice - promo.discountValue);
    }

    // Lógica de Pizza (Frações)
    if (config.active) {
      const flavorGroups = addonGroups.filter(g => g.isFlavorGroup);
      const selectedFlavors = selectedAddons.filter(sa => 
        flavorGroups.some(g => g.addons.some(ga => ga.id === sa.id))
      );

      if (selectedFlavors.length > 0) {
        const prices: number[] = [];
        selectedFlavors.forEach(sf => {
          // Se o sabor tiver preço > 0, usamos ele. Se for 0, usamos o preço base da pizza para compor a média/maior.
          const p = Number(sf.price) > 0 ? Number(sf.price) : basePrice;
          for (let i = 0; i < (sf.quantity || 1); i++) {
            prices.push(p);
          }
        });

        if (config.priceRule === 'average') {
          basePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        } else {
          basePrice = Math.max(...prices);
        }
      }
    }

    // Somar Adicionais Comuns (Que não são Sabores)
    let total = basePrice;
    addonGroups.forEach(group => {
      if (group.isFlavorGroup && config.active) return;
      const selected = selectedAddons.filter(sa => group.addons.some(ga => ga.id === sa.id));
      total += selected.reduce((acc, sa) => acc + (Number(sa.price) * (sa.quantity || 1)), 0);
    });
    
    return total * quantity;
  };

  const handleAddToCartClick = () => {
    if (isAdded || !product) return;
    const config = getPizzaConfig();
    
    for (const group of addonGroups) {
      const selected = selectedAddons.filter(sa => group.addons.some(ga => ga.id === sa.id));
      const totalInGroup = selected.reduce((sum, a) => sum + (a.quantity || 0), 0);

      if (group.isFlavorGroup && config.active) {
        if (totalInGroup === 0) return toast.warning("Selecione pelo menos 1 sabor.");
        if (totalInGroup > (config.maxFlavors || 1)) return toast.warning("Limite de sabores excedido.");
      } else if ((group.isRequired || group.minQuantity > 0) && totalInGroup < (group.minQuantity || 1)) {
        return toast.warning(`Selecione pelo menos ${group.minQuantity || 1} item(ns) em "${group.name}".`);
      }
    }

    onAddToCart(product, quantity, selectedSize, selectedAddons, [], observations);
    setIsAdded(true);
    toast.success("Adicionado ao pedido!");
    setTimeout(onClose, 800);
  };

  const FlavorCard = ({ item, isSelected, onToggle, price, quantity: itemQty, fractionText, showControls, onIncrement, onDecrement }: any) => (
    <Card onClick={onToggle} noPadding className={cn("flex h-full overflow-hidden relative border-2 transition-all", isSelected ? "border-primary bg-white shadow-xl shadow-primary/10" : "border-slate-100 bg-white hover:border-slate-200 shadow-sm")}>
      <AnimatePresence>
        {isSelected && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-2 right-2 z-20 bg-primary text-white px-2 py-1 rounded-lg shadow-lg border-2 border-white text-[10px] font-black italic">
            {fractionText || <Check size={12} strokeWidth={4} />}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="w-28 md:w-32 shrink-0 bg-slate-50 relative overflow-hidden border-r border-slate-50 min-h-[8.5rem]">
        {item.imageUrl ? <img src={getImageUrl(item.imageUrl)} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center w-full h-full text-slate-200"><PizzaIcon size={32} /></div>}
      </div>
      <div className="flex flex-col flex-grow p-3 min-w-0 justify-between">
        <div className="space-y-1">
          <h3 className={cn("text-xs font-black uppercase italic tracking-tighter truncate", isSelected ? "text-primary" : "text-slate-900")}>{item.name}</h3>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight line-clamp-2">{item.description}</p>
        </div>
        
        <div className="flex justify-between items-end">
            <div className="flex flex-col">
                <span className="text-[7px] font-black text-slate-400 uppercase italic leading-none mb-1">Preço Integral</span>
                <div className="flex items-baseline gap-0.5"><span className="text-[9px] font-black text-primary">R$</span><span className="text-base font-black text-slate-900 tracking-tighter italic">{Number(price || 0).toFixed(2).replace('.', ',')}</span></div>
            </div>
            {isSelected && showControls && (
                <div className="flex items-center bg-slate-50 rounded-xl p-0.5 border border-slate-100 shadow-inner" onClick={e => e.stopPropagation()}>
                    <button onClick={(e) => { e.stopPropagation(); onDecrement(); }} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"><Minus size={12} strokeWidth={3} /></button>
                    <span className="w-5 text-center font-black text-xs text-slate-900 italic">{itemQty}</span>
                    <button onClick={(e) => { e.stopPropagation(); onIncrement(); }} className="w-7 h-7 flex items-center justify-center text-primary hover:text-primary/80 transition-colors"><Plus size={12} strokeWidth={3} /></button>
                </div>
            )}
        </div>
      </div>
    </Card>
  );

  return (
    <AnimatePresence>
      {isOpen && product && (
        <div className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-[8px]" />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30 }} className="relative w-full max-w-5xl bg-slate-50 rounded-t-[2.5rem] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[95vh] md:h-auto md:max-h-[90vh] border-t md:border border-white/20">
            <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-4 right-4 z-50 rounded-2xl bg-white/10 text-white md:text-slate-900 md:bg-white shadow-xl"><X size={20} strokeWidth={3} /></Button>
            <div className="w-full md:w-5/12 h-40 md:h-auto relative shrink-0">
              {product.imageUrl ? <img src={getImageUrl(product.imageUrl)} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400"><ShoppingBag size={64} /></div>}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent md:hidden" />
              <div className="absolute bottom-4 left-6 text-white md:hidden"><h3 className="text-2xl font-black italic uppercase tracking-tighter">{product.name}</h3></div>
            </div>
            <div className="w-full md:w-7/12 flex flex-col min-h-0 flex-1 bg-slate-50 relative">
              <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar pb-24">
                <div className="space-y-2 hidden md:block">
                  <h3 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">{product.name}</h3>
                  <p className="text-slate-500 text-xs font-bold leading-relaxed uppercase tracking-tight">{product.description}</p>
                </div>
                
                {product.sizes?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><div className="w-1.5 h-3 bg-primary rounded-full" /> 1. Escolha o Tamanho</h4>
                    <div className="grid grid-cols-1 gap-1.5">
                      {product.sizes.map((size: any) => {
                        const isSelected = selectedSize?.id === size.id;
                        return (
                          <Card key={size.id} onClick={() => setSelectedSize(size)} className={cn("flex items-center justify-between p-4 border-2 transition-all", isSelected ? "border-primary bg-primary/5 shadow-md" : "border-transparent bg-white hover:border-slate-200 shadow-sm")}>
                            <span className={cn("font-black text-sm uppercase", isSelected ? "text-primary" : "text-slate-700")}>{size.name}</span>
                            {!getPizzaConfig().active && <span className="font-black text-slate-900 text-sm italic">R$ {size.price.toFixed(2).replace('.', ',')}</span>}
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {addonGroups.map((group) => {
                  const config = getPizzaConfig();
                  const isFlavor = group.isFlavorGroup && config.active;
                  const selectedInGroup = selectedAddons.filter(sa => group.addons.some(ga => ga.id === sa.id));
                  const totalInGroup = selectedInGroup.reduce((sum, a) => sum + (a.quantity || 0), 0);
                  const hasImages = group.addons.some(a => a.imageUrl);

                  return (
                    <div key={group.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><div className="w-1.5 h-3 bg-primary rounded-full" /> {group.name}</h4>
                        <div className="flex gap-2">
                          {isFlavor ? <span className={cn("text-[8px] px-2 py-1 rounded-md font-black uppercase tracking-widest border transition-all", totalInGroup === config.maxFlavors ? "bg-primary text-white border-primary" : "bg-white text-primary border-primary/20")}>Sabores: {totalInGroup}/{config.maxFlavors}</span> : <>
                            {group.isRequired && <span className="text-[8px] bg-orange-500 text-white px-2 py-1 rounded-md font-black uppercase tracking-widest">Obrigatório</span>}
                            {group.maxQuantity > 1 && <span className="text-[8px] bg-slate-900 text-white px-2 py-1 rounded-md font-black uppercase tracking-widest">Até {group.maxQuantity} itens</span>}
                          </>}
                        </div>
                      </div>
                      
                      <div className={cn("grid gap-3", (isFlavor || hasImages) ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
                        {group.addons.map((addon: any) => {
                          const selected = selectedAddons.find(a => a.id === addon.id);
                          const isSelected = !!selected;
                          const currentQty = selected?.quantity || 0;
                          const fractionText = isFlavor ? `${currentQty}/${config.maxFlavors}` : undefined;

                          if (isFlavor || hasImages) {
                            return <FlavorCard key={addon.id} item={addon} isSelected={isSelected} onToggle={() => {
                              if (isSelected && isFlavor) return handleAddonQuantityChange(addon, -1, group);
                              if (isFlavor && totalInGroup >= config.maxFlavors) return toast.warning(`Limite de ${config.maxFlavors} sabores atingido.`);
                              handleAddonQuantityChange(addon, 1, group);
                            }} price={addon.price} quantity={currentQty} fractionText={fractionText} showControls={isFlavor && currentQty > 0} onIncrement={() => handleAddonQuantityChange(addon, 1, group)} onDecrement={() => handleAddonQuantityChange(addon, -1, group)} />;
                          }

                          return (
                            <Card key={addon.id} onClick={() => handleAddonQuantityChange(addon, isSelected ? -currentQty : 1, group)} className={cn("flex items-center justify-between p-4 border-2 transition-all", isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-white hover:border-slate-200 shadow-sm")}>
                              <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                                <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center transition-all", isSelected ? "border-primary bg-primary" : "border-slate-300")}>{isSelected && <Check size={12} className="text-white" strokeWidth={4} />}</div>
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-2"><span className={cn("font-black text-xs uppercase italic tracking-tighter truncate", isSelected ? "text-primary" : "text-slate-700")}>{addon.name}</span>{isSelected && isFlavor && <span className="text-[8px] font-black bg-primary text-white px-1 rounded italic">{fractionText}</span>}</div>
                                  {addon.description && <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight truncate">{addon.description}</p>}
                                  {addon.price > 0 && <span className="text-[9px] font-black text-slate-500 mt-1 uppercase">+ R$ {Number(addon.price).toFixed(2).replace('.', ',')}</span>}
                                </div>
                              </div>
                              {isSelected && !isFlavor && (addon.maxQuantity > 1 || group.maxQuantity > 1) && (
                                <div className="flex items-center bg-white rounded-xl p-1 border border-slate-100 shadow-sm" onClick={e => e.stopPropagation()}>
                                  <button onClick={() => handleAddonQuantityChange(addon, -1, group)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"><Minus size={12} strokeWidth={3} /></button>
                                  <span className="w-5 text-center font-black text-xs text-slate-900 italic">{currentQty}</span>
                                  <button onClick={() => handleAddonQuantityChange(addon, 1, group)} disabled={currentQty >= (addon.maxQuantity || 1)} className={cn("w-7 h-7 flex items-center justify-center", currentQty >= (addon.maxQuantity || 1) ? "text-slate-200" : "text-primary")}><Plus size={12} strokeWidth={3} /></button>
                                </div>
                              )}
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                
                <div className="space-y-2 pb-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><div className="w-1.5 h-3 bg-amber-400 rounded-full" /> Alguma observação?</h4>
                    <textarea className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 text-xs font-medium text-slate-700 placeholder:text-slate-300 focus:border-primary outline-none transition-all resize-none shadow-sm" placeholder="Ex: Tirar cebola, maionese à parte..." rows={3} value={observations} onChange={(e) => setObservations(e.target.value)} />
                </div>
              </div>

              <div className="p-4 md:p-6 bg-white border-t border-slate-100 shadow-[0_-20px_50px_rgba(0,0,0,0.03)] sticky bottom-0">
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-slate-100 rounded-[1rem] p-1 border border-slate-200 shadow-inner">
                    <button onClick={() => handleQuantityChange(-1)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all"><Minus size={18} strokeWidth={3} /></button>
                    <span className="w-6 text-center font-black text-lg text-slate-900 italic">{quantity}</span>
                    <button onClick={() => handleQuantityChange(1)} className="w-10 h-10 flex items-center justify-center text-slate-900 transition-all"><Plus size={18} strokeWidth={3} /></button>
                  </div>
                  <Button onClick={handleAddToCartClick} disabled={isAdded} className={cn("flex-1 h-12 md:h-14 rounded-[1.25rem] transition-all duration-500", isAdded ? "bg-emerald-500 shadow-emerald-100" : "bg-slate-900 shadow-slate-200")}>
                    <div className="w-full flex items-center justify-between px-2">
                      <div className="flex items-center gap-3">{isAdded ? <Check size={24} strokeWidth={3} /> : <ShoppingBag size={20} />}<span className="text-sm font-black uppercase tracking-widest italic">{isAdded ? 'ADICIONADO' : 'ADICIONAR'}</span></div>
                      <span className="text-sm font-black italic bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-sm">R$ {calculateCurrentPrice().toFixed(2).replace('.', ',')}</span>
                    </div>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ProductDetailModal;
