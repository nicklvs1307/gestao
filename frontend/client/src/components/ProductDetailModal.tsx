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
import { getProducts } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  allProducts?: Product[]; // Lista completa para busca local de sabores
  onAddToCart: (
    product: Product, 
    quantity: number, 
    selectedSize: SizeOption | null, 
    selectedAddons: AddonOption[],
    selectedFlavors?: Product[],
    observations?: string
  ) => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ isOpen, onClose, product, allProducts = [], onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<AddonOption[]>([]);
  const [observations, setObservations] = useState('');
  const [isAdded, setIsAdded] = useState(false);
  
  const [availableFlavors, setAvailableFlavors] = useState<Product[]>([]);
  const [selectedFlavors, setSelectedFlavors] = useState<Product[]>([]);
  const [isLoadingFlavors, setIsLoadingFlavors] = useState(false);

  // LOGICA DE MERGE DE ADICIONAIS (Produto + Categorias)
  const addonGroups = React.useMemo(() => {
    if (!product) return [];
    
    // Grupos do produto
    const productGroups = product.addonGroups || [];
    
    // Grupos herdados das categorias
    const categoryGroups = (product.categories || [])
        .flatMap(cat => cat.addonGroups || []);
    
    // Merge removendo duplicatas por ID
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
      setSelectedFlavors([]);
      setObservations('');
      setIsAdded(false);

      if (product.pizzaConfig?.flavorCategoryId) {
        loadFlavors(product.pizzaConfig.flavorCategoryId);
      }
    }
  }, [isOpen, product]);

  const loadFlavors = (categoryId: string) => {
    setIsLoadingFlavors(true);
    try {
      // Filtrar localmente da lista de produtos já carregada (muito mais rápido)
      const flavors = allProducts.filter(p => {
        const hasCategory = p.categories?.some(c => c.id === categoryId) || p.categoryId === categoryId;
        return hasCategory && p.isAvailable;
      });
      
      setAvailableFlavors(flavors);
    } catch (error) {
      console.error("Erro ao carregar sabores:", error);
      toast.error("Não foi possível carregar os sabores.");
    } finally {
      setIsLoadingFlavors(false);
    }
  };

  const handleQuantityChange = (val: number) => {
      setQuantity(prev => Math.max(1, prev + val));
  };

  const handleAddonQuantityChange = (addon: AddonOption, delta: number, group: any) => {
    if (isAdded) return;
    
    const currentAddon = selectedAddons.find(a => a.id === addon.id);
    const currentQty = currentAddon?.quantity || 0;
    const newQty = Math.max(0, currentQty + delta);
    
    // 1. Verificar limite INDIVIDUAL do adicional
    const maxQty = addon.maxQuantity || 1;
    if (newQty > maxQty && delta > 0) return;

    // 2. Verificar limite TOTAL do GRUPO (Combo)
    if (delta > 0 && group.maxQuantity > 0) {
        const groupAddonIds = group.addons.map((a: any) => a.id);
        const currentGroupTotal = selectedAddons
            .filter(a => groupAddonIds.includes(a.id))
            .reduce((sum, a) => sum + (a.quantity || 0), 0);
        
        if (currentGroupTotal + delta > group.maxQuantity) {
            toast.warning(`O limite total para "${group.name}" é de ${group.maxQuantity} itens.`);
            return;
        }
    }

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

    // Lógica de Preço para Múltiplos Sabores (Pizza ou Grupos de Sabores)
    if ((product.pizzaConfig && selectedFlavors.length > 0)) {
      // Prioridade de Regra de Preço: 1. Categoria, 2. PizzaConfig, 3. 'higher' (default)
      const categoryRule = product.categories?.[0]?.halfAndHalfRule;
      const rule = categoryRule !== 'NONE' && categoryRule ? 
                  (categoryRule === 'HIGHER_VALUE' ? 'higher' : 'average') : 
                  (product.pizzaConfig?.priceRule || 'higher');

      const flavorPrices = selectedFlavors.map(f => {
        if (selectedSize) {
          // Busca o preço do sabor no tamanho selecionado
          const s = (f.sizes || []).find(sz => sz.name === selectedSize.name || sz.globalSizeId === selectedSize.globalSizeId);
          return s ? s.price : f.price;
        }
        return f.price;
      });

      if (flavorPrices.length > 0) {
        const calculatedFlavorPrice = rule === 'higher' ? 
            Math.max(...flavorPrices) : 
            flavorPrices.reduce((a, b) => a + b, 0) / flavorPrices.length;
        
        if (calculatedFlavorPrice > 0) {
            basePrice = calculatedFlavorPrice;
        } else if (selectedSize) {
            basePrice = selectedSize.price;
        }
      } else if (selectedSize) {
          basePrice = selectedSize.price;
      }
    } else if (selectedSize) {
      basePrice = selectedSize.price;
    }

    // Aplicar Promoção se houver
    const activePromotion = product.promotions?.find(p => p.isActive);
    if (activePromotion) {
        if (activePromotion.discountType === 'percentage') {
            basePrice = basePrice * (1 - activePromotion.discountValue / 100);
        } else if (activePromotion.discountType === 'fixed_amount') {
            basePrice = Math.max(0, basePrice - activePromotion.discountValue);
        }
    }

    let total = basePrice;
    total += selectedAddons.reduce((acc, addon) => acc + (addon.price * (addon.quantity || 1)), 0);
    return total * quantity;
  };

  const handleAddToCartClick = () => {
    if (isAdded || !product) return;
    if (product.pizzaConfig && selectedFlavors.length === 0) {
      toast.warning("Por favor, selecione pelo menos 1 sabor.");
      return;
    }
    
    // Validação de Grupos de Adicionais e Sabores
    const groups = addonGroups;
    for (const group of groups) {
      const groupAddons = group.addons || [];
      const selectedInGroup = selectedAddons.filter(sa => groupAddons.some(ga => ga.id === sa.id));
      const totalSelectedInGroup = selectedInGroup.reduce((sum, a) => sum + (a.quantity || 0), 0);

      // Validação de Mínimo
      if (group.isRequired || (group.minQuantity && group.minQuantity > 0)) {
        const min = group.minQuantity || 1;
        if (totalSelectedInGroup < min) {
          toast.warning(`Por favor, selecione pelo menos ${min} item(ns) em "${group.name}"`);
          return;
        }
      }

      // Validação de Máximo (Segurança extra no clique)
      if (group.maxQuantity && group.maxQuantity > 0) {
        if (totalSelectedInGroup > group.maxQuantity) {
          toast.warning(`Você selecionou itens demais em "${group.name}". O limite é ${group.maxQuantity}.`);
          return;
        }
      }
    }
    onAddToCart(product, quantity, selectedSize, selectedAddons, selectedFlavors, observations);
    setIsAdded(true);
    toast.success("Adicionado ao pedido!");
    setTimeout(onClose, 800);
  };

  const sizes = product?.sizes || [];

  // Componente de Card de Sabor para Reuso (Réplica exata do DeliveryProductCard)
  const FlavorCard = ({ item, isSelected, onToggle, price }: { item: any, isSelected: boolean, onToggle: () => void, price?: number }) => (
    <Card 
        onClick={onToggle} 
        noPadding
        className={cn(
            "flex h-36 overflow-hidden relative active:scale-[0.98] transition-all duration-300 border-2 group", 
            isSelected ? "border-primary bg-white shadow-xl shadow-primary/10 scale-[1.02] z-10" : "border-slate-100 bg-white hover:border-slate-200"
        )}
    >
      {/* Badge de Seleção com Blur */}
      <AnimatePresence mode="wait">
        {isSelected && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute top-2 right-2 z-20 bg-primary text-white p-1.5 rounded-full shadow-lg border-2 border-white"
            >
                <Check size={14} strokeWidth={4} />
            </motion.div>
        )}
      </AnimatePresence>

      {/* Imagem Estilo Borda Infinita (Esquerda) */}
      <div className="w-36 h-full shrink-0 bg-slate-50 relative overflow-hidden border-r border-slate-50">
        {item.imageUrl ? (
          <>
            <img 
              src={item.imageUrl} 
              alt={item.name} 
              className={cn(
                "w-full h-full object-cover transition-transform duration-700 group-hover:scale-110",
                isSelected && "scale-110"
              )} 
            />
            {/* Overlay sutil para integração da imagem */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/10" />
          </>
        ) : (
          <div className="flex items-center justify-center w-full h-full text-slate-200">
             <ShoppingBag size={40} strokeWidth={1} />
          </div>
        )}
        
        {isSelected && <div className="absolute inset-0 bg-primary/10 backdrop-blur-[1px]" />}
      </div>
      
      {/* Conteúdo à Direita */}
      <div className="flex flex-col flex-grow p-4 min-w-0 justify-between">
          <div className="space-y-1">
              <h3 className={cn(
                "text-sm font-black leading-tight uppercase italic tracking-tighter truncate",
                isSelected ? "text-primary" : "text-slate-900"
              )}>
                {item.name}
              </h3>
              <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed font-medium uppercase tracking-tight opacity-80">
                {item.description}
              </p>
          </div>
          
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
                 {price !== undefined && price > 0 && (
                   <div className="flex items-baseline gap-1">
                      <span className="text-xs font-black text-primary">R$</span>
                      <span className="text-xl font-black text-slate-900 tracking-tighter italic">
                          {price.toFixed(2).replace('.', ',')}
                      </span>
                   </div>
                 )}
            </div>
            
            {isSelected && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em] italic">Ok</span>
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
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-[8px]" 
          />
          
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 250 }}
            className="relative w-full max-w-6xl bg-slate-50 rounded-t-[2.5rem] md:rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[98vh] md:h-auto md:max-h-[94vh] border-t md:border border-white/20"
          >
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-14 h-1.5 bg-slate-200/50 rounded-full z-50 md:hidden" />
            
            <Button 
                variant="ghost"
                size="icon"
                onClick={onClose} 
                className="absolute top-6 right-6 z-50 rounded-2xl bg-white/10 backdrop-blur-2xl text-white md:text-slate-900 md:bg-white md:shadow-2xl md:border md:border-slate-100 hover:scale-110 transition-all active:scale-95"
            >
                <X size={24} strokeWidth={3} />
            </Button>

            <div className="w-full md:w-5/12 h-40 md:h-auto relative shrink-0">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
                  <ShoppingBag size={80} strokeWidth={1} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent md:hidden" />
              <div className="absolute bottom-6 left-8 text-white md:hidden">
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter drop-shadow-2xl">{product.name}</h3>
              </div>
            </div>

            <div className="w-full md:w-7/12 flex flex-col min-h-0 flex-1 bg-slate-50 relative">
              <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-10 custom-scrollbar pb-20">
                <div className="space-y-3 hidden md:block">
                  <h3 className="text-4xl md:text-5xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">{product.name}</h3>
                  <div className="h-1.5 w-20 bg-primary rounded-full" />
                  <p className="text-slate-500 text-sm font-bold leading-relaxed max-w-2xl uppercase tracking-tight">{product.description}</p>
                </div>

                <div className="space-y-2 md:hidden">
                   <p className="text-slate-500 text-[10px] font-bold leading-relaxed uppercase tracking-tight">{product.description}</p>
                </div>

                {/* SEÇÃO DE TAMANHOS */}
                {sizes.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-primary rounded-full shadow-lg shadow-primary/30" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">1. Escolha o Tamanho</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
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
                    <div className="flex items-center justify-between bg-slate-100/50 p-3 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2">
                            <PizzaIcon className="text-primary" size={20} />
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">2. Escolha os Sabores</h4>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Até {getMaxFlavors()} opções</p>
                            </div>
                        </div>
                        {selectedFlavors.length > 0 && (
                            <div className="bg-primary text-white px-3 py-1.5 rounded-xl font-black text-[10px] italic shadow-lg shadow-primary/20">
                                {selectedFlavors.length}/{getMaxFlavors()} SELECIONADO
                            </div>
                        )}
                    </div>
                    
                    {isLoadingFlavors ? (
                      <div className="py-8 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {availableFlavors.map(flavor => {
                          const isSelected = selectedFlavors.some(f => f.id === flavor.id);
                          const flavorPrice = selectedSize ? 
                            ((flavor.sizes || []).find(s => s.name === selectedSize.name || s.globalSizeId === selectedSize.globalSizeId)?.price || flavor.price) : 
                            flavor.price;
                          
                          return (
                            <FlavorCard 
                                key={flavor.id}
                                item={flavor}
                                isSelected={isSelected}
                                onToggle={() => handleFlavorToggle(flavor)}
                                price={flavorPrice}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ADICIONAIS / GRUPOS DE SABORES */}
                {addonGroups.map((group) => {
                  const isFlavorType = group.isFlavorGroup;
                  
                  return (
                    <div key={group.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                              <div className="w-1.5 h-4 bg-primary rounded-full shadow-lg shadow-primary/30" />
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{group.name}</h4>
                          </div>
                          <div className="flex gap-2">
                            {group.isRequired && <span className="text-[8px] bg-orange-500 text-white px-2 py-1 rounded-md font-black uppercase tracking-widest">Obrigatório</span>}
                            {group.maxQuantity! > 1 && <span className="text-[8px] bg-slate-900 text-white px-2 py-1 rounded-md font-black uppercase tracking-widest">Até {group.maxQuantity} itens</span>}
                          </div>
                      </div>

                      {isFlavorType ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(group.addons || []).map(addon => {
                            const selectedAddon = selectedAddons.find(a => a.id === addon.id);
                            const isSelected = !!selectedAddon;
                            
                            return (
                                <FlavorCard 
                                    key={addon.id}
                                    item={addon}
                                    isSelected={isSelected}
                                    onToggle={() => handleAddonQuantityChange(addon, isSelected ? -1 : 1, group)}
                                    price={addon.price}
                                />
                            );
                          })}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-1.5">
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
                                <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => handleAddonQuantityChange(addon, isSelected ? -currentQty : 1, group)}>
                                   <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-300", isSelected ? "border-primary bg-primary" : "border-slate-300")}>
                                      {isSelected && <Check size={12} className="text-white" strokeWidth={4} />}
                                   </div>
                                   <div className="flex flex-col leading-tight">
                                    <span className={cn("font-black text-xs uppercase italic tracking-tighter", isSelected ? "text-primary" : "text-slate-700")}>{addon.name}</span>
                                    {addon.price > 0 && <span className="text-[9px] font-black text-slate-400 mt-1 uppercase">+ R$ {addon.price.toFixed(2).replace('.', ',')}</span>}
                                   </div>
                                </div>
                                
                                {isSelected && (maxQty > 1 || (group.maxQuantity && group.maxQuantity > 1)) && (
                                  <div className="flex items-center bg-white rounded-xl p-1 border border-slate-100 shadow-sm ml-2">
                                    <button onClick={() => handleAddonQuantityChange(addon, -1, group)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"><Minus size={14} strokeWidth={3} /></button>
                                    <span className="w-6 text-center font-black text-sm text-slate-900 italic">{currentQty}</span>
                                    <button onClick={() => handleAddonQuantityChange(addon, 1, group)} disabled={currentQty >= maxQty} className={cn("w-8 h-8 flex items-center justify-center transition-colors", currentQty >= maxQty ? "text-slate-200" : "text-primary hover:text-primary/80")}><Plus size={14} strokeWidth={3} /></button>
                                  </div>
                                )}
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* CAMPO DE OBSERVAÇÕES */}
                <div className="space-y-2 pb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-amber-400 rounded-full shadow-lg shadow-amber-400/30" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Alguma observação?</h4>
                    </div>
                    <textarea 
                        className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 text-xs font-medium text-slate-700 placeholder:text-slate-300 focus:border-primary outline-none transition-all resize-none shadow-sm"
                        placeholder="Ex: Tirar cebola, maionese à parte, ponto da carne, etc..."
                        rows={3}
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                    />
                </div>
              </div>

              {/* RODAPÉ FIXO */}
              <div className="p-4 md:p-6 bg-white border-t border-slate-100 shadow-[0_-20px_50px_rgba(0,0,0,0.03)] sticky bottom-0">
                 <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-100 rounded-[1rem] p-1 border border-slate-200 shadow-inner">
                       <button onClick={() => handleQuantityChange(-1)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-all"><Minus size={18} strokeWidth={3} /></button>
                       <span className="w-6 text-center font-black text-lg text-slate-900 italic">{quantity}</span>
                       <button onClick={() => handleQuantityChange(1)} className="w-10 h-10 flex items-center justify-center text-slate-900 hover:bg-white rounded-lg transition-all"><Plus size={18} strokeWidth={3} /></button>
                    </div>
                    
                    <Button 
                        onClick={handleAddToCartClick} 
                        disabled={isAdded} 
                        className={cn(
                            "flex-1 h-12 md:h-14 rounded-[1.25rem] shadow-xl transition-all duration-500", 
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
