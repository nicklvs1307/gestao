import { useMemo } from 'react';
import type { Product, Category } from '../types';
import { isCategoryAvailable } from '../utils/availability';

interface UseProductFilteringProps {
  allProducts: Product[];
  categories: Category[];
  activeCategory: string;
  searchTerm: string;
}

export const useProductFiltering = ({
  allProducts,
  categories,
  activeCategory,
  searchTerm,
}: UseProductFilteringProps) => {
  const filteredProducts = useMemo(() => {
    // 1. Filtrar produtos que permitem Salão (allowPos), estão disponíveis e NÃO são sabores
    let products = allProducts.filter((p: any) => p.isAvailable && p.allowPos && !p.isFlavor);
    
    // 2. Filtrar produtos cujas categorias permitem Salão e estão ativas
    const availableCategories = categories.filter((cat: any) => 
        cat.isActive && 
        cat.allowPos && 
        isCategoryAvailable(cat)
    );
    
    const validCategoryIds = new Set(availableCategories.map((c: any) => c.id));
    
    products = products.filter((p: any) => {
        const pCategories = p.categories || [];
        return pCategories.some((c: any) => validCategoryIds.has(c.id));
    });

    // 3. Filtro por categoria selecionada (se não for "todos")
    if (activeCategory !== 'todos') {
      products = products.filter((p: any) => 
        p.categoryId === activeCategory || 
        (p.categories && p.categories.some((c: any) => c.id === activeCategory))
      );
    }

    if (searchTerm) {
      const low = searchTerm.toLowerCase();
      products = products.filter((p: any) => {
          // Busca no nome do produto
          if (p.name.toLowerCase().includes(low)) return true;
          // Busca na descrição do produto
          if (p.description?.toLowerCase().includes(low)) return true;
          
          // Busca nos sabores (addons que estão nos grupos vinculados)
          const hasMatchingFlavor = p.addonGroups?.some((group: any) => 
              group.addons?.some((addon: any) => addon.name.toLowerCase().includes(low))
          );
          if (hasMatchingFlavor) return true;

          // Busca nos sabores herdados das categorias
          const hasMatchingCategoryFlavor = p.categories?.some((cat: any) => 
              cat.addonGroups?.some((group: any) => 
                  group.addons?.some((addon: any) => addon.name.toLowerCase().includes(low))
              )
          );
          if (hasMatchingCategoryFlavor) return true;

          return false;
      });
    }
    return products;
  }, [allProducts, categories, activeCategory, searchTerm]);

  return filteredProducts;
};