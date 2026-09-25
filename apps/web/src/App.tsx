import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoginPage } from './features/auth/LoginPage';
import { LiveOrdersPage } from './features/orders/LiveOrdersPage';
import { KitchenDisplayPage } from './features/kds/KitchenDisplayPage';
import { DispatchMapPage } from './features/dispatch/DispatchMapPage';
import { ChatCenterPage } from './features/chat/ChatCenterPage';
import { MenuManagerPage } from './features/menu/MenuManagerPage';
import { MarketingPage } from './features/marketing/MarketingPage';
import { CouponsPage } from './features/coupons/CouponsPage';
import { CustomerCrmPage } from './features/customers/CustomerCrmPage';
import { ReviewsPage } from './features/reviews/ReviewsPage';
import { FinancePage } from './features/finance/FinancePage';
import { StaffManagementPage } from './features/staff/StaffManagementPage';
import { StatsPage } from './features/analytics/StatsPage';
import { RestaurantsPage } from './features/restaurants/RestaurantsPage';
import { RestaurantSettingsPage } from './features/settings/RestaurantSettingsPage';
import { AICopilotDrawer } from './components/ai/AICopilotDrawer';

export const App: React.FC = () => {
  const { initAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <>
      <Routes>
        {/* Public Auth Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Merchant Dashboard Routes */}
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Navigate to="/orders" replace />} />
          <Route path="/orders" element={<LiveOrdersPage />} />
          <Route path="/kds" element={<KitchenDisplayPage />} />
          <Route path="/dispatch" element={<DispatchMapPage />} />
          <Route path="/messages" element={<ChatCenterPage />} />
          <Route path="/menu" element={<MenuManagerPage />} />
          <Route path="/marketing" element={<MarketingPage />} />
          <Route path="/coupons" element={<CouponsPage />} />
          <Route path="/customers" element={<CustomerCrmPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/staff" element={<StaffManagementPage />} />
          <Route path="/analytics" element={<StatsPage />} />
          <Route path="/restaurants" element={<RestaurantsPage />} />
          <Route path="/settings" element={<RestaurantSettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/orders" replace />} />
      </Routes>

      {/* Floating FeastFlow AI Copilot Drawer */}
      {isAuthenticated && <AICopilotDrawer />}
    </>
  );
};

export default App;
