import React, { useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAuthStore } from '../../store/authStore';
import { restaurantService } from '../../services/restaurant.service';
import { Loader2 } from 'lucide-react';

export interface DashboardLayoutProps {
  title?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = () => {
  const { isAuthenticated, isLoading, user, setRestaurants } = useAuthStore();

  const { data: restaurants } = useQuery({
    queryKey: ['myRestaurants'],
    queryFn: () => restaurantService.getMyRestaurants(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // Keep cached for 5 minutes to avoid resetting on navigation
  });

  useEffect(() => {
    if (restaurants && restaurants.length > 0) {
      const current = useAuthStore.getState().restaurant;
      if (!current || (current.id !== 'all' && !restaurants.some((r) => r.id === current.id))) {
        setRestaurants(restaurants);
      }
    }
  }, [restaurants, setRestaurants]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex transition-colors">
      {/* Fixed Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen bg-gray-50 dark:bg-slate-950">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
