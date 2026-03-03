import type { Product, Promotion, AddonGroup } from '../types';

export const calculateDiscountedPrice = (price: number, promotion: Promotion) => {
  if (promotion.discountType === 'percentage') {
    return price * (1 - promotion.discountValue / 100);
  }
  if (promotion.discountType === 'fixed_amount') {
    return Math.max(0, price - promotion.discountValue);
  }
  return price;
};

export const calculateStartingPrice = (product: Product) => {
  // 1. Se tem tamanhos, o preço base é o menor preço entre os tamanhos
  if (product.sizes && product.sizes.length > 0) {
    return Math.min(...product.sizes.map(s => s.price));
  }

  // 2. Se o preço base do produto é maior que 0, usamos ele
  if (product.price > 0) {
    return product.price;
  }

  // 3. Caso o preço seja 0 (comum em produtos montáveis/pizzas), 
  // somamos o valor mínimo obrigatório de cada grupo de adicionais/sabores
  let minRequiredPrice = 0;
  
  // Merge de grupos (Produto + Categorias) para refletir a mesma lógica do Modal
  const productGroups = product.addonGroups || [];
  const categoryGroups = (product.categories || [])
      .flatMap(cat => cat.addonGroups || []);
  
  const merged = [...productGroups, ...categoryGroups];
  const uniqueIds = new Set();
  const addonGroups = merged.filter(group => {
      if (!group || uniqueIds.has(group.id)) return false;
      uniqueIds.add(group.id);
      return true;
  });

  addonGroups.forEach((group: AddonGroup) => {
    if (group.isRequired || (group.minQuantity && group.minQuantity > 0)) {
      if (group.addons && group.addons.length > 0) {
        // Pega o adicional mais barato do grupo obrigatório
        const minAddonPrice = Math.min(...group.addons.map(a => a.price));
        const minQty = group.minQuantity || 1;
        minRequiredPrice += (minAddonPrice * minQty);
      }
    }
  });

  return minRequiredPrice;
};

export const hasMultiplePrices = (product: Product) => {
  if (product.sizes && product.sizes.length > 1) return true;
  
  // Se o preço é 0 e tem grupos de escolha, geralmente significa que o preço varia
  if (product.price === 0 && product.addonGroups && product.addonGroups.length > 0) return true;
  
  return false;
};
