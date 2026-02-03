import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../lib/utils';

interface CategoriesProps {
    categories: {
        id: string;
        name: string;
    }[];
    activeCategory: string;
    onCategoryClick: (categoryId: string) => void;
}

const Categories: React.FC<CategoriesProps> = ({ categories, activeCategory, onCategoryClick }) => {
    return (
        <div className="sticky top-0 z-30 py-4 -mx-4 px-4 md:mx-0 md:px-0 bg-background/80 backdrop-blur-lg md:bg-transparent md:backdrop-blur-none transition-all">
            <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide snap-x">
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onCategoryClick('todos')}
                    className={cn(
                        "snap-start px-6 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-300 border",
                        activeCategory === 'todos' 
                            ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25" 
                            : "bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80 hover:border-white/10"
                    )}
                >
                    Todos
                </motion.button>
                
                {categories.map(category => (
                    <motion.button
                        key={category.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onCategoryClick(category.id)}
                        className={cn(
                            "snap-start px-6 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-300 border",
                            activeCategory === category.id 
                                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25" 
                                : "bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80 hover:border-white/10"
                        )}
                    >
                        {category.name}
                    </motion.button>
                ))}
            </div>
        </div>
    );
};

export default Categories;