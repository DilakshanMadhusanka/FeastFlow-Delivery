import { apiClient } from './api';
import { ApiResponse } from '@food-delivery/shared';
import { Coupon, CreateCouponInput } from '../types';

export const couponService = {
  async getCoupons(params?: { activeOnly?: boolean; search?: string }): Promise<Coupon[]> {
    const response = await apiClient.get<ApiResponse<Coupon[]>>('/coupons', { params });
    return response.data.data || [];
  },

  async createCoupon(input: CreateCouponInput): Promise<Coupon> {
    const response = await apiClient.post<ApiResponse<Coupon>>('/coupons', input);
    return response.data.data!;
  },

  async toggleCoupon(id: string): Promise<{ id: string; code: string; isActive: boolean }> {
    const response = await apiClient.patch<ApiResponse<{ id: string; code: string; isActive: boolean }>>(
      `/coupons/${id}/toggle`
    );
    return response.data.data!;
  },

  async deleteCoupon(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<ApiResponse<{ success: boolean; message: string }>>(
      `/coupons/${id}`
    );
    return response.data.data!;
  },
};
