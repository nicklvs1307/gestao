import { Product } from '../../../types';

export const calculateProductPrice = (
  product: Product, 
  selectedSizeId: string, 
  selectedAddonIds: string[] = [], 
  quantity: number = 1
) => {
  if (!product) return 0;
  
  const size = product.sizes?.find(s => s.id === selectedSizeId);
  let basePrice = size?.price || product.price || 0;

  const safeAddonIds = Array.isArray(selectedAddonIds) ? selectedAddonIds : [];

  const addonsPrice = product.addonGroups?.reduce((total, group) => {
    if (!group.addons) return total;
    
    if (group.isFlavorGroup) {
      const selectedInGroup = group.addons.filter(a => safeAddonIds.includes(a.id));
      if (selectedInGroup.length === 0) return total;
      
      const prices = selectedInGroup.map(a => a.price || 0);
      const rule = group.priceRule || 'higher';
      if (rule === 'average' && prices.length > 0) {
        return total + (prices.reduce((a, b) => a + b, 0) / prices.length);
      } else if (prices.length > 0) {
        return total + Math.max(...prices);
      }
      return total;
    }

    const groupAddonIds = group.addons.map(a => a.id);
    const selectedInGroupIds = safeAddonIds.filter(id => groupAddonIds.includes(id));
    
    return total + selectedInGroupIds.reduce((sum, id) => {
      const addon = group.addons.find(a => a.id === id);
      return sum + (addon?.price || 0);
    }, 0);
  }, 0) || 0;

  return (basePrice + addonsPrice) * quantity;
};
