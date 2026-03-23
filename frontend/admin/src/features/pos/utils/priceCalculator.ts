import { Product } from '../../../types';

export const calculateProductPrice = (
  product: Product, 
  selectedSizeId: string, 
  selectedAddonIds: string[], 
  quantity: number
) => {
  const size = product.sizes?.find(s => s.id === selectedSizeId);
  let basePrice = size?.price || product.price;

  const addonsPrice = product.addonGroups?.reduce((total, group) => {
    const selectedInGroup = group.addons.filter(a => selectedAddonIds.includes(a.id));
    
    if (selectedInGroup.length === 0) return total;

    if (group.isFlavorGroup) {
      const prices = selectedInGroup.map(a => a.price);
      const rule = group.priceRule || 'higher';
      if (rule === 'average') {
        return total + (prices.reduce((a, b) => a + b, 0) / prices.length);
      } else {
        return total + Math.max(...prices);
      }
    }

    return total + selectedInGroup.reduce((sum, addon) => sum + addon.price, 0);
  }, 0) || 0;

  return (basePrice + addonsPrice) * quantity;
};
