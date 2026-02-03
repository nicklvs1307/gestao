import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingBasket } from '@fortawesome/free-solid-svg-icons';
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
    <div className="fixed bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-lg z-[100] animate-slide-up">
      <footer 
        onClick={onClick}
        className="bg-slate-900 border border-white/10 rounded-[24px] p-3 flex justify-between items-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
      >
        <div className="flex items-center gap-4 ml-2">
          <div className="relative">
            <div className="bg-primary w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <FontAwesomeIcon icon={faShoppingBasket} size="lg" />
            </div>
            <span className="absolute -top-1.5 -right-1.5 bg-white text-slate-900 text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-sm">
              {itemCount}
            </span>
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider leading-none mb-1">Total no Carrinho</p>
            <p className="text-white font-black text-xl italic tracking-tight">
              R$ {total.toFixed(2).replace('.', ',')}
            </p>
          </div>
        </div>
        
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="bg-primary text-white px-6 py-3.5 rounded-xl font-black text-sm transition-all uppercase italic flex items-center gap-2 hover:brightness-110 active:brightness-90 shadow-lg shadow-primary/10"
        >
          Ver Carrinho
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </footer>
    </div>
  );
};

export default FooterCart;
