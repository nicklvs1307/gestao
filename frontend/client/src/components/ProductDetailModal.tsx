import React, { useState, useEffect } from 'react';
import type { Product, SizeOption, AddonOption } from '../types';
import { 
  X, 
  Minus, 
  Plus, 
  Check, 
  ShoppingBag,
  Pizza as PizzaIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getProducts } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onAddToCart: (
    product: Product, 
    quantity: number, 
    selectedSize: SizeOption | null, 
    selectedAddons: AddonOption[],
    selectedFlavors?: Product[]
  ) => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ isOpen, onClose, product, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<AddonOption[]>([]);
  const [isAdded, setIsAdded] = useState(false);
  
  const [availableFlavors, setAvailableFlavors] = useState<Product[]>([]);
  const [selectedFlavors, setSelectedFlavors] = useState<Product[]>([]);
  const [isLoadingFlavors, setIsLoadingFlavors] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      const sizes = product.sizes || [];
      setSelectedSize(sizes.length > 0 ? sizes[0] : null);
      setSelectedAddons([]);
      setSelectedFlavors([]);
      setIsAdded(false);

      if (product.pizzaConfig?.flavorCategoryId) {
        loadFlavors(product.restaurantId, product.pizzaConfig.flavorCategoryId);
      }
    }
  }, [isOpen, product]);

  const loadFlavors = async (restaurantId: string, categoryId: string) => {
    setIsLoadingFlavors(true);
    try {
      const allProducts = await getProducts(restaurantId);
      const flavors = allProducts.filter(p => p.categoryId === categoryId && p.isAvailable);
      setAvailableFlavors(flavors);
    } catch (error) {
      console.error("Erro ao carregar sabores:", error);
    } finally {
      setIsLoadingFlavors(false);
    }
  };

  const handleQuantityChange = (val: number) => {
      setQuantity(prev => Math.max(1, prev + val));
  };

  const handleAddonQuantityChange = (addon: AddonOption, delta: number, type: string) => {
    if (isAdded) return;
    
    const currentAddon = selectedAddons.find(a => a.id === addon.id);
    const currentQty = currentAddon?.quantity || 0;
    const newQty = Math.max(0, currentQty + delta);
    const maxQty = addon.maxQuantity || 1;

    if (newQty > maxQty && delta > 0) return;

    if (newQty === 0) {
      setSelectedAddons(prev => prev.filter(a => a.id !== addon.id));
    } else {
      if (currentAddon) {
        setSelectedAddons(prev => prev.map(a => a.id === addon.id ? { ...a, quantity: newQty } : a));
      } else {
        setSelectedAddons(prev => [...prev, { ...addon, quantity: newQty }]);
      }
    }
  };

  const getMaxFlavors = () => {
    if (!product?.pizzaConfig || !selectedSize) return 1;
    const sizeConfig = product.pizzaConfig.sizes ? product.pizzaConfig.sizes[selectedSize.name] : null;
    return sizeConfig?.maxFlavors || product.pizzaConfig.maxFlavors || 1;
  };

  const handleFlavorToggle = (flavor: Product) => {
    if (isAdded) return;
    const max = getMaxFlavors();
    const isSelected = selectedFlavors.some(f => f.id === flavor.id);
    if (isSelected) {
      setSelectedFlavors(prev => prev.filter(f => f.id !== flavor.id));
    } else {
      if (selectedFlavors.length < max) {
        setSelectedFlavors(prev => [...prev, flavor]);
      } else if (max === 1) {
        setSelectedFlavors([flavor]);
      }
    }
  };

  const calculateCurrentPrice = () => {
    if (!product) return 0;
    let basePrice = product.price;
    if (product.pizzaConfig && selectedFlavors.length > 0) {
      const rule = product.pizzaConfig.priceRule || 'higher';
      const flavorPrices = selectedFlavors.map(f => {
        if (selectedSize) {
          const s = (f.sizes || []).find(sz => sz.name === selectedSize.name);
          return s ? s.price : f.price;
        }
        return f.price;
      });
      const calculatedFlavorPrice = rule === 'higher' ? Math.max(...flavorPrices) : flavorPrices.reduce((a, b) => a + b, 0) / flavorPrices.length;
      if (calculatedFlavorPrice > 0) {
          basePrice = calculatedFlavorPrice;
      } else if (selectedSize) {
          basePrice = selectedSize.price;
      }
    } else if (selectedSize) {
      basePrice = selectedSize.price;
    }
    let total = basePrice;
    total += selectedAddons.reduce((acc, addon) => acc + (addon.price * (addon.quantity || 1)), 0);
    return total * quantity;
  };

  const handleAddToCartClick = () => {
    if (isAdded || !product) return;
    if (product.pizzaConfig && selectedFlavors.length === 0) {
      alert("Por favor, selecione pelo menos 1 sabor.");
      return;
    }
    const groups = product.addonGroups || [];
    for (const group of groups) {
      if (group.isRequired) {
        const addons = group.addons || [];
        const hasSelection = addons.some(addon => selectedAddons.some(sa => sa.id === addon.id));
        if (!hasSelection) {
          alert(`Por favor, selecione uma opção em "${group.name}"`);
          return;
        }
      }
    }
    onAddToCart(product, quantity, selectedSize, selectedAddons, selectedFlavors);
    setIsAdded(true);
    setTimeout(onClose, 800);
  };

  const sizes = product?.sizes || [];
  const addonGroups = product?.addonGroups || [];

  return (
    <AnimatePresence>
      {isOpen && product && (
        <div className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-[6px]" 
          />
          
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 150) onClose();
            }}
            className="relative w-full max-w-5xl bg-white rounded-t-[2.5rem] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[96vh] md:h-auto md:max-h-[90vh]"
          >
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-300 rounded-full z-50 md:hidden" />
            
            <button 
                onClick={onClose} 
                className="absolute top-4 right-4 z-50 w-10 h-10 bg-black/20 backdrop-blur-xl rounded-full flex items-center justify-center text-white md:text-slate-900 md:bg-slate-100 md:hover:bg-slate-200 transition-all active:scale-90"
            >
                <X size={20} strokeWidth={3} />
            </button>

            <div className="w-full md:w-5/12 h-60 md:h-auto relative shrink-0">
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent md:hidden" />
              <div className="absolute bottom-4 left-5 text-white md:hidden">
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter drop-shadow-lg">{product.name}</h3>
              </div>
            </div>

            <div className="w-full md:w-7/12 flex flex-col min-h-0 flex-1 bg-white relative">
              <div className="flex-1 overflow-y-auto p-5 md:p-12 space-y-8 scroll-smooth no-scrollbar">
                <div className="space-y-4 hidden md:block">
                  <h3 className="text-4xl md:text-5xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">{product.name}</h3>
                  <p className="text-slate-500 text-base md:text-lg font-medium leading-relaxed max-w-xl">{product.description}</p>
                </div>

                <div className="space-y-4 md:hidden">
                   <p className="text-slate-500 text-sm font-medium leading-relaxed">{product.description}</p>
                </div>

                {sizes.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-6 bg-primary rounded-full shadow-lg shadow-primary/30" />
                        <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Tamanho</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {sizes.map(size => {
                        const isSelected = selectedSize?.id === size.id;
                        return (
                          <motion.button 
                            key={size.id} 
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedSize(size)} 
                            className={cn(
                                "flex items-center justify-between p-5 rounded-[2rem] border-2 transition-all duration-300", 
                                isSelected ? "border-primary bg-primary/5 shadow-inner" : "border-slate-100 bg-slate-50/50 hover:border-slate-200"
                            )}
                          >
                            <span className={cn("font-black text-lg italic uppercase tracking-tight", isSelected ? "text-primary" : "text-slate-700")}>{size.name}</span>
                            {!product.pizzaConfig && <span className="font-black text-slate-900 text-lg">R$ {size.price.toFixed(2).replace('.', ',')}</span>}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {product.pizzaConfig && (
                  <div className="space-y-6 bg-slate-50 p-6 rounded-[3rem] border border-slate-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <PizzaIcon className="text-primary" size={24} />
                            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">Sabores</h4>
                        </div>
                        <span className="text-[10px] bg-primary text-white px-3 py-1.5 rounded-full font-black italic tracking-widest shadow-lg shadow-primary/20">ATÉ {getMaxFlavors()} SABORES</span>
                    </div>
                    {isLoadingFlavors ? <div className="py-8 text-center text-sm font-bold text-slate-400 animate-pulse">Buscando sabores especiais...</div> : (
                      <div className="grid grid-cols-1 gap-3">
                        {availableFlavors.map(flavor => {
                          const isSelected = selectedFlavors.some(f => f.id === flavor.id);
                          const flavorPrice = selectedSize ? ((flavor.sizes || []).find(s => s.name === selectedSize.name)?.price || flavor.price) : flavor.price;
                          return (
                            <motion.button 
                                key={flavor.id} 
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleFlavorToggle(flavor)} 
                                className={cn(
                                    "flex items-center justify-between p-5 rounded-[2rem] border-2 transition-all duration-300", 
                                    isSelected ? "border-primary bg-white shadow-xl shadow-primary/5 scale-[1.02]" : "border-transparent bg-white/80 hover:border-slate-200"
                                )}
                            >
                              <div className="flex items-center gap-4">
                                 <div className={cn("w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all duration-300", isSelected ? "border-primary bg-primary rotate-90" : "border-slate-300")}>
                                    {isSelected && <Check size={14} className="text-white" strokeWidth={4} />}
                                 </div>
                                 <div className="text-left">
                                    <span className={cn("font-black text-base uppercase italic tracking-tighter block", isSelected ? "text-primary" : "text-slate-700")}>{flavor.name}</span>
                                    {flavor.description && <span className="text-xs text-slate-400 font-medium line-clamp-1">{flavor.description}</span>}
                                 </div>
                              </div>
                              <span className="text-sm font-black text-slate-900">R$ {flavorPrice.toFixed(2).replace('.', ',')}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {addonGroups.map((group) => (
                  <div key={group.id} className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-6 bg-primary rounded-full shadow-lg shadow-primary/30" />
                            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">{group.name}</h4>
                        </div>
                        {group.isRequired && <span className="text-[10px] bg-orange-500 text-white px-3 py-1.5 rounded-full font-black italic tracking-widest shadow-lg shadow-orange-200">OBRIGATÓRIO</span>}
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {(group.addons || []).map(addon => {
                        const selectedAddon = selectedAddons.find(a => a.id === addon.id);
                        const isSelected = !!selectedAddon;
                        const currentQty = selectedAddon?.quantity || 0;
                        const maxQty = addon.maxQuantity || 1;

                        return (
                          <motion.div 
                            key={addon.id} 
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                                "flex items-center justify-between p-5 rounded-[2rem] border-2 transition-all duration-300", 
                                isSelected ? "border-primary bg-primary/5 shadow-inner" : "border-slate-100 bg-slate-50/50 hover:border-slate-200"
                            )}
                          >
                            <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => handleAddonQuantityChange(addon, isSelected ? -currentQty : 1, group.type)}>
                               <div className={cn("w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all duration-300", isSelected ? "border-primary bg-primary" : "border-slate-300")}>
                                  {isSelected && <Check size={14} className="text-white" strokeWidth={4} />}
                               </div>
                               <div className="flex flex-col">
                                <span className={cn("font-black text-base uppercase italic tracking-tighter", isSelected ? "text-primary" : "text-slate-700")}>{addon.name}</span>
                                {addon.price > 0 && <span className="text-xs font-black text-slate-400">+ R$ {addon.price.toFixed(2).replace('.', ',')}</span>}
                               </div>
                            </div>
                            
                            {isSelected && maxQty > 1 && (
                              <motion.div 
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex items-center bg-white rounded-2xl p-1.5 border border-primary/20 shadow-xl"
                              >
                                <button onClick={() => handleAddonQuantityChange(addon, -1, group.type)} className="w-10 h-10 flex items-center justify-center text-primary hover:bg-primary/5 rounded-xl transition-colors"><Minus size={18} strokeWidth={3} /></button>
                                <span className="w-8 text-center font-black text-lg text-slate-900 italic">{currentQty}</span>
                                <button onClick={() => handleAddonQuantityChange(addon, 1, group.type)} disabled={currentQty >= maxQty} className={cn("w-10 h-10 flex items-center justify-center rounded-xl transition-colors", currentQty >= maxQty ? "text-slate-200" : "text-primary hover:bg-primary/5")}><Plus size={18} strokeWidth={3} /></button>
                              </motion.div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-5 md:p-12 bg-white/80 backdrop-blur-2xl border-t border-slate-100 shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.05)]">
                 <div className="flex items-center gap-4">
                    <div className="flex items-center bg-slate-100 rounded-2xl p-1">
                       <button onClick={() => handleQuantityChange(-1)} className="w-10 h-10 flex items-center justify-center text-slate-900 hover:bg-white rounded-full transition-all shadow-sm"><Minus size={18} strokeWidth={2.5} /></button>
                       <span className="w-8 text-center font-black text-xl text-slate-900 italic">{quantity}</span>
                       <button onClick={() => handleQuantityChange(1)} className="w-10 h-10 flex items-center justify-center text-slate-900 hover:bg-white rounded-full transition-all shadow-sm"><Plus size={18} strokeWidth={2.5} /></button>
                    </div>
                    <motion.button 
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAddToCartClick} 
                        disabled={isAdded} 
                        className={cn(
                            "flex-1 h-14 md:h-20 flex items-center justify-between px-6 md:px-8 rounded-[1.5rem] md:rounded-[2.5rem] font-black text-base md:text-lg uppercase italic tracking-widest shadow-2xl transition-all duration-500", 
                            isAdded ? "bg-green-500 text-white" : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/30"
                        )}
                    >
                      <div className="flex items-center gap-2">
                        {isAdded ? <Check size={24} strokeWidth={3} /> : <ShoppingBag size={20} />}
                        <span>{isAdded ? 'OK' : 'PEDIR'}</span>
                      </div>
                      <span className="bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-sm border border-white/5 text-sm">R$ {calculateCurrentPrice().toFixed(2).replace('.', ',')}</span>
                    </motion.button>
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