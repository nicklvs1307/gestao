import React from 'react';
import { X, Minus, Plus, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Product } from '../../types';

interface OrderEditorProductDrawerProps {
  product: Product;
  selectedSizeId: string;
  selectedAddonIds: string[];
  tempQty: number;
  tempObs: string;
  isSaving: boolean;
  calculatedPrice: number;
  onSizeChange: (sizeId: string) => void;
  onAddonToggle: (addonId: string, groupType: string, groupAddonIds: string[]) => void;
  onQtyChange: (qty: number) => void;
  onObsChange: (obs: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export const OrderEditorProductDrawer: React.FC<OrderEditorProductDrawerProps> = ({
  product,
  selectedSizeId,
  selectedAddonIds,
  tempQty,
  tempObs,
  isSaving,
  calculatedPrice,
  onSizeChange,
  onAddonToggle,
  onQtyChange,
  onObsChange,
  onConfirm,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-[350] flex justify-end animate-in fade-in duration-200">
      <div onClick={onClose} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
      <div className="relative w-[500px] bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 animate-in slide-in-from-right duration-300">
        <header className="h-12 border-b border-slate-100 px-6 flex items-center justify-between shrink-0 bg-slate-50">
          <h3 className="text-[12px] font-black text-slate-900 uppercase italic tracking-tighter leading-none">
            {product.name}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
          {product.sizes?.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 italic">
                <div className="w-1 h-3 bg-orange-500" /> Tamanho
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {product.sizes.map(size => (
                  <button
                    key={size.id}
                    onClick={() => onSizeChange(size.id)}
                    className={cn(
                      "h-10 border-2 rounded-lg text-[10px] font-black uppercase italic transition-all",
                      selectedSizeId === size.id
                        ? "border-orange-500 bg-orange-50 text-orange-600"
                        : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                    )}
                  >
                    {size.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.addonGroups?.map(group => (
            <div key={group.id} className="space-y-3">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 italic">
                <div className="w-1 h-3 bg-blue-500" /> {group.name}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {group.addons.map(addon => {
                  const isSelected = selectedAddonIds.includes(addon.id);
                  return (
                    <button
                      key={addon.id}
                      onClick={() => onAddonToggle(addon.id, group.type, group.addons.map(a => a.id))}
                      className={cn(
                        "p-2 border-2 rounded-lg flex flex-col items-center justify-center text-center gap-0.5 transition-all",
                        isSelected
                          ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                          : "border-slate-50 bg-white text-slate-500 hover:border-slate-200"
                      )}
                    >
                      <span className="text-[9px] font-black uppercase italic leading-none">{addon.name}</span>
                      {addon.price > 0 && <span className="text-[8px] font-black text-emerald-600">+R${addon.price.toFixed(2)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="space-y-3">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Observações</h4>
            <textarea
              className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-3 text-[10px] font-bold outline-none focus:border-orange-500 resize-none"
              placeholder="Instruções específicas..."
              value={tempObs}
              onChange={e => onObsChange(e.target.value)}
            />
          </div>
        </div>

        <footer className="h-20 bg-slate-50 border-t border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center bg-white rounded-lg p-0.5 border border-slate-200 shadow-sm">
            <button onClick={() => onQtyChange(Math.max(1, tempQty - 1))} className="w-8 h-8 flex items-center justify-center rounded bg-slate-100 text-slate-600 hover:bg-orange-500 hover:text-white transition-all">
              <Minus size={14} />
            </button>
            <span className="w-10 text-center text-sm font-black text-slate-900 italic">{tempQty}</span>
            <button onClick={() => onQtyChange(tempQty + 1)} className="w-8 h-8 flex items-center justify-center rounded bg-slate-100 text-slate-600 hover:bg-orange-500 hover:text-white transition-all">
              <Plus size={14} />
            </button>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase italic leading-none">Subtotal</span>
              <span className="text-xl font-black text-slate-900 italic tracking-tighter leading-none">R$ {calculatedPrice.toFixed(2).replace('.', ',')}</span>
            </div>
            <button
              onClick={onConfirm}
              disabled={isSaving}
              className="h-10 px-6 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-[10px] font-black uppercase italic tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : 'ADICIONAR'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
