import type { Product, SizeOption, AddonOption, Promotion } from '../types';
import { toast } from 'sonner';
import { 
  X, 
  Minus, 
  Plus, 
  Check, 
  ShoppingBag,
  Clock,
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
  allProducts?: Product[];
  promotions?: Promotion[];
  isStoreOpen?: boolean;
  onAddToCart: (
    product: Product, 
    quantity: number, 
    selectedSize: SizeOption | null, 
    selectedAddons: AddonOption[],
    selectedFlavors?: Product[],
    observations?: string
  ) => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ isOpen, onClose, product, promotions = [], onAddToCart, isStoreOpen = true }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<AddonOption[]>([]);
  const [observations, setObservations] = useState('');
  const [isAdded, setIsAdded] = useState(false);

  const getPizzaConfig = () => {
    if (!product?.pizzaConfig) return { active: false, maxFlavors: 1, priceRule: 'higher' };
    return typeof product.pizzaConfig === 'string' ? JSON.parse(product.pizzaConfig) : product.pizzaConfig;
  };

  const config = getPizzaConfig();

  const addonGroups = React.useMemo(() => {
    if (!product) return [];
    
    // Merge de grupos: Categorias herdadas primeiro, depois grupos diretos do produto
    // para manter a consistência com o admin que mostra herdados no topo.
    const productGroups = product.addonGroups || [];
    const categoryGroups = (product.categories || []).flatMap(cat => cat.addonGroups || []);
    
    // Removemos o .sort() final para respeitar a ordem que vem do backend
    // O backend já deve vir ordenado pelo addonGroupsOrder (no caso dos grupos diretos)
    const merged = [...categoryGroups, ...productGroups];
    const uniqueIds = new Set();
    
    return merged.filter(group => {
        if (!group || uniqueIds.has(group.id)) return false;
        uniqueIds.add(group.id);
        return true;
    });
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

  const handleAddonQuantityChange = (addon: AddonOption, delta: number, group: any) => {
    if (isAdded) return;
    const currentAddon = selectedAddons.find(a => a.id === addon.id);
    const currentQty = currentAddon?.quantity || 0;
    const newQty = Math.max(0, currentQty + delta);
    
    if (newQty > (addon.maxQuantity || 1) && delta > 0) return;

    if (delta > 0) {
        // Unificado: Se o produto tem pizzaConfig.active, ele manda no limite de sabores.
        // Se não for pizza, usa o limite do grupo.
        const isFlavor = group.isFlavorGroup && config.active;
        const limit = isFlavor ? (config.maxFlavors || 1) : (group.maxQuantity || 0);

        // Se limit for 0, tratamos como ilimitado
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

    if (newQty === 0) setSelectedAddons(prev => prev.filter(a => a.id !== addon.id));
    else if (currentAddon) setSelectedAddons(prev => prev.map(a => a.id === addon.id ? { ...a, quantity: newQty } : a));
    else setSelectedAddons(prev => [...prev, { ...addon, quantity: newQty }]);
  };

  const getAddonPromotion = (addon: any) => {
    return promotions?.find(p => p.isActive && p.addonId === addon.id);
  };

  const isPromoActive = (addon: any) => {
    // 1. Verifica no novo sistema de promoções (Prioridade)
    if (getAddonPromotion(addon)) return true;

    // 2. Verifica no sistema legado (promoPrice no objeto)
    if (!addon.promoPrice) return false;
    const now = new Date();
    const start = addon.promoStartDate ? new Date(addon.promoStartDate) : null;
    const end = addon.promoEndDate ? new Date(addon.promoEndDate) : null;
    
    if (start && now < start) return false;
    if (end && now > end) return false;
    
    return true;
  };

  const getAddonPrice = (addon: any) => {
    // 1. Novo sistema
    const promo = getAddonPromotion(addon);
    if (promo) {
        if (promo.discountType === 'percentage') {
            return Number(addon.price) * (1 - promo.discountValue / 100);
        }
        return Math.max(0, Number(addon.price) - promo.discountValue);
    }

    // 2. Legado
    return isPromoActive(addon) ? Number(addon.promoPrice) : Number(addon.price);
  };

  const calculateCurrentPrice = () => {
    if (!product) return 0;
    let basePrice = selectedSize ? selectedSize.price : product.price;

    const promo = product.promotions?.find(p => p.isActive);
    if (promo) {
        if (promo.discountType === 'percentage') basePrice *= (1 - promo.discountValue / 100);
        else basePrice = Math.max(0, basePrice - promo.discountValue);
    }

    // Se a regra de pizza estiver ativa no PRODUTO, aplica o cálculo especial nos grupos de sabores
    if (config.active) {
      const flavorGroup = addonGroups.find(g => g.isFlavorGroup);
      if (flavorGroup) {
        const flavors = selectedAddons.filter(sa => flavorGroup.addons.some(ga => ga.id === sa.id));
        if (flavors.length > 0) {
          const prices = flavors.flatMap(f => Array(f.quantity || 1).fill(getAddonPrice(f) > 0 ? getAddonPrice(f) : basePrice));
          const rule = config.priceRule || 'higher';
          
          if (rule === 'average') basePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
          else basePrice = Math.max(...prices);
        }
      }
    }

    let total = basePrice;
    addonGroups.forEach(group => {
      // Se for pizza ativa, o preço dos sabores já foi processado no basePrice
      if (group.isFlavorGroup && config.active) return;
      const selected = selectedAddons.filter(sa => group.addons.some(ga => ga.id === sa.id));
      total += selected.reduce((acc, sa) => acc + (getAddonPrice(sa) * (sa.quantity || 1)), 0);
    });
    
    return total * quantity;
  };

  const handleAddToCartClick = () => {
    if (isAdded || !product) return;
    for (const group of addonGroups) {
      const selected = selectedAddons.filter(sa => group.addons.some(ga => ga.id === sa.id));
      const total = selected.reduce((sum, a) => sum + (a.quantity || 0), 0);
      
      const isFlavor = group.isFlavorGroup && config.active;
      if (isFlavor) {
        const limit = config.maxFlavors || 1;
        if (total === 0) return toast.warning("Selecione pelo menos 1 sabor.");
        if (total > limit) return toast.warning(`Limite de ${limit} sabores atingido.`);
      } else if ((group.isRequired || group.minQuantity > 0) && total < (group.minQuantity || 1)) {
        return toast.warning(`Escolha no mínimo ${group.minQuantity || 1} em "${group.name}".`);
      }
    }
    const addonsWithPromoPrices = selectedAddons.map(sa => ({
      ...sa,
      price: getAddonPrice(sa)
    }));

    onAddToCart(product, quantity, selectedSize, addonsWithPromoPrices, [], observations);
    setIsAdded(true);
    toast.success("Adicionado!");
    setTimeout(onClose, 800);
  };

  const FlavorCard = ({ item, isSelected, onToggle, price, quantity: itemQty, fractionText, showControls, onIncrement, onDecrement }: any) => {
    const activePromo = isPromoActive(item);
    const displayPrice = activePromo ? item.promoPrice : price;

    return (
    <motion.div layout initial={false} animate={{ height: isSelected ? 'auto' : '9.5rem' }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="w-full">
        <Card onClick={onToggle} noPadding className={cn("flex h-full overflow-hidden relative border-2 active:scale-[0.98] transition-all", isSelected ? "border-primary bg-white shadow-xl shadow-primary/10" : "border-slate-100 bg-white hover:border-slate-200", activePromo && "promo-glowing-border")}>
          <AnimatePresence>
            {isSelected && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-2 right-2 z-20 bg-primary text-white px-2 py-1 rounded-lg shadow-lg border-2 border-white text-[10px] font-black italic">
                {fractionText || <Check size={12} strokeWidth={4} />}
              </motion.div>
            )}
            {activePromo && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="absolute top-2 left-2 z-20 bg-emerald-500 text-white px-2 py-0.5 rounded-md shadow-lg text-[8px] font-black uppercase tracking-tighter italic animate-pulse">
                Oferta
              </motion.div>
            )}
          </AnimatePresence>
          <div className="w-32 md:w-36 shrink-0 bg-slate-50 relative overflow-hidden border-r border-slate-50 min-h-[9.5rem]">
            {item.imageUrl ? <img src={getImageUrl(item.imageUrl)} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center w-full h-full text-slate-200"><PizzaIcon size={40} /></div>}
            {isSelected && <div className="absolute inset-0 bg-primary/10 backdrop-blur-[1px]" />}
          </div>
          <div className="flex flex-col flex-grow p-4 min-w-0 justify-between">
            <div className="space-y-1">
              <h3 className={cn("text-xs md:text-sm font-black uppercase italic tracking-tighter truncate", isSelected ? "text-primary" : "text-slate-900")}>{item.name}</h3>
              <p className={cn("text-[9px] md:text-[10px] text-slate-500 leading-relaxed font-medium uppercase tracking-tight", !isSelected && "line-clamp-2")}>{item.description}</p>
            </div>
            <div className="flex justify-between items-end mt-2">
                <div className="flex flex-col">
                    <span className="text-[7px] font-black text-slate-400 uppercase italic leading-none mb-1">Por apenas</span>
                    <div className="flex flex-col items-start gap-0">
                        {activePromo && (
                            <span className="text-[9px] font-bold text-slate-400 line-through decoration-rose-500/50 leading-none mb-0.5">
                                R$ {Number(price || 0).toFixed(2).replace('.', ',')}
                            </span>
                        )}
                        <div className="flex items-baseline gap-0.5">
                            <span className={cn("text-[9px] font-black", activePromo ? "text-emerald-600" : "text-primary")}>R$</span>
                            <span className={cn("text-lg font-black tracking-tighter italic", activePromo ? "text-emerald-600" : "text-slate-900")}>
                                {Number(displayPrice || 0).toFixed(2).replace('.', ',')}
                            </span>
                        </div>
                    </div>
                </div>
                {isSelected && showControls ? (
                  <div className="flex items-center bg-slate-50 rounded-xl p-0.5 border border-slate-100 shadow-inner" onClick={e => e.stopPropagation()}>
                    <button onClick={(e) => { e.stopPropagation(); onDecrement(); }} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500"><Minus size={12} strokeWidth={3} /></button>
                    <span className="w-5 text-center font-black text-xs text-slate-900 italic">{itemQty}</span>
                    <button onClick={(e) => { e.stopPropagation(); onIncrement(); }} className="w-7 h-7 flex items-center justify-center text-primary"><Plus size={12} strokeWidth={3} /></button>
                  </div>
                ) : isSelected && <div className="flex flex-col items-end gap-1"><span className="text-[7px] font-black text-primary uppercase tracking-[0.2em] italic">Ok</span><div className="w-8 h-1 bg-primary rounded-full animate-pulse" /></div>}
            </div>
          </div>
        </Card>
    </motion.div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && product && (
        <div className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-[8px]" />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 250 }} className="relative w-full max-w-6xl bg-slate-50 rounded-t-[2.5rem] md:rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[98vh] md:h-auto md:max-h-[94vh]">
            <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-6 right-6 z-50 rounded-2xl bg-white/10 text-white md:text-slate-900 md:bg-white shadow-2xl"><X size={24} strokeWidth={3} /></Button>
            <div className="w-full md:w-5/12 h-40 md:h-auto relative shrink-0">
              {product.imageUrl ? <img src={getImageUrl(product.imageUrl)} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400"><ShoppingBag size={80} /></div>}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent md:hidden" />
              <div className="absolute bottom-6 left-8 text-white md:hidden"><h3 className="text-3xl font-black italic uppercase tracking-tighter drop-shadow-2xl">{product.name}</h3></div>
            </div>
            <div className="w-full md:w-7/12 flex flex-col min-h-0 flex-1 bg-slate-50 relative">
              <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-10 custom-scrollbar pb-24">
                <div className="space-y-3 hidden md:block">
                  <h3 className="text-4xl md:text-5xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">{product.name}</h3>
                  <div className="h-1.5 w-20 bg-primary rounded-full" />
                  <p className="text-slate-500 text-sm font-bold leading-relaxed uppercase tracking-tight">{product.description}</p>
                </div>
                {product.sizes?.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><div className="w-1.5 h-4 bg-primary rounded-full shadow-lg shadow-primary/30" /> 1. Escolha o Tamanho</h4>
                    <div className="grid grid-cols-1 gap-1.5">
                      {product.sizes.map((size: any) => (
                        <Card key={size.id} onClick={() => setSelectedSize(size)} className={cn("flex items-center justify-between p-4 border-2 transition-all duration-300", selectedSize?.id === size.id ? "border-primary bg-primary/5 shadow-md" : "border-transparent bg-white hover:border-slate-200 shadow-sm")}>
                          <span className={cn("font-black text-sm uppercase tracking-tight", selectedSize?.id === size.id ? "text-primary" : "text-slate-700")}>{size.name}</span>
                          {!addonGroups.some(g => g.isFlavorGroup) && <span className="font-black text-slate-900 text-sm italic">R$ {size.price.toFixed(2).replace('.', ',')}</span>}
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
                {addonGroups.map((group) => {
                  const isFlavor = group.isFlavorGroup;
                  const limit = isFlavor ? (group.maxQuantity || 1) : (group.maxQuantity || 0);
                  const selectedInGroup = selectedAddons.filter(sa => group.addons.some(ga => ga.id === sa.id));
                  const totalInGroup = selectedInGroup.reduce((sum, a) => sum + (a.quantity || 0), 0);
                  const hasImages = group.addons.some(a => a.imageUrl);
                  return (
                    <div key={group.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><div className="w-1.5 h-4 bg-primary rounded-full shadow-lg shadow-primary/30" /> {group.name}</h4>
                        <div className="flex gap-2">
                          {isFlavor ? <span className={cn("text-[8px] px-2 py-1 rounded-md font-black uppercase tracking-widest border transition-all", totalInGroup === limit ? "bg-primary text-white border-primary" : "bg-white text-primary border-primary/20")}>Sabores: {totalInGroup}/{limit}</span> : <>
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
                          const activePromo = isPromoActive(addon);
                          
                          if (isFlavor || hasImages) {
                            return <FlavorCard key={addon.id} item={addon} isSelected={isSelected} onToggle={() => {
                              if (isSelected && isFlavor) return handleAddonQuantityChange(addon, -1, group);
                              if (isFlavor && totalInGroup >= config.maxFlavors) return toast.warning(`Limite de ${config.maxFlavors} sabores atingido.`);
                              handleAddonQuantityChange(addon, 1, group);
                            }} price={addon.price} quantity={currentQty} fractionText={fractionText} showControls={isSelected} onIncrement={() => handleAddonQuantityChange(addon, 1, group)} onDecrement={() => handleAddonQuantityChange(addon, -1, group)} />;
                          }
                          return (
                            <Card key={addon.id} onClick={() => handleAddonQuantityChange(addon, isSelected ? -currentQty : 1, group)} className={cn("flex items-center justify-between p-4 border-2 transition-all duration-300 relative", isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-white hover:border-slate-200 shadow-sm", activePromo && "promo-glowing-border")}>
                              {activePromo && (
                                <div className="absolute -top-1 -left-1 z-20 bg-emerald-500 text-white px-1.5 py-0.5 rounded-md shadow-lg text-[7px] font-black uppercase tracking-tighter italic animate-bounce">
                                  Oferta
                                </div>
                              )}
                              <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                                <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center transition-all", isSelected ? "border-primary bg-primary" : "border-slate-300")}>{isSelected && <Check size={12} className="text-white" strokeWidth={4} />}</div>
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={cn("font-black text-xs uppercase italic tracking-tighter truncate", isSelected ? "text-primary" : "text-slate-700")}>{addon.name}</span>
                                    {isSelected && isFlavor && <span className="text-[8px] font-black bg-primary text-white px-1 rounded italic">{fractionText}</span>}
                                  </div>
                                  {addon.description && <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight truncate">{addon.description}</p>}
                                  {addon.price > 0 && (
                                    <div className="flex items-center gap-2 mt-1">
                                      {isPromoActive(addon) ? (
                                        <>
                                          <span className="text-[9px] font-bold text-slate-400 line-through decoration-rose-500/50 uppercase italic">+ R$ {Number(addon.price).toFixed(2).replace('.', ',')}</span>
                                          <span className="text-[10px] font-black text-emerald-600 uppercase italic">+ R$ {Number(addon.promoPrice).toFixed(2).replace('.', ',')}</span>
                                        </>
                                      ) : (
                                        <span className="text-[9px] font-black text-slate-500 uppercase italic">+ R$ {Number(addon.price).toFixed(2).replace('.', ',')}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {isSelected && (
                                <div className="flex items-center bg-white rounded-xl p-1 border border-slate-100 shadow-sm" onClick={e => e.stopPropagation()}>
                                  <button onClick={() => handleAddonQuantityChange(addon, -1, group)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"><Minus size={12} strokeWidth={3} /></button>
                                  <span className="w-5 text-center font-black text-xs text-slate-900 italic">{currentQty}</span>
                                  <button onClick={() => handleAddonQuantityChange(addon, 1, group)} disabled={addon.maxQuantity > 0 && currentQty >= (addon.maxQuantity || 1)} className={cn("w-7 h-7 flex items-center justify-center", (addon.maxQuantity > 0 && currentQty >= (addon.maxQuantity || 1)) ? "text-slate-200" : "text-primary")}><Plus size={12} strokeWidth={3} /></button>
                                </div>
                              )}
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <div className="space-y-2 pb-2"><h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><div className="w-1.5 h-4 bg-amber-400 rounded-full shadow-lg shadow-amber-400/30" /> Alguma observação?</h4><textarea className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 text-xs font-medium text-slate-700 placeholder:text-slate-300 focus:border-primary outline-none transition-all resize-none shadow-sm" placeholder="Ex: Tirar cebola, maionese à parte..." rows={3} value={observations} onChange={(e) => setObservations(e.target.value)} /></div>
              </div>
              <div className="p-4 md:p-6 bg-white border-t border-slate-100 shadow-[0_-20px_50px_rgba(0,0,0,0.03)] sticky bottom-0"><div className="flex items-center gap-3"><div className="flex items-center bg-slate-100 rounded-[1rem] p-1 border border-slate-200 shadow-inner"><button onClick={() => handleQuantityChange(-1)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all"><Minus size={18} strokeWidth={3} /></button><span className="w-6 text-center font-black text-lg text-slate-900 italic">{quantity}</span><button onClick={() => handleQuantityChange(1)} className="w-10 h-10 flex items-center justify-center text-slate-900 transition-all"><Plus size={18} strokeWidth={3} /></button></div><Button 
    onClick={handleAddToCartClick} 
    disabled={isAdded || !isStoreOpen} 
    className={cn(
        "flex-1 h-12 md:h-14 rounded-[1.25rem] transition-all duration-500", 
        !isStoreOpen ? "bg-rose-50 text-rose-600 border-2 border-rose-100 shadow-none hover:bg-rose-50" : (isAdded ? "bg-emerald-500 shadow-emerald-100" : "bg-slate-900 shadow-slate-200")
    )}
>
    <div className="w-full flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
            {!isStoreOpen ? <Clock size={20} /> : (isAdded ? <Check size={24} strokeWidth={3} /> : <ShoppingBag size={20} />)}
            <span className="text-sm font-black uppercase tracking-widest italic">
                {!isStoreOpen ? 'LOJA FECHADA' : (isAdded ? 'ADICIONADO' : 'ADICIONAR')}
            </span>
        </div>
        <span className={cn("text-sm font-black italic px-3 py-1.5 rounded-xl backdrop-blur-sm", !isStoreOpen ? "bg-rose-100/50" : "bg-white/10")}>
            R$ {calculateCurrentPrice().toFixed(2).replace('.', ',')}
        </span>
    </div>
</Button></div></div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ProductDetailModal;
