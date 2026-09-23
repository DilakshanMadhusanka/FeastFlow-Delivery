import { apiClient } from './api';
import { ApiResponse, PaginatedResult } from '@food-delivery/shared';

export interface FoodAddonItem {
  id: string;
  name: string;
  price: number | string;
  isAvailable: boolean;
}

export interface FoodOptionItem {
  id: string;
  name: string;
  type: 'SINGLE' | 'MULTIPLE';
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  addons: FoodAddonItem[];
}

export interface FoodDetailItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number | string;
  imageUrl?: string;
  ingredients: string[];
  isAvailable: boolean;
  preparationTimeMin: number;
  calories?: number;
  ratingAverage: number | string;
  ratingCount: number;
  options?: FoodOptionItem[];
  addons?: FoodAddonItem[];
  restaurant?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    deliveryFeeBase: number | string;
    estimatedDeliveryMin: number;
    estimatedDeliveryMax: number;
  };
}

export interface CategoryWithItems {
  id: string;
  name: string;
  slug: string;
  iconUrl?: string;
  foodItems: FoodDetailItem[];
}

export interface RestaurantMenuResponse {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    bannerUrl?: string;
    logoUrl?: string;
    ratingAverage: number | string;
    ratingCount: number;
    deliveryFeeBase: number | string;
    estimatedDeliveryMin: number;
    estimatedDeliveryMax: number;
  };
  categories: CategoryWithItems[];
}

export const menuService = {
  async getRestaurantMenu(restaurantId: string) {
    const response = await apiClient.get<ApiResponse<RestaurantMenuResponse>>(
      `/menu/restaurant/${restaurantId}`
    );
    return response.data.data;
  },

  async getFoodItem(id: string) {
    const response = await apiClient.get<ApiResponse<FoodDetailItem>>(`/menu/items/${id}`);
    return response.data.data;
  },

  async getCategories(restaurantId?: string) {
    const response = await apiClient.get<ApiResponse<Array<{ id: string; name: string; slug: string; iconUrl?: string }>>>(
      '/menu/categories',
      { params: { restaurantId } }
    );
    return response.data.data;
  },

  async searchFood(params: { query: string; page?: number; limit?: number }) {
    const response = await apiClient.get<ApiResponse<PaginatedResult<FoodDetailItem>>>('/menu/search', {
      params,
    });
    return response.data.data;
  },
};
