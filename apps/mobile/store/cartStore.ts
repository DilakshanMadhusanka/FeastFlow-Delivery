import { create } from 'zustand';
import { cartService, CartResponse } from '../services/cart.service';

interface CartState {
  cart: CartResponse | null;
  isLoading: boolean;
  appliedCoupon: string | null;
  fetchCart: () => Promise<void>;
  addItem: (data: {
    foodItemId: string;
    quantity?: number;
    addonIds?: string[];
    specialInstructions?: string;
    clearExistingIfDifferentRestaurant?: boolean;
  }) => Promise<{ requiresConfirmation?: boolean; message?: string }>;
  updateQuantity: (cartItemId: string, newQuantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  isLoading: false,
  appliedCoupon: null,

  fetchCart: async () => {
    try {
      set({ isLoading: true });
      const coupon = get().appliedCoupon || undefined;
      const data = await cartService.getCart(coupon);
      set({ cart: data || null, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addItem: async (params) => {
    try {
      set({ isLoading: true });
      const coupon = get().appliedCoupon || undefined;
      const data = await cartService.addItem({
        ...params,
        couponCode: coupon,
      });

      set({ cart: data || null, isLoading: false });
      return {};
    } catch (error: any) {
      set({ isLoading: false });
      if (error?.response?.data?.errorCode === 'MULTI_RESTAURANT_CART') {
        return {
          requiresConfirmation: true,
          message: error.response.data.message,
        };
      }
      throw error;
    }
  },

  updateQuantity: async (cartItemId, newQuantity) => {
    try {
      set({ isLoading: true });
      const coupon = get().appliedCoupon || undefined;
      const data = await cartService.updateItem(cartItemId, newQuantity, undefined, coupon);
      set({ cart: data || null, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  removeItem: async (cartItemId) => {
    try {
      set({ isLoading: true });
      const coupon = get().appliedCoupon || undefined;
      const data = await cartService.removeItem(cartItemId, coupon);
      set({ cart: data || null, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  clearCart: async () => {
    try {
      set({ isLoading: true });
      const data = await cartService.clearCart();
      set({ cart: data || null, appliedCoupon: null, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  applyCoupon: async (code) => {
    set({ isLoading: true });
    try {
      const data = await cartService.applyCoupon(code);
      set({ cart: data || null, appliedCoupon: code, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  removeCoupon: async () => {
    set({ appliedCoupon: null });
    await get().fetchCart();
  },
}));
