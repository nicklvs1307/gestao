import React from 'react';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import type { LocalCartItem } from '../types';
import { Button } from './ui/Button';

interface FooterCartProps {
  items: LocalCartItem[];
  total: number;
  onClick: () => void;
}

const FooterCart: React.FC<FooterCartProps> = ({ items, total, onClick }) => {
  if (items.length === 0) return null;

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="fixed bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-lg z-[100] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div 
        onClick={onClick}
        className="bg-slate-900 border border-white/10 rounded-[2rem] p-2 flex justify-between items-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
      >
        <div className="flex items-center gap-4 ml-3">
          <div className="relative">
            <div className="bg-primary w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <ShoppingBag size={24} strokeWidth={2.5} />
            </div>
            <span className="absolute -top-1.5 -right-1.5 bg-white text-slate-900 text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-sm">
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
        
        <Button 
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="h-14 px-6 rounded-2xl text-xs uppercase italic tracking-widest flex items-center gap-2"
        >
          Ver Carrinho
          <ChevronRight size={18} strokeWidth={3} />
        </Button>
      </div>
    </div>
  );
};

export default FooterCart;