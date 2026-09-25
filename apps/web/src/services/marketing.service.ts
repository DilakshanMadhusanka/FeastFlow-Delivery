import { apiClient } from './api';
import { ApiResponse } from '@food-delivery/shared';

export interface MarketingCampaign {
  id: string;
  restaurantId: string;
  name: string;
  type: 'HAPPY_HOUR' | 'BOGO' | 'FREE_DELIVERY' | 'WIN_BACK';
  discountValue: number;
  discountType: 'PERCENTAGE' | 'FIXED';
  minOrderAmount: number;
  startTime?: string;
  endTime?: string;
  applicableDays?: number[];
  targetItemName?: string;
  isActive: boolean;
  redemptionCount: number;
  createdAt: string;
}

export const marketingService = {
  async getCampaigns(restaurantId?: string): Promise<MarketingCampaign[]> {
    const res = await apiClient.get<ApiResponse<MarketingCampaign[]>>('/marketing/campaigns', {
      params: restaurantId && restaurantId !== 'all' ? { restaurantId } : undefined,
    });
    return res.data.data || [];
  },

  async createCampaign(
    campaign: Omit<MarketingCampaign, 'id' | 'redemptionCount' | 'createdAt'>
  ): Promise<MarketingCampaign> {
    const res = await apiClient.post<ApiResponse<MarketingCampaign>>('/marketing/campaigns', campaign);
    return res.data.data!;
  },

  async toggleCampaign(id: string): Promise<MarketingCampaign> {
    const res = await apiClient.patch<ApiResponse<MarketingCampaign>>(`/marketing/campaigns/${id}/toggle`);
    return res.data.data!;
  },

  async deleteCampaign(id: string): Promise<boolean> {
    const res = await apiClient.delete<ApiResponse<{ success: boolean }>>(`/marketing/campaigns/${id}`);
    return res.data.data?.success ?? true;
  },
};
