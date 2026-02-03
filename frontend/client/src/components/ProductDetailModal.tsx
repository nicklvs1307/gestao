import React, { useState, useEffect } from 'react';
import type { Product, SizeOption, AddonOption } from '../types';
import { 
  X, 
  Minus, 
  Plus, 
  Check, 
  ShoppingBag,
  Pizza as PizzaIcon,
  Info,
  Tag
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getProducts } from '../services/api';

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
  
  // Estados para Pizza
  const [availableFlavors, setAvailableFlavors] = useState<Product[]>([]);
  const [selectedFlavors, setSelectedFlavors] = useState<Product[]>([]);
  const [isLoadingFlavors, setIsLoadingFlavors] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      // SEGURANÇA: Verifica se sizes existe antes de acessar length
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
        if (type === 'single') {
          // Para 'single', poderíamos remover outros do mesmo grupo se tivéssemos o groupId. 
          // Como não temos fácil aqui sem mudar mais coisas, vamos apenas adicionar.
          setSelectedAddons(prev => [...prev, { ...addon, quantity: newQty }]);
        } else {
          setSelectedAddons(prev => [...prev, { ...addon, quantity: newQty }]);
        }
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
      
      // PROTEÇÃO: Se o cálculo dos sabores der 0 (ex: sabores sem custo extra), mantém o preço do tamanho selecionado
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
    // Validação de Adicionais Obrigatórios com segurança
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

  if (!isOpen || !product) return null;

  const sizes = product.sizes || [];
  const addonGroups = product.addonGroups || [];

  return (
    <div className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-5xl bg-white rounded-t-[32px] md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[92vh] md:h-auto md:max-h-[90vh] animate-in slide-in-from-bottom duration-300">
        <button onClick={onClose} className="absolute top-4 right-4 z-50 w-10 h-10 bg-black/10 hover:bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all active:scale-90"><X size={20} strokeWidth={3} /></button>
        <div className="w-full md:w-1/2 h-64 md:h-[600px] relative shrink-0">
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:hidden" />
        </div>
        <div className="w-full md:w-1/2 flex flex-col min-h-0 flex-1 bg-white relative">
          <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 scroll-smooth">
            <div className="space-y-3">
              <h3 className="text-2xl md:text-4xl font-black text-slate-900 italic uppercase tracking-tighter">{product.name}</h3>
              <p className="text-slate-500 text-sm md:text-base font-medium">{product.description}</p>
            </div>

            {sizes.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2"><span className="w-1.5 h-4 bg-orange-500 rounded-full"></span><h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Tamanho</h4></div>
                <div className="grid grid-cols-1 gap-3">
                  {sizes.map(size => {
                    const isSelected = selectedSize?.id === size.id;
                    return (
                      <button key={size.id} onClick={() => setSelectedSize(size)} className={cn("flex items-center justify-between p-4 rounded-2xl border-2 transition-all", isSelected ? "border-orange-500 bg-orange-50" : "border-slate-100 bg-slate-50/50 hover:border-slate-200")}>
                        <span className={cn("font-bold text-base", isSelected ? "text-orange-600" : "text-slate-700")}>{size.name}</span>
                        {!product.pizzaConfig && <span className="font-black text-slate-900">R$ {size.price.toFixed(2).replace('.', ',')}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {product.pizzaConfig && (
              <div className="space-y-4 bg-orange-50/50 p-4 rounded-[24px] border border-orange-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><PizzaIcon className="text-orange-500" size={18} /><h4 className="text-xs font-black uppercase tracking-widest text-slate-700">Escolha os Sabores</h4></div>
                    <span className="text-[10px] bg-slate-900 text-white px-2 py-1 rounded-lg font-black italic">ATÉ {getMaxFlavors()} SABORES</span>
                </div>
                {isLoadingFlavors ? <div className="py-4 text-center text-xs font-bold text-slate-400 animate-pulse">Carregando sabores...</div> : (
                  <div className="grid grid-cols-1 gap-2">
                    {availableFlavors.map(flavor => {
                      const isSelected = selectedFlavors.some(f => f.id === flavor.id);
                      const flavorPrice = selectedSize ? ((flavor.sizes || []).find(s => s.name === selectedSize.name)?.price || flavor.price) : flavor.price;
                      return (
                        <button key={flavor.id} onClick={() => handleFlavorToggle(flavor)} className={cn("flex items-center justify-between p-4 rounded-2xl border-2 transition-all", isSelected ? "border-orange-500 bg-white shadow-md shadow-orange-100" : "border-transparent bg-white/50 hover:border-slate-200")}>
                          <div className="flex items-center gap-3">
                             <div className={cn("w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors", isSelected ? "border-orange-500 bg-orange-500" : "border-slate-300")}>{isSelected && <Check size={12} className="text-white" strokeWidth={4} />}</div>
                             <div className="text-left"><span className={cn("font-bold text-sm block", isSelected ? "text-orange-600" : "text-slate-700")}>{flavor.name}</span>{flavor.description && <span className="text-[10px] text-slate-400 font-medium line-clamp-1">{flavor.description}</span>}</div>
                          </div>
                          <span className="text-xs font-black text-slate-900">R$ {flavorPrice.toFixed(2).replace('.', ',')}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {addonGroups.map((group) => (
              <div key={group.id} className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><span className="w-1.5 h-4 bg-orange-500 rounded-full"></span><h4 className="text-xs font-black uppercase tracking-widest text-slate-400">{group.name}</h4></div>
                    {group.isRequired && <span className="text-[10px] bg-orange-500 text-white px-2 py-1 rounded-lg font-black italic">OBRIGATÓRIO</span>}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {(group.addons || []).map(addon => {
                    const selectedAddon = selectedAddons.find(a => a.id === addon.id);
                    const isSelected = !!selectedAddon;
                    const currentQty = selectedAddon?.quantity || 0;
                    const maxQty = addon.maxQuantity || 1;

                    return (
                      <div key={addon.id} className={cn("flex items-center justify-between p-4 rounded-2xl border-2 transition-all", isSelected ? "border-orange-500 bg-orange-50" : "border-slate-100 bg-slate-50/50 hover:border-slate-200")}>
                        <div className="flex items-center gap-3 flex-1">
                           <div 
                            onClick={() => handleAddonQuantityChange(addon, isSelected ? -currentQty : 1, group.type)}
                            className={cn("w-5 h-5 rounded-lg border-2 flex items-center justify-center cursor-pointer", isSelected ? "border-orange-500 bg-orange-500" : "border-slate-300")}
                           >
                            {isSelected && <Check size={12} className="text-white" strokeWidth={4} />}
                           </div>
                           <div className="flex flex-col">
                            <span className={cn("font-bold text-sm", isSelected ? "text-orange-600" : "text-slate-700")}>{addon.name}</span>
                            {addon.price > 0 && <span className="text-[10px] font-black text-slate-400">+ R$ {addon.price.toFixed(2).replace('.', ',')}</span>}
                           </div>
                        </div>
                        
                        {isSelected && maxQty > 1 && (
                          <div className="flex items-center bg-white rounded-xl p-1 border border-orange-200 shadow-sm animate-in zoom-in-95 duration-200">
                            <button 
                              onClick={() => handleAddonQuantityChange(addon, -1, group.type)}
                              className="w-8 h-8 flex items-center justify-center text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            >
                              <Minus size={14} strokeWidth={3} />
                            </button>
                            <span className="w-6 text-center font-black text-sm text-slate-900">{currentQty}</span>
                            <button 
                              onClick={() => handleAddonQuantityChange(addon, 1, group.type)}
                              disabled={currentQty >= maxQty}
                              className={cn("w-8 h-8 flex items-center justify-center rounded-lg transition-colors", currentQty >= maxQty ? "text-slate-300" : "text-orange-600 hover:bg-orange-50")}
                            >
                              <Plus size={14} strokeWidth={3} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="p-6 md:p-8 bg-white/80 backdrop-blur-lg border-t border-slate-100">
             <div className="flex items-center gap-4">
                <div className="flex items-center bg-slate-100 rounded-2xl p-1">
                   <button onClick={() => handleQuantityChange(-1)} className="w-10 h-10 flex items-center justify-center text-slate-600"><Minus size={18} /></button>
                   <span className="w-8 text-center font-black text-lg text-slate-900">{quantity}</span>
                   <button onClick={() => handleQuantityChange(1)} className="w-10 h-10 flex items-center justify-center text-slate-600"><Plus size={18} /></button>
                </div>
                <button onClick={handleAddToCartClick} disabled={isAdded} className={cn("flex-1 h-14 flex items-center justify-between px-6 rounded-2xl font-black text-sm uppercase italic tracking-widest shadow-xl transition-all active:scale-95", isAdded ? "bg-green-500 text-white" : "bg-slate-900 text-white")}>
                  <div className="flex items-center gap-2"><ShoppingBag size={18} /><span>{isAdded ? 'ADICIONADO!' : 'ADICIONAR'}</span></div>
                  <span className="bg-white/10 px-3 py-1 rounded-lg">R$ {calculateCurrentPrice().toFixed(2).replace('.', ',')}</span>
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
