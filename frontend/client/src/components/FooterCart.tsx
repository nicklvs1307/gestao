import React from 'react';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import type { LocalCartItem } from '../types';

interface FooterCartProps {
  items: LocalCartItem[];
  total: number;
  onClick: () => void;
}

const FooterCart: React.FC<FooterCartProps> = ({ items, total, onClick }) => {
  if (items.length === 0) return null;

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="fixed bottom-[85px] md:bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-lg z-[var(--z-sticky)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={onClick}
        className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 flex justify-between items-center shadow-xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-label={`Abrir carrinho com ${itemCount} itens, total R$ ${total.toFixed(2).replace('.', ',')}`}
      >
        <div className="flex items-center gap-4 ml-3">
          <div className="relative">
            <div className="bg-primary w-11 h-11 rounded-lg flex items-center justify-center text-white shadow-md shadow-primary/20">
              <ShoppingBag size={20} strokeWidth={2.5} />
            </div>
            <span className="absolute -top-1.5 -right-1.5 bg-white text-slate-900 text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-sm">
              {itemCount}
            </span>
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-none mb-1">Minha Sacola</p>
            <p className="text-white font-black text-xl italic tracking-tight">
              R$ {total.toFixed(2).replace('.', ',')}
            </p>
          </div>
        </div>
        
        <span className="h-11 px-5 rounded-lg text-xs uppercase italic tracking-widest flex items-center gap-2 bg-primary text-white">
          Ver Carrinho
          <ChevronRight size={18} strokeWidth={3} />
        </span>
      </button>
    </div>
  );
};

export default FooterCart;
