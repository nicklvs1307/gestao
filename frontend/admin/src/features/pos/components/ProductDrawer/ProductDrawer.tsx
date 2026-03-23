import React from 'react';
import { X, Minus, Plus, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../../lib/utils';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { usePosStore } from '../../hooks/usePosStore';
import { useCartStore } from '../../hooks/useCartStore';
import { calculateProductPrice } from '../../utils/priceCalculator';
import { toast } from 'sonner';
import { CartItem } from '../../../../types';

export const ProductDrawer: React.FC = () => {
  const { 
    showProductDrawer, setShowProductDrawer,
    selectedProductForAdd,
    tempQty, setTempQty,
    tempObs, setTempObs,
    selectedSizeId, setSelectedSizeId,
    selectedAddonIds, setSelectedAddonIds
  } = usePosStore();

  const { addToCart } = useCartStore();

  if (!showProductDrawer || !selectedProductForAdd) return null;

  const product = selectedProductForAdd;
  const safeAddonIds = Array.isArray(selectedAddonIds) ? selectedAddonIds : [];
  const currentPrice = calculateProductPrice(product, selectedSizeId, safeAddonIds, tempQty);

  const confirmAddToCart = () => {
    const size = product.sizes?.find(s => s.id === selectedSizeId);
    
    // Map each ID in safeAddonIds to its corresponding addon object, allowing duplicates for quantity
    const selectedAddons = safeAddonIds.map(id => {
      const addon = product.addonGroups?.flatMap(g => g.addons).find(a => a.id === id);
      return addon;
    }).filter(Boolean);

    let itemName = product.name;
    if (size) itemName += ` (${size.name})`;

    const newItem: CartItem = {
      id: Date.now().toString(),
      cartItemId: Date.now().toString(),
      productDbId: product.id,
      productId: product.id,
      name: itemName,
      price: currentPrice / tempQty,
      quantity: tempQty,
      observation: tempObs.trim(),
      selectedSizeDbId: selectedSizeId,
      selectedAddonDbIds: safeAddonIds,
      selectedFlavorIds: [],
      sizeJson: size ? JSON.stringify(size) : null,
      addonsJson: JSON.stringify(selectedAddons),
      flavorsJson: JSON.stringify([])
    };

    addToCart(newItem);
    setShowProductDrawer(false);
    toast.success("Item adicionado!");
  };

  return (
    <div className="fixed inset-0 z-[150] flex justify-end">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={() => setShowProductDrawer(false)} 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ x: '100%' }} 
        animate={{ x: 0 }} 
        exit={{ x: '100%' }} 
        transition={{ type: "spring", damping: 35, stiffness: 300 }} 
        className="relative w-[calc(100%-400px)] bg-white shadow-2xl flex flex-col h-full"
      >
        <header className="h-20 border-b border-slate-100 px-10 flex items-center justify-between shrink-0 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setShowProductDrawer(false)} className="bg-slate-50">
              <X size={20} />
            </Button>
            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">{product.name}</h3>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Personalizar Item</span>
        </header>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-12 bg-slate-50/30">
          {product.sizes?.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                <div className="w-1 h-4 bg-orange-500 rounded-full" /> 1. Escolha o Tamanho
              </h4>
              <div className="flex flex-wrap gap-3">
                {product.sizes.map(size => (
                  <Card 
                    key={size.id} 
                    onClick={() => setSelectedSizeId(size.id)} 
                    className={cn(
                      "px-8 py-4 border-2 transition-all shadow-sm cursor-pointer min-w-[120px] text-center", 
                      selectedSizeId === size.id ? "border-orange-500 bg-orange-50 shadow-orange-100" : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                    )}
                  >
                    <span className={cn("font-black text-xs uppercase italic", selectedSizeId === size.id ? "text-orange-600" : "text-slate-500")}>
                      {size.name}
                    </span>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {product.addonGroups?.map(group => (
            <div key={group.id} className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                <div className="w-1 h-4 bg-blue-500 rounded-full" /> {group.name} 
                <span className="text-[8px] opacity-50 ml-2">
                  ({group.type === 'single' ? 'Selecione 1' : `Máx: ${group.maxQuantity || 'Livre'}`})
                </span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                {group.addons.map(addon => {
                  const currentQty = safeAddonIds.filter(id => id === addon.id).length;
                  const isSelected = currentQty > 0;
                  
                  return (
                    <Card 
                      key={addon.id} 
                      onClick={() => {
                        if (group.type === 'single') {
                          const othersInGroup = group.addons.map(a => a.id);
                          const newIds = safeAddonIds.filter(id => !othersInGroup.includes(id));
                          setSelectedAddonIds([...newIds, addon.id]);
                        } else if (currentQty === 0) {
                          // Se não está selecionado, adiciona a primeira unidade respeitando o limite do grupo
                          const totalInGroup = safeAddonIds.filter(id => group.addons.some(a => a.id === id)).length;
                          if (group.maxQuantity > 0 && totalInGroup >= group.maxQuantity) {
                            toast.warning(`Limite de ${group.maxQuantity} itens atingido em "${group.name}"`);
                            return;
                          }
                          setSelectedAddonIds([...safeAddonIds, addon.id]);
                        }
                      }}
                      className={cn(
                        "p-4 border-2 transition-all flex flex-col items-center justify-center text-center gap-2 shadow-sm cursor-pointer relative min-h-[100px]", 
                        isSelected ? "border-blue-500 bg-blue-50 shadow-lg shadow-blue-100" : "border-slate-50 bg-white text-slate-500 hover:border-slate-200"
                      )}
                    >
                      <span className={cn("font-black text-[10px] uppercase italic leading-tight", isSelected ? "text-blue-700" : "text-slate-600")}>
                        {addon.name}
                      </span>
                      {addon.price > 0 && <span className="text-[9px] font-black text-emerald-600 leading-none">+ R$ {addon.price.toFixed(2)}</span>}
                      
                      {isSelected && group.type !== 'single' && (
                        <div className="flex items-center gap-2 mt-1 bg-white rounded-lg p-1 border border-blue-100 shadow-sm" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => {
                              const index = safeAddonIds.lastIndexOf(addon.id);
                              if (index !== -1) {
                                const newIds = [...safeAddonIds];
                                newIds.splice(index, 1);
                                setSelectedAddonIds(newIds);
                              }
                            }}
                            className="w-6 h-6 flex items-center justify-center rounded bg-slate-50 text-slate-400 hover:text-rose-500"
                          >
                            <Minus size={12} strokeWidth={3} />
                          </button>
                          <span className="text-xs font-black italic text-slate-900 w-4">{currentQty}</span>
                          <button 
                            onClick={() => {
                              const totalInGroup = safeAddonIds.filter(id => group.addons.some(a => a.id === id)).length;
                              if (group.maxQuantity > 0 && totalInGroup >= group.maxQuantity) {
                                toast.warning(`Limite de ${group.maxQuantity} itens atingido em "${group.name}"`);
                                return;
                              }
                              setSelectedAddonIds([...safeAddonIds, addon.id]);
                            }}
                            className="w-6 h-6 flex items-center justify-center rounded bg-slate-50 text-slate-400 hover:text-emerald-500"
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
          ))}

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Observações Adicionais</h4>
            <textarea 
              className="w-full h-32 rounded-[2rem] bg-white border-2 border-slate-100 p-6 font-bold text-sm outline-none focus:border-orange-500 transition-all shadow-inner resize-none" 
              placeholder="Ex: Tirar cebola, maionese à parte..." 
              value={tempObs} 
              onChange={e => setTempObs(e.target.value)} 
            />
          </div>
        </div>

        <footer className="h-32 bg-white border-t border-slate-100 flex items-center justify-between px-10 shrink-0 shadow-[0_-20px_50px_rgba(0,0,0,0.03)]">
          <div className="flex items-center bg-slate-100 border-2 border-slate-200 rounded-2xl p-1 shadow-inner">
            <button 
              onClick={() => setTempQty(Math.max(1, tempQty - 1))} 
              className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-rose-500 active:scale-90 transition-all"
            >
              <Minus size={20} strokeWidth={3} />
            </button>
            <span className="w-16 text-center text-2xl font-black italic text-slate-900">{tempQty}</span>
            <button 
              onClick={() => setTempQty(tempQty + 1)} 
              className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-emerald-500 active:scale-90 transition-all"
            >
              <Plus size={20} strokeWidth={3} />
            </button>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-right flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Valor Unitário</span>
              <p className="text-4xl font-black text-slate-900 italic tracking-tighter leading-none">
                R$ {currentPrice.toFixed(2).replace('.', ',')}
              </p>
            </div>
            <Button onClick={confirmAddToCart} className="h-16 px-12 rounded-[2rem] text-sm uppercase tracking-widest italic gap-3 shadow-xl">
              Adicionar Item <CheckCircle size={20} />
            </Button>
          </div>
        </footer>
      </motion.div>
    </div>
  );
};
