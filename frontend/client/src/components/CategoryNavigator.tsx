import { cn } from '../lib/utils';
import type { Category } from '../types';
import { useTranslation } from 'react-i18next';

interface CategoryNavigatorProps {
  categories: Category[];
  activeCategory: string;
  setActiveCategory: (categoryId: string) => void;
}

export const CategoryNavigator = ({ 
  categories, 
  activeCategory, 
  setActiveCategory 
}: CategoryNavigatorProps) => {
  const { t } = useTranslation();
  // Check if we have overflow that requires scrolling (heuristic: if total width > viewport)
  const hasOverflow = categories.length > 5; // Simple heuristic - adjust as needed

  return (
    <nav className="sticky top-0 bg-background/90 backdrop-blur-md z-30 py-3 border-b border-border overflow-x-auto px-4">
      <div className="flex gap-3 px-2">
        <button 
          onClick={() => setActiveCategory('todos')}
          aria-label={activeCategory === 'todos' ? `Selecionado: Todas as categorias` : `Todas as categorias`}
          className={cn(
            "flex-1 min-w-[80px] px-4 py-2.5 rounded-xl font-black text-xs uppercase italic tracking-widest transition-all",
            activeCategory === 'todos' ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
          )}
        >
          🔥 {t('tableMenu.allCategories')}
        </button>
        {categories.map((cat) => (
          <button 
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            aria-label={activeCategory === cat.id ? `Selecionado: ${cat.name}` : cat.name}
            className={cn(
              "flex-1 min-w-[80px] px-4 py-2.5 rounded-xl font-black text-xs uppercase italic tracking-widest whitespace-nowrap transition-all",
              activeCategory === cat.id ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>
      {hasOverflow && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent pointer-events-none" />
      )}
    </nav>
  );
};