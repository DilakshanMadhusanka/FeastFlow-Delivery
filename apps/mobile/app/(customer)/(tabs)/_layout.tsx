import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Home, Search, ShoppingBag, User } from 'lucide-react-native';
import { useAuthStore } from '../../../store/authStore';
import { useTheme } from '../../../theme/useTheme';
import { orderService } from '../../../services/order.service';
import { mobileSocketService } from '../../../services/socket.service';
import { OrderStatus } from '@food-delivery/shared';

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.RESTAURANT_ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY_FOR_PICKUP,
  OrderStatus.DRIVER_ASSIGNED,
  OrderStatus.PICKED_UP,
  OrderStatus.ON_THE_WAY,
];

export default function CustomerTabsLayout() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const { colors, isDark } = useTheme();

  const { data: ordersData } = useQuery({
    queryKey: ['myOrders'],
    queryFn: () => orderService.getMyOrders({ limit: 10 }),
    enabled: isAuthenticated,
    staleTime: 15 * 1000,
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    const unsub = mobileSocketService.onOrderStatusChanged(() => {
      queryClient.invalidateQueries({ queryKey: ['myOrders'] });
    });
    return () => unsub();
  }, [isAuthenticated, queryClient]);

  const activeOrdersCount =
    ordersData?.items?.filter((o) => ACTIVE_STATUSES.includes(o.status)).length || 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.tabBarBorder,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Search size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarBadge: activeOrdersCount > 0 ? activeOrdersCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#FF4B3A',
            fontSize: 10,
            fontWeight: '800',
            color: '#FFFFFF',
          },
          tabBarIcon: ({ color, size }) => <ShoppingBag size={size || 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size || 22} color={color} />,
        }}
      />
    </Tabs>
  );
}
