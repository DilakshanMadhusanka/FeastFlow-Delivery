import { apiClient } from './api';
import { ApiResponse } from '@food-delivery/shared';

export interface SubmitReviewInput {
  orderId: string;
  rating: number;
  comment?: string;
  foodItemId?: string;
}

export const mobileReviewService = {
  async submitReview(input: SubmitReviewInput) {
    const response = await apiClient.post<ApiResponse<any>>('/reviews', input);
    return response.data.data;
  },
};
