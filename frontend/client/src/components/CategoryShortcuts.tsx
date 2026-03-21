import React from 'react';
import { motion } from 'framer-motion';
import type { Category } from '../types';
import * as LucideIcons from 'lucide-react';

interface CategoryShortcutsProps {
  categories: Category[];
  activeCategory: string;
  onCategoryClick: (id: string) => void;
}

// Mapeamento simples de ícones baseados no nome da categoria
const getCategoryIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('pizza')) return 'Pizza';
  if (n.includes('burg') || n.includes('lanche')) return 'HamBurger';
  if (n.includes('bebida')) return 'Beer';
  if (n.includes('doce') || n.includes('sobremesa')) return 'IceCream';
  if (n.includes('japonesa') || n.includes('sushi')) return 'Fish';
  if (n.includes('promo')) return 'Zap';
  return 'Utensils';
};

const CategoryShortcuts: React.FC<CategoryShortcutsProps> = ({ categories, activeCategory, onCategoryClick }) => {
  return (
    <div className="flex gap-4 overflow-x-auto px-5 no-scrollbar py-2">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => onCategoryClick('todos')}
        className="flex flex-col items-center gap-2 min-w-[70px]"
      >
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-sm ${activeCategory === 'todos' ? 'bg-primary text-white shadow-primary/20 scale-110' : 'bg-white text-slate-400 border border-slate-100'}`}>
          <LucideIcons.LayoutGrid size={28} />
        </div>
        <span className={`text-[10px] font-black uppercase tracking-tighter ${activeCategory === 'todos' ? 'text-primary' : 'text-slate-500'}`}>Início</span>
      </motion.button>

      {categories.map((cat) => {
        const IconName = getCategoryIcon(cat.name) as keyof typeof LucideIcons;
        const Icon = (LucideIcons[IconName] as any) || LucideIcons.Utensils;

        return (
          <motion.button
            key={cat.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => onCategoryClick(cat.id)}
            className="flex flex-col items-center gap-2 min-w-[70px]"
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-sm ${activeCategory === cat.id ? 'bg-primary text-white shadow-primary/20 scale-110' : 'bg-white text-slate-400 border border-slate-100'}`}>
              <Icon size={28} />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-tighter line-clamp-1 text-center w-full ${activeCategory === cat.id ? 'text-primary' : 'text-slate-500'}`}>
              {cat.name}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};

export default CategoryShortcuts;
