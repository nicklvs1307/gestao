import { useState, useMemo } from 'react';
import type { LocalCartItem, Product, SizeOption, AddonOption } from '../types';

export const useLocalCart = () => {
  const [localCartItems, setLocalCartItems] = useState<LocalCartItem[]>([]);

  const handleAddToCart = (
    product: Product,
    quantity: number,
    selectedSize: SizeOption | null,
    selectedAddons: AddonOption[],
    selectedFlavors?: Product[],
    observations?: string
  ) => {
    // 1. Cálculo do Preço Base (considerando Pizzas Unificadas e Legado)
    let basePrice = selectedSize ? selectedSize.price : product.price;
    
    const config = product.pizzaConfig;
    const flavorGroup = product.addonGroups?.find(g => g.isFlavorGroup);

    // Unificado: Procura por grupos de sabores em addonGroups se o produto for uma pizza ativa
    if (config?.active && flavorGroup) {
      const flavors = selectedAddons.filter(sa => flavorGroup.addons.some(ga => ga.id === sa.id));
      if (flavors.length > 0) {
        const prices = flavors.flatMap(f => Array(f.quantity || 1).fill(Number(f.price) > 0 ? Number(f.price) : basePrice));
        const rule = config.priceRule || 'higher';
        
        if (rule === 'average') basePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        else basePrice = Math.max(...prices);
      }
    } 
    // Legado: selectedFlavors (Produtos como sabores)
    else if (config?.active && selectedFlavors && selectedFlavors.length > 0) {
      const rule = config.priceRule || 'higher';
      const flavorPrices = selectedFlavors.map(f => {
        if (selectedSize) {
          const s = (f.sizes || []).find(sz => sz.name === selectedSize.name);
          return s ? s.price : f.price;
        }
        return f.price;
      });
      
      const calculatedFlavorPrice = rule === 'higher' ? Math.max(...flavorPrices) : flavorPrices.reduce((a, b) => a + b, 0) / flavorPrices.length;
      if (calculatedFlavorPrice > 0) basePrice = calculatedFlavorPrice;
    }

    // Aplicar Promoção se houver
    const activePromotion = product.promotions?.find(p => p.isActive);
    if (activePromotion) {
        if (activePromotion.discountType === 'percentage') {
            basePrice = basePrice * (1 - activePromotion.discountValue / 100);
        } else if (activePromotion.discountType === 'fixed_amount') {
            basePrice = Math.max(0, basePrice - activePromotion.discountValue);
        }
    }

    const addonsPrice = selectedAddons.reduce((acc, addon) => {
      const isFlavor = config?.active && flavorGroup?.addons.some(ga => ga.id === addon.id);
      if (isFlavor) return acc;
      return acc + (addon.price * (addon.quantity || 1));
    }, 0);

    const priceAtTime = basePrice + addonsPrice;

    const newCartItem: LocalCartItem = {
      localId: Date.now(),
      product,
      productId: product.id,
      quantity,
      priceAtTime,
      sizeId: selectedSize ? selectedSize.id : null,
      addonsIds: selectedAddons.flatMap(a => Array(a.quantity || 1).fill(a.id)),
      flavorIds: selectedFlavors?.map(f => f.id) || [],
      sizeJson: selectedSize ? JSON.stringify(selectedSize) : null,
      addonsJson: selectedAddons.length > 0 ? JSON.stringify(selectedAddons) : null,
      flavorsJson: selectedFlavors && selectedFlavors.length > 0 ? JSON.stringify(selectedFlavors) : null,
      observations: observations || null,
    };

    setLocalCartItems(prevItems => [...prevItems, newCartItem]);
  };

  const handleRemoveFromCart = (localId: number) => {
    setLocalCartItems(prevItems => prevItems.filter(item => item.localId !== localId));
  };

  const handleUpdateCartItemQuantity = (localId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(localId);
      return;
    }
    setLocalCartItems(prevItems =>
      prevItems.map(item =>
        item.localId === localId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const clearCart = () => {
    setLocalCartItems([]);
  }

  const localCartTotal = useMemo(() => {
    return localCartItems.reduce((sum, item) => sum + (item.priceAtTime * item.quantity), 0);
  }, [localCartItems]);

  return {
    localCartItems,
    handleAddToCart,
    handleRemoveFromCart,
    handleUpdateCartItemQuantity,
    localCartTotal,
    clearCart,
    setLocalCartItems,
  };
};
