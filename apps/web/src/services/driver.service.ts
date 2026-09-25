import { apiClient } from './api';
import { ApiResponse } from '@food-delivery/shared';
import { DriverFleetItem } from '../types';

export const driverService = {
  async getFleet(): Promise<DriverFleetItem[]> {
    const response = await apiClient.get<ApiResponse<DriverFleetItem[]>>('/drivers/fleet');
    return response.data.data || [];
  },

  async dispatchAssign(orderId: string, driverId: string, payout?: number): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>('/drivers/assign', {
      orderId,
      driverId,
      payout,
    });
    return response.data.data;
  },
};
