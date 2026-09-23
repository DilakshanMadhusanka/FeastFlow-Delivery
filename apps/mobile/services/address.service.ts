import { apiClient } from './api';
import { ApiResponse } from '@food-delivery/shared';

export interface AddressItem {
  id: string;
  userId: string;
  title: string;
  type: 'HOME' | 'WORK' | 'OTHER';
  street: string;
  apartment?: string;
  city: string;
  state?: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  deliveryInstructions?: string;
  isDefault: boolean;
}

export const addressService = {
  async getAddresses() {
    const response = await apiClient.get<ApiResponse<AddressItem[]>>('/addresses');
    return response.data.data || [];
  },

  async createAddress(data: {
    title: string;
    type?: 'HOME' | 'WORK' | 'OTHER';
    street: string;
    apartment?: string;
    city: string;
    state?: string;
    postalCode?: string;
    latitude: number;
    longitude: number;
    deliveryInstructions?: string;
    isDefault?: boolean;
  }) {
    const response = await apiClient.post<ApiResponse<AddressItem>>('/addresses', data);
    return response.data.data;
  },

  async setDefault(id: string) {
    const response = await apiClient.patch<ApiResponse<AddressItem>>(`/addresses/${id}/default`);
    return response.data.data;
  },

  async deleteAddress(id: string) {
    await apiClient.delete<ApiResponse<null>>(`/addresses/${id}`);
  },
};
