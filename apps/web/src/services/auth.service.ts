import { apiClient } from './api';
import { ApiResponse, AuthTokens, UserSummary } from '@food-delivery/shared';

export interface LoginResponseData {
  user: UserSummary;
  accessToken: string;
  refreshToken: string;
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponseData> {
    const response = await apiClient.post<ApiResponse<LoginResponseData>>('/auth/login', {
      email,
      password,
    });
    if (!response.data.data) {
      throw new Error(response.data.message || 'Login failed');
    }
    return response.data.data;
  },

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('feastflow_refresh_token');
    try {
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('feastflow_access_token');
      localStorage.removeItem('feastflow_refresh_token');
      localStorage.removeItem('feastflow_user');
    }
  },

  async getProfile(): Promise<UserSummary> {
    const response = await apiClient.get<ApiResponse<UserSummary>>('/users/me');
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch user profile');
    }
    return response.data.data;
  },
};
