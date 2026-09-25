import { apiClient } from './api';
import { ApiResponse } from '@food-delivery/shared';

export interface MenuCopyResult {
  title: string;
  description: string;
  dietaryTags: string[];
  estimatedCalories: number;
  suggestedPrice: number;
  cuisine: string;
}

export interface ReviewReplyResult {
  reply: string;
  tone: string;
}

export interface DemandForecastResult {
  forecastDate: string;
  predictedRushPeak: string;
  estimatedDailyOrders: number;
  projectedVolumeSurgePercentage: number;
  weatherFactor: string;
  staffingRecommendations: string[];
  hourlyBreakdown: Array<{
    hour: string;
    predictedOrders: number;
  }>;
}

export const aiService = {
  async generateMenuCopy(data: {
    itemName: string;
    ingredients?: string[];
    cuisineType?: string;
  }): Promise<MenuCopyResult> {
    const res = await apiClient.post<ApiResponse<MenuCopyResult>>('/ai/generate-menu-copy', data);
    return res.data.data!;
  },

  async generateReviewReply(data: {
    customerName: string;
    rating: number;
    comment?: string;
    restaurantName: string;
  }): Promise<ReviewReplyResult> {
    const res = await apiClient.post<ApiResponse<ReviewReplyResult>>('/ai/generate-review-reply', data);
    return res.data.data!;
  },

  async getDemandForecast(restaurantId?: string): Promise<DemandForecastResult> {
    const res = await apiClient.get<ApiResponse<DemandForecastResult>>('/ai/demand-forecast', {
      params: restaurantId && restaurantId !== 'all' ? { restaurantId } : undefined,
    });
    return res.data.data!;
  },
};
