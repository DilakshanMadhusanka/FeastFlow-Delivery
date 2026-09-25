import { apiClient } from './api';
import { ApiResponse, PaginatedResult } from '@food-delivery/shared';
import { ReviewItem } from '../types';

export const reviewService = {
  async getRestaurantReviews(
    restaurantId: string,
    params?: { page?: number; limit?: number }
  ): Promise<PaginatedResult<ReviewItem>> {
    const endpoint =
      restaurantId === 'all'
        ? '/reviews'
        : `/reviews/restaurant/${restaurantId}`;
    const response = await apiClient.get<ApiResponse<PaginatedResult<ReviewItem>>>(endpoint, {
      params,
    });
    return (
      response.data.data || {
        items: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 1,
      }
    );
  },

  async replyToReview(
    reviewId: string,
    reply: string
  ): Promise<{ id: string; reply: string; repliedAt: string }> {
    const response = await apiClient.post<ApiResponse<{ id: string; reply: string; repliedAt: string }>>(
      `/reviews/${reviewId}/reply`,
      { reply }
    );
    return response.data.data!;
  },
};
