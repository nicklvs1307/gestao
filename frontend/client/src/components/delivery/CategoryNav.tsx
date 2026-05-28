import React from 'react';
import { Flame } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Category {
  id: string;
  name: string;
}

interface CategoryNavProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

const CategoryNav: React.FC<CategoryNavProps> = ({ categories, activeCategory, onCategoryChange }) => {
  return (
    <nav 
      className="sticky top-0 bg-background/90 backdrop-blur-md z-[var(--z-sticky)] py-4 border-b border-border overflow-x-auto no-scrollbar flex gap-3 px-5"
      role="navigation"
      aria-label="Categorias do cardápio"
    >
      <button
        onClick={() => onCategoryChange('todos')}
        className={cn(
          "px-4 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all duration-200 flex items-center gap-1.5",
          activeCategory === 'todos' 
            ? 'bg-primary text-white shadow-md shadow-primary/20' 
            : 'bg-secondary text-muted-foreground'
        )}
        aria-pressed={activeCategory === 'todos'}
      >
        <Flame size={14} /> Todos
      </button>
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => onCategoryChange(cat.id)}
          className={cn(
            "px-4 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all duration-200",
            activeCategory === cat.id 
              ? 'bg-primary text-white shadow-md shadow-primary/20' 
              : 'bg-secondary text-muted-foreground'
          )}
          aria-pressed={activeCategory === cat.id}
        >
          {cat.name}
        </button>
      ))}
    </nav>
  );
};

export default React.memo(CategoryNav);
