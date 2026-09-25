import { apiClient } from './api';
import { ApiResponse } from '@food-delivery/shared';

export interface StaffMember {
  id: string;
  restaurantId: string;
  name: string;
  email: string;
  phone?: string;
  role: 'LINE_COOK' | 'CASHIER' | 'MANAGER' | 'OWNER';
  stationPin: string;
  isOnShift: boolean;
  createdAt: string;
}

export interface VerifyPinResult {
  verified: boolean;
  staffId: string;
  name: string;
  role: string;
}

export const staffService = {
  async getStaff(restaurantId?: string): Promise<StaffMember[]> {
    const res = await apiClient.get<ApiResponse<StaffMember[]>>('/staff', {
      params: restaurantId && restaurantId !== 'all' ? { restaurantId } : undefined,
    });
    return res.data.data || [];
  },

  async addStaff(data: {
    restaurantId: string;
    name: string;
    email: string;
    phone?: string;
    role: 'LINE_COOK' | 'CASHIER' | 'MANAGER' | 'OWNER';
    stationPin: string;
  }): Promise<StaffMember> {
    const res = await apiClient.post<ApiResponse<StaffMember>>('/staff', data);
    return res.data.data!;
  },

  async verifyPin(pin: string, restaurantId?: string): Promise<VerifyPinResult> {
    const res = await apiClient.post<ApiResponse<VerifyPinResult>>('/staff/verify-pin', {
      pin,
      restaurantId,
    });
    return res.data.data!;
  },

  async toggleShift(id: string): Promise<StaffMember> {
    const res = await apiClient.patch<ApiResponse<StaffMember>>(`/staff/${id}/toggle-shift`);
    return res.data.data!;
  },

  async removeStaff(id: string): Promise<boolean> {
    const res = await apiClient.delete<ApiResponse<{ success: boolean }>>(`/staff/${id}`);
    return res.data.data?.success ?? true;
  },
};
