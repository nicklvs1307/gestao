import React, { useMemo, useRef, useCallback } from 'react';
import { Search, ShoppingCart } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { usePosStore } from '../../hooks/usePosStore';
import { useDebounce } from '../../../../hooks/useDebounce';
import { Product, Category } from '../../../../types';

interface ProductGridProps {
  products: Product[];
  categories: Category[];
  onProductClick: (product: Product) => void;
}

export const ProductGrid = React.memo<ProductGridProps>(({ products, categories, onProductClick }) => {
  const { searchTerm, setSearchTerm, selectedCategory, setSelectedCategory } = usePosStore();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'all' || p.categories?.some(c => c?.id === selectedCategory);
      const nameMatch = (p.name || '').toLowerCase();
      const termMatch = (debouncedSearchTerm || '').toLowerCase();
      const matchSearch = nameMatch.includes(termMatch);
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, debouncedSearchTerm]);

  const handleCategoryClick = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
  }, [setSelectedCategory]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, [setSearchTerm]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-3 bg-white border-b border-slate-100 flex flex-col gap-3 shrink-0">
        <div className="relative group w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={14} />
          <input 
            ref={searchInputRef} 
            type="text" 
            className="w-full h-9 pl-10 pr-4 rounded-lg bg-slate-50 border border-slate-200 focus:border-orange-500 focus:bg-white outline-none font-bold text-[11px] transition-all" 
            placeholder="Buscar produto pelo nome ou código..." 
            value={searchTerm} 
            onChange={handleSearchChange}
            aria-label="Buscar produtos"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
          <button 
            className={cn(
              "px-3 h-7 rounded-md text-[8px] font-black uppercase tracking-wider transition-all whitespace-nowrap", 
              selectedCategory === 'all' ? "bg-slate-900 text-white shadow-md" : "bg-slate-50 text-slate-500 border border-slate-200"
            )} 
            onClick={() => handleCategoryClick('all')}
            aria-pressed={selectedCategory === 'all'}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button 
              key={cat.id} 
              className={cn(
                "px-3 h-7 rounded-md text-[8px] font-black uppercase tracking-wider transition-all whitespace-nowrap border", 
                selectedCategory === cat.id ? "bg-orange-500 border-orange-500 text-white shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
              )} 
              onClick={() => handleCategoryClick(cat.id)}
              aria-pressed={selectedCategory === cat.id}
              aria-label={`Categoria ${cat.name}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-10 gap-2">
          {filteredProducts.map(p => (
            <button 
              key={p.id} 
              className="group flex flex-col bg-white border border-slate-200 rounded-lg overflow-hidden hover:border-orange-500 hover:shadow-md transition-all active:scale-[0.98] shadow-sm relative" 
              onClick={() => onProductClick(p)}
              aria-label={`Adicionar ${p.name} - R$ ${p.price.toFixed(2)}`}
            >
              <div className="aspect-square bg-slate-50 border-b border-slate-100 overflow-hidden relative">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity scale-105 group-hover:scale-110" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-200">
                    <ShoppingCart size={16} />
                  </div>
                )}
                <div className="absolute bottom-0 right-0 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-tl-md border-t border-l border-slate-100">
                  <span className="font-black text-[9px] text-orange-600">R$ {p.price.toFixed(2)}</span>
                </div>
              </div>
              <div className="p-1.5 flex flex-col flex-1 justify-center min-h-[40px] bg-white">
                <h3 className="font-bold text-[8px] uppercase leading-[1.2] text-slate-700 group-hover:text-slate-900 line-clamp-2 text-center">{p.name}</h3>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});
