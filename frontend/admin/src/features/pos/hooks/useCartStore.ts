import { create } from 'zustand';
import { CartItem } from '../../../types';

interface CartState {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  cart: [],
  
  addToCart: (item) => set((state) => ({
    cart: [...state.cart, item]
  })),

  removeFromCart: (cartItemId) => set((state) => ({
    cart: state.cart.filter((i) => (i.cartItemId || i.id) !== cartItemId)
  })),

  updateQuantity: (cartItemId, delta) => set((state) => ({
    cart: state.cart.map((item) => {
      if ((item.cartItemId || item.id) === cartItemId) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter((item) => item.quantity > 0)
  })),

  clearCart: () => set({ cart: [] })
}));

export const useCartTotal = () => {
  const cart = useCartStore((state) => state.cart);
  return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
};
