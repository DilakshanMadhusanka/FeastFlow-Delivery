import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoginPage } from './features/auth/LoginPage';
import { LiveOrdersPage } from './features/orders/LiveOrdersPage';
import { MenuManagerPage } from './features/menu/MenuManagerPage';
import { StatsPage } from './features/analytics/StatsPage';
import { RestaurantSettingsPage } from './features/settings/RestaurantSettingsPage';

export const App: React.FC = () => {
  const { initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <Routes>
      {/* Public Auth Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Merchant Dashboard Routes */}
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Navigate to="/orders" replace />} />
        <Route path="/orders" element={<LiveOrdersPage />} />
        <Route path="/menu" element={<MenuManagerPage />} />
        <Route path="/analytics" element={<StatsPage />} />
        <Route path="/settings" element={<RestaurantSettingsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/orders" replace />} />
    </Routes>
  );
};

export default App;
