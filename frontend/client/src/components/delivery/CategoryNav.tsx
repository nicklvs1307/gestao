import React from 'react';
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
      className="sticky top-0 bg-background/90 backdrop-blur-md z-30 py-4 border-b border-border overflow-x-auto no-scrollbar flex gap-3 px-5"
      role="navigation"
      aria-label="Categorias do cardápio"
    >
      <button
        onClick={() => onCategoryChange('todos')}
        className={cn(
          "px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all",
          activeCategory === 'todos' 
            ? 'bg-primary text-white shadow-lg shadow-primary/30' 
            : 'bg-secondary text-muted-foreground'
        )}
        aria-pressed={activeCategory === 'todos'}
      >
        🔥 Todos
      </button>
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => onCategoryChange(cat.id)}
          className={cn(
            "px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all",
            activeCategory === cat.id 
              ? 'bg-primary text-white shadow-lg shadow-primary/30' 
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
