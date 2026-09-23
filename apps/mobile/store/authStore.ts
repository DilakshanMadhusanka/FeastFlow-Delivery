import { create } from 'zustand';
import { UserSummary, ApiResponse } from '@food-delivery/shared';
import { apiClient } from '../services/api';
import { getItem, setItem, removeItem, StorageKeys } from '../services/storage';

interface AuthState {
  user: UserSummary | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initializeAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; phone?: string; role?: string }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: UserSummary) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  initializeAuth: async () => {
    try {
      const storedToken = await getItem(StorageKeys.ACCESS_TOKEN);
      const storedUserJson = await getItem(StorageKeys.USER_DATA);

      if (storedToken && storedUserJson) {
        const user = JSON.parse(storedUserJson) as UserSummary;
        set({
          user,
          accessToken: storedToken,
          isAuthenticated: true,
          isLoading: false,
        });

        // Background profile refresh to verify account active status
        apiClient
          .get<ApiResponse<UserSummary>>('/users/me')
          .then((res) => {
            if (res.data.data) {
              set({ user: res.data.data });
              setItem(StorageKeys.USER_DATA, JSON.stringify(res.data.data));
            }
          })
          .catch(() => {
            // Handled by Axios refresh interceptor if token expired
          });
      } else {
        set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    const response = await apiClient.post<
      ApiResponse<{ user: UserSummary; accessToken: string; refreshToken: string }>
    >('/auth/login', { email, password });

    const data = response.data.data;
    if (!data) throw new Error(response.data.message || 'Login failed');

    await setItem(StorageKeys.ACCESS_TOKEN, data.accessToken);
    await setItem(StorageKeys.REFRESH_TOKEN, data.refreshToken);
    await setItem(StorageKeys.USER_DATA, JSON.stringify(data.user));

    set({
      user: data.user,
      accessToken: data.accessToken,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  register: async (payload) => {
    const response = await apiClient.post<
      ApiResponse<{ user: UserSummary; accessToken: string; refreshToken: string }>
    >('/auth/register', payload);

    const data = response.data.data;
    if (!data) throw new Error(response.data.message || 'Registration failed');

    await setItem(StorageKeys.ACCESS_TOKEN, data.accessToken);
    await setItem(StorageKeys.REFRESH_TOKEN, data.refreshToken);
    await setItem(StorageKeys.USER_DATA, JSON.stringify(data.user));

    set({
      user: data.user,
      accessToken: data.accessToken,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: async () => {
    try {
      const refreshToken = await getItem(StorageKeys.REFRESH_TOKEN);
      await apiClient.post('/auth/logout', { refreshToken });
    } catch {
      // Ignore network errors on logout
    } finally {
      await removeItem(StorageKeys.ACCESS_TOKEN);
      await removeItem(StorageKeys.REFRESH_TOKEN);
      await removeItem(StorageKeys.USER_DATA);

      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  setUser: (user: UserSummary) => {
    setItem(StorageKeys.USER_DATA, JSON.stringify(user));
    set({ user });
  },
}));
