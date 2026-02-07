import React, { useState, useEffect } from 'react';
import type { Product, SizeOption, AddonOption } from '../types';
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
import { getProducts } from '../services/api';
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

  const handleAddonQuantityChange = (addon: AddonOption, delta: number) => {
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
            className="relative w-full max-w-5xl bg-slate-50 rounded-t-[2.5rem] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[96vh] md:h-auto md:max-h-[90vh]"
          >
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-200 rounded-full z-50 md:hidden" />
            
            <Button 
                variant="ghost"
                size="icon"
                onClick={onClose} 
                className="absolute top-4 right-4 z-50 rounded-full bg-white/20 backdrop-blur-xl text-white md:text-slate-900 md:bg-white md:shadow-md"
            >
                <X size={20} strokeWidth={3} />
            </Button>

            <div className="w-full md:w-5/12 h-64 md:h-auto relative shrink-0">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
                  <ShoppingBag size={64} strokeWidth={1} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent md:hidden" />
              <div className="absolute bottom-4 left-6 text-white md:hidden">
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter drop-shadow-md">{product.name}</h3>
              </div>
            </div>

            <div className="w-full md:w-7/12 flex flex-col min-h-0 flex-1 bg-slate-50 relative">
              <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 custom-scrollbar">
                <div className="space-y-4 hidden md:block">
                  <h3 className="text-4xl md:text-5xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">{product.name}</h3>
                  <p className="text-slate-500 text-base font-medium leading-relaxed max-w-xl">{product.description}</p>
                </div>

                <div className="space-y-4 md:hidden">
                   <p className="text-slate-500 text-sm font-medium leading-relaxed">{product.description}</p>
                </div>

                {/* SEÇÃO DE TAMANHOS */}
                {sizes.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-5 bg-primary rounded-full shadow-lg shadow-primary/30" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">1. Escolha o Tamanho</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {sizes.map(size => {
                        const isSelected = selectedSize?.id === size.id;
                        return (
                          <Card 
                            key={size.id} 
                            onClick={() => setSelectedSize(size)} 
                            className={cn(
                                "flex items-center justify-between p-4 border-2 transition-all duration-300", 
                                isSelected ? "border-primary bg-primary/5 shadow-md" : "border-transparent bg-white hover:border-slate-200"
                            )}
                          >
                            <span className={cn("font-black text-sm uppercase tracking-tight", isSelected ? "text-primary" : "text-slate-700")}>{size.name}</span>
                            {!product.pizzaConfig && <span className="font-black text-slate-900 text-sm italic">R$ {size.price.toFixed(2).replace('.', ',')}</span>}
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SEÇÃO DE SABORES (PIZZA) */}
                {product.pizzaConfig && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <PizzaIcon className="text-primary" size={20} />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">2. Escolha os Sabores</h4>
                        </div>
                        <span className="text-[8px] bg-slate-900 text-white px-2 py-1 rounded-md font-black uppercase tracking-widest shadow-sm">Até {getMaxFlavors()} opções</span>
                    </div>
                    {isLoadingFlavors ? (
                      <div className="py-8 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {availableFlavors.map(flavor => {
                          const isSelected = selectedFlavors.some(f => f.id === flavor.id);
                          const flavorPrice = selectedSize ? ((flavor.sizes || []).find(s => s.name === selectedSize.name)?.price || flavor.price) : flavor.price;
                          return (
                            <Card 
                                key={flavor.id} 
                                onClick={() => handleFlavorToggle(flavor)} 
                                className={cn(
                                    "flex items-center justify-between p-4 border-2 transition-all duration-300", 
                                    isSelected ? "border-primary bg-white shadow-lg shadow-primary/5 scale-[1.01]" : "border-transparent bg-white hover:border-slate-200"
                                )}
                            >
                              <div className="flex items-center gap-4">
                                 <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-300", isSelected ? "border-primary bg-primary" : "border-slate-300")}>
                                    {isSelected && <Check size={12} className="text-white" strokeWidth={4} />}
                                 </div>
                                 <div className="text-left">
                                    <span className={cn("font-black text-sm uppercase italic tracking-tighter block leading-none", isSelected ? "text-primary" : "text-slate-700")}>{flavor.name}</span>
                                    {flavor.description && <span className="text-[10px] text-slate-400 font-medium line-clamp-1 mt-1">{flavor.description}</span>}
                                 </div>
                              </div>
                              <span className="text-xs font-black text-slate-900 italic">R$ {flavorPrice.toFixed(2).replace('.', ',')}</span>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ADICIONAIS */}
                {addonGroups.map((group) => (
                  <div key={group.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-5 bg-primary rounded-full shadow-lg shadow-primary/30" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{group.name}</h4>
                        </div>
                        {group.isRequired && <span className="text-[8px] bg-orange-500 text-white px-2 py-1 rounded-md font-black uppercase tracking-widest">Obrigatório</span>}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {(group.addons || []).map(addon => {
                        const selectedAddon = selectedAddons.find(a => a.id === addon.id);
                        const isSelected = !!selectedAddon;
                        const currentQty = selectedAddon?.quantity || 0;
                        const maxQty = addon.maxQuantity || 1;

                        return (
                          <Card 
                            key={addon.id} 
                            className={cn(
                                "flex items-center justify-between p-4 border-2 transition-all duration-300", 
                                isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-white hover:border-slate-200"
                            )}
                          >
                            <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => handleAddonQuantityChange(addon, isSelected ? -currentQty : 1)}>
                               <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-300", isSelected ? "border-primary bg-primary" : "border-slate-300")}>
                                  {isSelected && <Check size={12} className="text-white" strokeWidth={4} />}
                               </div>
                               <div className="flex flex-col leading-none">
                                <span className={cn("font-black text-sm uppercase italic tracking-tighter", isSelected ? "text-primary" : "text-slate-700")}>{addon.name}</span>
                                {addon.price > 0 && <span className="text-[10px] font-black text-slate-400 mt-1">+ R$ {addon.price.toFixed(2).replace('.', ',')}</span>}
                               </div>
                            </div>
                            
                            {isSelected && maxQty > 1 && (
                              <div className="flex items-center bg-white rounded-xl p-1 border border-slate-100 shadow-sm ml-4">
                                <button onClick={() => handleAddonQuantityChange(addon, -1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"><Minus size={14} strokeWidth={3} /></button>
                                <span className="w-6 text-center font-black text-sm text-slate-900 italic">{currentQty}</span>
                                <button onClick={() => handleAddonQuantityChange(addon, 1)} disabled={currentQty >= maxQty} className={cn("w-8 h-8 flex items-center justify-center transition-colors", currentQty >= maxQty ? "text-slate-200" : "text-primary hover:text-primary/80")}><Plus size={14} strokeWidth={3} /></button>
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* RODAPÉ FIXO */}
              <div className="p-6 md:p-10 bg-white border-t border-slate-100 shadow-[0_-20px_50px_rgba(0,0,0,0.03)] sticky bottom-0">
                 <div className="flex items-center gap-4">
                    <div className="flex items-center bg-slate-100 rounded-[1.25rem] p-1 border border-slate-200 shadow-inner">
                       <button onClick={() => handleQuantityChange(-1)} className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-white rounded-xl transition-all"><Minus size={20} strokeWidth={3} /></button>
                       <span className="w-8 text-center font-black text-xl text-slate-900 italic">{quantity}</span>
                       <button onClick={() => handleQuantityChange(1)} className="w-12 h-12 flex items-center justify-center text-slate-900 hover:bg-white rounded-xl transition-all"><Plus size={20} strokeWidth={3} /></button>
                    </div>
                    
                    <Button 
                        onClick={handleAddToCartClick} 
                        disabled={isAdded} 
                        className={cn(
                            "flex-1 h-14 md:h-16 rounded-[1.5rem] shadow-xl transition-all duration-500", 
                            isAdded ? "bg-emerald-500 shadow-emerald-100" : "bg-slate-900 shadow-slate-200"
                        )}
                    >
                      <div className="w-full flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                          {isAdded ? <Check size={24} strokeWidth={3} /> : <ShoppingBag size={20} />}
                          <span className="text-sm font-black uppercase tracking-widest italic">{isAdded ? 'ADICIONADO' : 'ADICIONAR'}</span>
                        </div>
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
