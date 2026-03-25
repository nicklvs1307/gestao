import { AnimatePresence, motion } from 'framer-motion';
import { Search, Utensils, X } from 'lucide-react';
import type { Product } from '../types';
import DeliveryProductCard from './DeliveryProductCard';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredProducts: Product[];
  onProductClick: (product: Product) => void;
  t: ReturnType<typeof useTranslation>;
}

export const SearchModal = ({ 
  isOpen, 
  onClose, 
  filteredProducts, 
  onProductClick,
  t 
}: SearchModalProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-white flex flex-col"
      >
        <div className="p-5 flex items-center gap-4 border-b border-slate-100">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              autoFocus
              type="text" 
              placeholder={t('tableMenu.searchPlaceholder')} 
              className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-400 text-slate-900 font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 pb-10">
          {searchTerm && (
            <div className="mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('tableMenu.searchResults', { term: searchTerm })}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProducts.map((p) => (
              <DeliveryProductCard 
                key={p.id} 
                product={p} 
                onClick={() => {
                  onProductClick(p);
                  onClose();
                }} 
              />
            ))}
            {searchTerm && filteredProducts.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <Utensils className="mx-auto text-slate-200 mb-4" size={48} />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('tableMenu.noItemsFound')}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};