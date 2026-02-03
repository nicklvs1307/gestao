import { useState, useMemo } from 'react';
import type { LocalCartItem, Product, SizeOption, AddonOption } from '../types';

export const useLocalCart = () => {
  const [localCartItems, setLocalCartItems] = useState<LocalCartItem[]>([]);

  const handleAddToCart = (
    product: Product,
    quantity: number,
    selectedSize: SizeOption | null,
    selectedAddons: AddonOption[],
    selectedFlavors?: Product[]
  ) => {
    // 1. Cálculo do Preço Base (considerando Pizzas)
    let basePrice = selectedSize ? selectedSize.price : product.price;
    
    if (product.pizzaConfig && selectedFlavors && selectedFlavors.length > 0) {
      const rule = product.pizzaConfig.priceRule || 'higher';
      const flavorPrices = selectedFlavors.map(f => {
        if (selectedSize) {
          const s = (f.sizes || []).find(sz => sz.name === selectedSize.name);
          return s ? s.price : f.price;
        }
        return f.price;
      });
      
      const calculatedFlavorPrice = rule === 'higher' ? Math.max(...flavorPrices) : flavorPrices.reduce((a, b) => a + b, 0) / flavorPrices.length;
      
      // Se o preço calculado dos sabores for > 0, usa ele. Caso contrário, mantém o preço do tamanho.
      if (calculatedFlavorPrice > 0) {
        basePrice = calculatedFlavorPrice;
      }
    }

    const addonsPrice = selectedAddons.reduce((acc, addon) => acc + (addon.price * (addon.quantity || 1)), 0);
    const priceAtTime = basePrice + addonsPrice;

    const newCartItem: LocalCartItem = {
      localId: Date.now(),
      product,
      productId: product.id,
      quantity,
      priceAtTime,
      sizeJson: selectedSize ? JSON.stringify(selectedSize) : null,
      addonsJson: selectedAddons.length > 0 ? JSON.stringify(selectedAddons) : null,
      flavorsJson: selectedFlavors && selectedFlavors.length > 0 ? JSON.stringify(selectedFlavors) : null,
      flavorIds: selectedFlavors?.map(f => f.id) || []
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
