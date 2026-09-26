import { apiClient } from './api';
import { ApiResponse } from '@food-delivery/shared';

export interface AdminDriverProfile {
  id: string;
  vehicleType: string;
  licensePlate: string | null;
  isVerified: boolean;
  isOnline: boolean;
  ratingAverage: number;
  totalDeliveries: number;
}

export interface AdminManagedUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  roles: string[];
  driverProfile?: AdminDriverProfile | null;
  ordersCount: number;
  addressesCount: number;
}

export interface CreateAdminUserInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'CUSTOMER' | 'DELIVERY_DRIVER' | 'RESTAURANT_OWNER' | 'ADMIN';
  isEmailVerified?: boolean;
  isActive?: boolean;
  vehicleType?: 'MOTORCYCLE' | 'BICYCLE' | 'SCOOTER' | 'CAR' | 'VAN';
  licensePlate?: string;
  isVerified?: boolean;
}

export interface QueryAdminUsersParams {
  role?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminUsersResult {
  users: AdminManagedUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  metrics: {
    totalUsers: number;
    totalCustomers: number;
    totalDrivers: number;
    verifiedDrivers: number;
  };
}

export const adminUserService = {
  async createUser(input: CreateAdminUserInput): Promise<AdminManagedUser> {
    const res = await apiClient.post<ApiResponse<AdminManagedUser>>('/admin/users', input);
    return res.data.data!;
  },

  async listUsers(params?: QueryAdminUsersParams): Promise<AdminUsersResult> {
    const res = await apiClient.get<ApiResponse<AdminUsersResult>>('/admin/users', { params });
    return res.data.data!;
  },

  async updateUserStatus(
    userId: string,
    data: { isActive?: boolean; isVerified?: boolean }
  ): Promise<AdminManagedUser> {
    const res = await apiClient.patch<ApiResponse<AdminManagedUser>>(`/admin/users/${userId}/status`, data);
    return res.data.data!;
  },

  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete<ApiResponse<{ success: boolean }>>(`/admin/users/${userId}`);
  },
};
