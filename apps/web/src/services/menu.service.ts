import { apiClient } from './api';
import { ApiResponse } from '@food-delivery/shared';
import { FoodCategory, FoodItem } from '../types';

export interface CreateFoodItemInput {
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  preparationTimeMin?: number;
  isAvailable?: boolean;
}

export const menuService = {
  async getRestaurantMenu(restaurantId: string): Promise<FoodCategory[]> {
    const response = await apiClient.get<ApiResponse<any>>(
      `/menu/restaurant/${restaurantId}`
    );
    const data = response.data.data;
    if (data && Array.isArray(data.categories)) {
      return data.categories;
    }
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  },

  async getCategories(): Promise<FoodCategory[]> {
    const response = await apiClient.get<ApiResponse<FoodCategory[]>>('/menu/categories');
    return response.data.data || [];
  },

  async createCategory(data: { name: string; restaurantId?: string }): Promise<FoodCategory> {
    const response = await apiClient.post<ApiResponse<FoodCategory>>('/menu/categories', data);
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to create category');
    }
    return response.data.data;
  },

  async createFoodItem(data: CreateFoodItemInput): Promise<FoodItem> {
    const response = await apiClient.post<ApiResponse<FoodItem>>('/menu/items', data);
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to create food item');
    }
    return response.data.data;
  },

  async updateFoodItem(id: string, data: Partial<CreateFoodItemInput>): Promise<FoodItem> {
    const response = await apiClient.put<ApiResponse<FoodItem>>(`/menu/items/${id}`, data);
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to update food item');
    }
    return response.data.data;
  },

  async toggleAvailability(id: string, isAvailable: boolean): Promise<FoodItem> {
    const response = await apiClient.patch<ApiResponse<FoodItem>>(
      `/menu/items/${id}/availability`,
      { isAvailable }
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to toggle availability');
    }
    return response.data.data;
  },

  async deleteFoodItem(id: string): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/menu/items/${id}`);
  },
};
