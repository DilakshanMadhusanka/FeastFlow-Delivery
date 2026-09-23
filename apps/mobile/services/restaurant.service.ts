import { apiClient } from './api';
import { ApiResponse, PaginatedResult } from '@food-delivery/shared';

export interface RestaurantItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  street: string;
  city: string;
  latitude: number;
  longitude: number;
  deliveryRadiusKm: number;
  deliveryFeeBase: number | string;
  estimatedDeliveryMin: number;
  estimatedDeliveryMax: number;
  ratingAverage: number | string;
  ratingCount: number;
  isOpen: boolean;
  distanceKm?: number;
  isDeliverable: boolean;
  cuisines?: string[];
}

export interface RestaurantSearchParams {
  query?: string;
  categoryId?: string;
  latitude?: number;
  longitude?: number;
  maxDeliveryFee?: number;
  minRating?: number;
  isOpen?: boolean;
  sortBy?: 'distance' | 'rating' | 'deliveryTime' | 'deliveryFee' | 'name';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export const restaurantService = {
  async search(params: RestaurantSearchParams = {}) {
    const response = await apiClient.get<ApiResponse<PaginatedResult<RestaurantItem>>>(
      '/restaurants',
      { params }
    );
    return response.data.data;
  },

  async getById(id: string, coords?: { latitude: number; longitude: number }) {
    const response = await apiClient.get<ApiResponse<RestaurantItem>>(`/restaurants/${id}`, {
      params: coords,
    });
    return response.data.data;
  },
};
