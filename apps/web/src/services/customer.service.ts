import { apiClient } from './api';
import { ApiResponse } from '@food-delivery/shared';

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  totalOrders: number;
  lifetimeSpend: number;
  averageOrderValue: number;
  lastOrderAt: string;
  loyaltyTier: 'VIP' | 'REGULAR' | 'NEW';
  favoriteItems: string[];
}

export interface CourtesyCreditResult {
  success: boolean;
  promoCode: string;
  amount: number;
  customerName: string;
  validUntil: string;
}

export const customerService = {
  async getCustomers(restaurantId?: string): Promise<CustomerProfile[]> {
    const res = await apiClient.get<ApiResponse<CustomerProfile[]>>('/customers', {
      params: restaurantId && restaurantId !== 'all' ? { restaurantId } : undefined,
    });
    return res.data.data || [];
  },

  async issueCourtesyCredit(
    customerId: string,
    data: { amount: number; reason: string; restaurantName?: string }
  ): Promise<CourtesyCreditResult> {
    const res = await apiClient.post<ApiResponse<CourtesyCreditResult>>(
      `/customers/${customerId}/issue-credit`,
      data
    );
    return res.data.data!;
  },
};
