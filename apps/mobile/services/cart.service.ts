import { apiClient } from './api';
import { ApiResponse, CartCalculationResult } from '@food-delivery/shared';

export interface CartItemModel {
  id: string;
  foodItemId: string;
  name: string;
  imageUrl?: string;
  basePrice: number;
  quantity: number;
  addons: Array<{ id: string; name: string; price: number }>;
  lineSubtotal: number;
  specialInstructions?: string;
}

export interface CartResponse {
  id: string;
  restaurant: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    deliveryFeeBase: number;
    estimatedDeliveryMin: number;
    estimatedDeliveryMax: number;
  } | null;
  items: CartItemModel[];
  pricing: CartCalculationResult;
}

export const cartService = {
  async getCart(couponCode?: string) {
    const response = await apiClient.get<ApiResponse<CartResponse>>('/cart', {
      params: couponCode ? { couponCode } : undefined,
    });
    return response.data.data;
  },

  async addItem(data: {
    foodItemId: string;
    quantity?: number;
    addonIds?: string[];
    specialInstructions?: string;
    clearExistingIfDifferentRestaurant?: boolean;
    couponCode?: string;
  }) {
    const { couponCode, ...body } = data;
    const response = await apiClient.post<ApiResponse<CartResponse>>('/cart/items', body, {
      params: couponCode ? { couponCode } : undefined,
    });
    return response.data.data;
  },

  async updateItem(
    cartItemId: string,
    quantity: number,
    specialInstructions?: string,
    couponCode?: string
  ) {
    const response = await apiClient.put<ApiResponse<CartResponse>>(
      `/cart/items/${cartItemId}`,
      { quantity, specialInstructions },
      { params: couponCode ? { couponCode } : undefined }
    );
    return response.data.data;
  },

  async removeItem(cartItemId: string, couponCode?: string) {
    const response = await apiClient.delete<ApiResponse<CartResponse>>(`/cart/items/${cartItemId}`, {
      params: couponCode ? { couponCode } : undefined,
    });
    return response.data.data;
  },

  async clearCart() {
    const response = await apiClient.delete<ApiResponse<CartResponse>>('/cart');
    return response.data.data;
  },

  async applyCoupon(code: string) {
    const response = await apiClient.post<ApiResponse<CartResponse>>('/cart/coupon', { code });
    return response.data.data;
  },
};
