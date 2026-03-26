import React, { useEffect, useRef, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import type { Product } from '../../types';
import DeliveryProductCard from '../DeliveryProductCard';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  products: Product[];
  onProductClick: (product: Product) => void;
}

const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  searchTerm,
  onSearchChange,
  products,
  onProductClick,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const term = searchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(term) ||
      p.addonGroups?.some((g: any) => g.addons?.some((a: any) => a.name.toLowerCase().includes(term))) ||
      p.categories?.some((c: any) => c.addonGroups?.some((g: any) => g.addons?.some((a: any) => a.name.toLowerCase().includes(term))))
    );
  }, [products, searchTerm]);

  const handleClose = () => {
    onClose();
    onSearchChange('');
  };

  const handleProductSelect = (product: Product) => {
    onProductClick(product);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[200] bg-white flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Buscar produtos"
    >
      <div className="p-5 flex items-center gap-4 border-b border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar pratos ou sabores..."
            className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-400 text-slate-900 font-bold"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Buscar pratos ou sabores"
          />
        </div>
        <button
          onClick={handleClose}
          className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400"
          aria-label="Fechar busca"
        >
          <X size={20} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 pb-10">
        {searchTerm && (
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Resultados para "{searchTerm}"
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProducts.map(product => (
            <DeliveryProductCard
              key={product.id}
              product={product}
              onAddToCart={() => handleProductSelect(product)}
            />
          ))}
          {searchTerm && filteredProducts.length === 0 && (
            <div className="text-center py-12 col-span-full">
              <p className="text-muted-foreground font-bold">Nenhum produto encontrado...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
