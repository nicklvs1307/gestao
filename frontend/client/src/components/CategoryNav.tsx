import React, { useRef, useEffect } from 'react';
import type { Category } from '../types';

interface CategoryNavProps {
  categories: Category[];
  activeCategory: string;
  onCategoryClick: (categoryId: string) => void;
}

const CategoryNav: React.FC<CategoryNavProps> = ({ categories, activeCategory, onCategoryClick }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active category could be added here

  return (
    <nav 
      ref={scrollContainerRef}
      className="bg-card px-6 py-4 flex gap-4 overflow-x-auto no-scrollbar border-b border-border sticky top-[72px] z-30"
    >
      {/* Destaques Button */}
      <button
        onClick={() => onCategoryClick('destaques')}
        className={`px-6 py-3 rounded-2xl font-black text-sm whitespace-nowrap transition-all duration-200 ${
          activeCategory === 'destaques'
            ? 'bg-primary text-primary-foreground shadow-md scale-105'
            : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
        }`}
      >
        🔥 Destaques
      </button>

      {/* Other Categories */}
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryClick(category.id)}
          className={`px-6 py-3 rounded-2xl font-black text-sm whitespace-nowrap transition-all duration-200 ${
            activeCategory === category.id
              ? 'bg-primary text-primary-foreground shadow-md scale-105'
              : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
          }`}
        >
          {category.name}
        </button>
      ))}
    </nav>
  );
};

export default CategoryNav;
