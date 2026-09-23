import { create } from 'zustand';
import { UserSummary, UserRole } from '@food-delivery/shared';
import { Restaurant } from '../types';

interface AuthState {
  user: UserSummary | null;
  restaurant: Restaurant | null;
  restaurants: Restaurant[];
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: UserSummary, accessToken: string, refreshToken: string) => void;
  setRestaurant: (restaurant: Restaurant) => void;
  setRestaurants: (restaurants: Restaurant[]) => void;
  logout: () => void;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  restaurant: null,
  restaurants: [],
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem('feastflow_access_token', accessToken);
    localStorage.setItem('feastflow_refresh_token', refreshToken);
    localStorage.setItem('feastflow_user', JSON.stringify(user));
    set({ user, isAuthenticated: true, isLoading: false });
  },

  setRestaurant: (restaurant) => {
    set({ restaurant });
  },

  setRestaurants: (restaurants) => {
    set((state) => ({
      restaurants,
      restaurant: state.restaurant || restaurants[0] || null,
    }));
  },

  logout: () => {
    localStorage.removeItem('feastflow_access_token');
    localStorage.removeItem('feastflow_refresh_token');
    localStorage.removeItem('feastflow_user');
    set({ user: null, restaurant: null, restaurants: [], isAuthenticated: false, isLoading: false });
  },

  initAuth: () => {
    const token = localStorage.getItem('feastflow_access_token');
    const userStr = localStorage.getItem('feastflow_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, isAuthenticated: true, isLoading: false });
        return;
      } catch {
        localStorage.removeItem('feastflow_access_token');
        localStorage.removeItem('feastflow_user');
      }
    }
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));
