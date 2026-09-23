import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getItem, setItem, removeItem, StorageKeys } from './storage';
import { ApiResponse } from '@food-delivery/shared';

// Default to localhost for web/emulator or configure via EXPO_PUBLIC_API_URL
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach Access Token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getItem(StorageKeys.ACCESS_TOKEN);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Token Refresh Rotation
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Check for expired token
    const isTokenExpired =
      error.response?.status === 401 &&
      (error.response?.data?.errorCode === 'TOKEN_EXPIRED' ||
        error.response?.data?.message?.toLowerCase().includes('expired'));

    if (isTokenExpired && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getItem(StorageKeys.REFRESH_TOKEN);
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const refreshResponse = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
          `${BASE_URL}/auth/refresh`,
          { refreshToken }
        );

        const newAccessToken = refreshResponse.data.data?.accessToken;
        const newRefreshToken = refreshResponse.data.data?.refreshToken;

        if (!newAccessToken) {
          throw new Error('Failed to retrieve new access token');
        }

        await setItem(StorageKeys.ACCESS_TOKEN, newAccessToken);
        if (newRefreshToken) {
          await setItem(StorageKeys.REFRESH_TOKEN, newRefreshToken);
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await removeItem(StorageKeys.ACCESS_TOKEN);
        await removeItem(StorageKeys.REFRESH_TOKEN);
        await removeItem(StorageKeys.USER_DATA);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
