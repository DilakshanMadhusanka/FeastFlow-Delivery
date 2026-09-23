import { apiClient } from './api';
import { ApiResponse } from '@food-delivery/shared';
import { Restaurant, OperatingHour } from '../types';

export const restaurantService = {
  async getMyRestaurants(): Promise<Restaurant[]> {
    const response = await apiClient.get<ApiResponse<Restaurant[]>>(
      '/restaurants/owner/my-restaurants'
    );
    return response.data.data || [];
  },

  async getRestaurantById(id: string): Promise<Restaurant> {
    const response = await apiClient.get<ApiResponse<Restaurant>>(`/restaurants/${id}`);
    if (!response.data.data) {
      throw new Error(response.data.message || 'Restaurant not found');
    }
    return response.data.data;
  },

  async updateRestaurant(id: string, data: Partial<Restaurant>): Promise<Restaurant> {
    const response = await apiClient.put<ApiResponse<Restaurant>>(`/restaurants/${id}`, data);
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to update restaurant');
    }
    return response.data.data;
  },

  async updateHours(
    id: string,
    hours: Array<{
      dayOfWeek: number;
      openTime: string;
      closeTime: string;
      isClosed: boolean;
    }>
  ): Promise<OperatingHour[]> {
    const response = await apiClient.put<ApiResponse<OperatingHour[]>>(
      `/restaurants/${id}/hours`,
      { hours }
    );
    return response.data.data || [];
  },
};
