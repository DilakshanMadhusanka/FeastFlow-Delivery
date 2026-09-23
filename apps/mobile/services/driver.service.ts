import { apiClient } from './api';
import {
  ApiResponse,
  DriverProfileDto,
  DeliveryJobRequestDto,
  ActiveDeliveryDto,
  DriverEarningsSummaryDto,
  DeliveryWorkflowStep,
} from '@food-delivery/shared';

export const driverService = {
  /**
   * Retrieves driver profile or initializes courier profile.
   */
  async getProfile(): Promise<DriverProfileDto> {
    const response = await apiClient.get<ApiResponse<DriverProfileDto>>('/drivers/me');
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch driver profile');
    }
    return response.data.data;
  },

  /**
   * Toggles courier online availability.
   */
  async toggleOnline(
    isOnline: boolean,
    latitude?: number,
    longitude?: number
  ): Promise<{ id: string; isOnline: boolean; currentLatitude?: number; currentLongitude?: number }> {
    const response = await apiClient.patch<
      ApiResponse<{ id: string; isOnline: boolean; currentLatitude?: number; currentLongitude?: number }>
    >('/drivers/status', {
      isOnline,
      latitude,
      longitude,
    });
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to update online status');
    }
    return response.data.data;
  },

  /**
   * Sends driver location telemetry.
   */
  async updateLocation(
    latitude: number,
    longitude: number,
    bearing?: number,
    speed?: number
  ): Promise<void> {
    await apiClient.post<ApiResponse<null>>('/drivers/location', {
      latitude,
      longitude,
      bearing,
      speed,
    });
  },

  /**
   * Fetches nearby available jobs from the job radar.
   */
  async getAvailableJobs(lat?: number, lng?: number): Promise<DeliveryJobRequestDto[]> {
    const response = await apiClient.get<ApiResponse<DeliveryJobRequestDto[]>>('/drivers/requests', {
      params: { lat, lng },
    });
    return response.data.data || [];
  },

  /**
   * Accepts a delivery request from the radar.
   */
  async acceptJob(orderId: string): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(`/drivers/requests/${orderId}/accept`);
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to accept delivery job');
    }
    return response.data.data;
  },

  /**
   * Fetches the current active in-flight delivery assignment.
   */
  async getActiveDelivery(): Promise<ActiveDeliveryDto | null> {
    const response = await apiClient.get<ApiResponse<ActiveDeliveryDto | null>>('/drivers/active');
    return response.data.data ?? null;
  },

  /**
   * Advances the turn-by-turn delivery workflow.
   */
  async advanceWorkflowStep(
    step: DeliveryWorkflowStep,
    notes?: string
  ): Promise<ActiveDeliveryDto | null> {
    const response = await apiClient.post<ApiResponse<ActiveDeliveryDto>>('/drivers/active/step', {
      step,
      notes,
    });
    return response.data.data ?? null;
  },

  /**
   * Retrieves driver payout and tip earnings history.
   */
  async getEarnings(): Promise<DriverEarningsSummaryDto> {
    const response = await apiClient.get<ApiResponse<DriverEarningsSummaryDto>>('/drivers/earnings');
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch earnings');
    }
    return response.data.data;
  },
};
