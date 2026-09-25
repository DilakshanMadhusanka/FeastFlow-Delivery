import { apiClient } from './api';
import { ApiResponse } from '@food-delivery/shared';
import { Restaurant, OperatingHour, CreateRestaurantInput } from '../types';

export const restaurantService = {
  async getMyRestaurants(): Promise<Restaurant[]> {
    const response = await apiClient.get<ApiResponse<Restaurant[]>>(
      '/restaurants/owner/my-restaurants'
    );
    const list = response.data.data || [];
    return list.map((r: any) => ({
      ...r,
      deliveryFeeBase: Number(r.deliveryFeeBase || 0),
      minimumOrderAmount: Number(r.minimumOrderAmount || 0),
      ratingAverage: Number(r.ratingAverage || 0),
    }));
  },

  async createRestaurant(data: CreateRestaurantInput): Promise<Restaurant> {
    const response = await apiClient.post<ApiResponse<Restaurant>>('/restaurants', data);
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to create restaurant');
    }
    return response.data.data;
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
