import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../store/authStore';
import { useCartStore } from '../../../store/cartStore';
import { orderService } from '../../../services/order.service';
import { cartService } from '../../../services/cart.service';
import { mobileSocketService } from '../../../services/socket.service';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Loading } from '../../../components/ui/Loading';
import { OrderStatus, OrderSummary } from '@food-delivery/shared';
import { formatCurrency } from '../../../utils/formatters';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Utensils,
  ChevronRight,
  Search,
  RotateCcw,
  Bike,
  X,
  Package,
} from 'lucide-react-native';
import { useTheme } from '../../../theme/useTheme';

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.RESTAURANT_ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY_FOR_PICKUP,
  OrderStatus.DRIVER_ASSIGNED,
  OrderStatus.PICKED_UP,
  OrderStatus.ON_THE_WAY,
];

type FilterTab = 'ALL' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED';

export default function OrdersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const { colors, isDark } = useTheme();
  const [selectedFilter, setSelectedFilter] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isReorderingId, setIsReorderingId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  // 1. Fetch Orders
  const {
    data: ordersData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['myOrders'],
    queryFn: () => orderService.getMyOrders({ limit: 50 }),
    enabled: isAuthenticated,
  });

  // 2. Real-time Socket.IO Sync for live order updates
  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;
    mobileSocketService.connect().catch((err) => {
      console.warn('Socket connection error in orders screen:', err);
    });

    const unsubStatus = mobileSocketService.onOrderStatusChanged(() => {
      if (isMounted) {
        queryClient.invalidateQueries({ queryKey: ['myOrders'] });
      }
    });

    const unsubNotification = mobileSocketService.onNotification(() => {
      if (isMounted) {
        queryClient.invalidateQueries({ queryKey: ['myOrders'] });
      }
    });

    return () => {
      isMounted = false;
      unsubStatus();
      unsubNotification();
    };
  }, [isAuthenticated, queryClient]);

  // 3. Quick Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      orderService.cancelOrder(orderId, reason),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', updated.id], updated);
      queryClient.invalidateQueries({ queryKey: ['myOrders'] });
      Alert.alert('Order Cancelled', 'Your order has been cancelled.');
    },
    onError: (err: any) => {
      Alert.alert(
        'Cancellation Failed',
        err?.response?.data?.message || err?.message || 'Could not cancel order.'
      );
    },
    onSettled: () => {
      setCancellingOrderId(null);
    },
  });

  const handleQuickCancel = (order: OrderSummary) => {
    Alert.alert(
      'Cancel Order',
      `Are you sure you want to cancel order #${order.orderNumber}?`,
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: () => {
            setCancellingOrderId(order.id);
            cancelMutation.mutate({
              orderId: order.id,
              reason: 'Customer requested quick cancellation from Orders list.',
            });
          },
        },
      ]
    );
  };

  // 4. 1-Click "Order Again" (Reorder)
  const handleReorder = async (order: OrderSummary) => {
    if (!order.items || order.items.length === 0) {
      Alert.alert('Cannot Reorder', 'This order has no available items.');
      return;
    }

    setIsReorderingId(order.id);

    try {
      for (let i = 0; i < order.items.length; i++) {
        const item = order.items[i];
        await cartService.addItem({
          foodItemId: item.foodItemId,
          quantity: item.quantity,
          addonIds: item.addons?.map((a) => a.addonId) || [],
          specialInstructions: item.specialNotes || undefined,
          clearExistingIfDifferentRestaurant: i === 0,
        });
      }

      await useCartStore.getState().fetchCart();
      router.push('/(customer)/cart');
    } catch (err: any) {
      Alert.alert(
        'Reorder Failed',
        err?.response?.data?.message || err?.message || 'Failed to re-add items to basket.'
      );
    } finally {
      setIsReorderingId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.pageWrapper}>
          <View style={styles.centerContainer}>
            <EmptyState
              icon={<ShoppingBag size={48} color="#FF4B3A" />}
              title="Sign in to view your orders"
              message="Keep track of your active deliveries and order history in one place."
              actionTitle="Sign In"
              onAction={() => router.push('/(auth)/login')}
            />
          </View>
        </View>
      </View>
    );
  }

  const allOrders = ordersData?.items || [];
  const activeCount = allOrders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length;
  const deliveredCount = allOrders.filter((o) => o.status === OrderStatus.DELIVERED).length;
  const cancelledCount = allOrders.filter(
    (o) => o.status === OrderStatus.CANCELLED || o.status === OrderStatus.REJECTED
  ).length;

  // Filter & Search Logic
  const filteredOrders = useMemo(() => {
    return allOrders.filter((order) => {
      // Status filter
      if (selectedFilter === 'ACTIVE' && !ACTIVE_STATUSES.includes(order.status)) return false;
      if (selectedFilter === 'DELIVERED' && order.status !== OrderStatus.DELIVERED) return false;
      if (
        selectedFilter === 'CANCELLED' &&
        order.status !== OrderStatus.CANCELLED &&
        order.status !== OrderStatus.REJECTED
      )
        return false;

      // Query filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesRestaurant = order.restaurant?.name.toLowerCase().includes(query);
        const matchesNumber = order.orderNumber.toLowerCase().includes(query);
        const matchesItems = order.items?.some((i) =>
          i.nameSnapshot.toLowerCase().includes(query)
        );
        return Boolean(matchesRestaurant || matchesNumber || matchesItems);
      }

      return true;
    });
  }, [allOrders, selectedFilter, searchQuery]);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return {
          label: 'Order Placed',
          color: '#D97706',
          bg: '#FEF3C7',
          icon: <Clock size={12} color="#D97706" />,
        };
      case OrderStatus.RESTAURANT_ACCEPTED:
      case OrderStatus.PREPARING:
        return {
          label: status === OrderStatus.PREPARING ? 'Cooking' : 'Accepted',
          color: '#2563EB',
          bg: '#EFF6FF',
          icon: <Utensils size={12} color="#2563EB" />,
        };
      case OrderStatus.READY_FOR_PICKUP:
        return {
          label: 'Ready for Courier',
          color: '#4F46E5',
          bg: '#EEF2FF',
          icon: <Package size={12} color="#4F46E5" />,
        };
      case OrderStatus.DRIVER_ASSIGNED:
      case OrderStatus.PICKED_UP:
      case OrderStatus.ON_THE_WAY:
        return {
          label: 'Out for Delivery',
          color: '#7C3AED',
          bg: '#F5F3FF',
          icon: <Truck size={12} color="#7C3AED" />,
        };
      case OrderStatus.DELIVERED:
        return {
          label: 'Delivered',
          color: '#16A34A',
          bg: '#DCFCE7',
          icon: <CheckCircle2 size={12} color="#16A34A" />,
        };
      case OrderStatus.CANCELLED:
        return {
          label: 'Cancelled',
          color: '#DC2626',
          bg: '#FEE2E2',
          icon: <XCircle size={12} color="#DC2626" />,
        };
      case OrderStatus.REJECTED:
        return {
          label: 'Declined',
          color: '#DC2626',
          bg: '#FEE2E2',
          icon: <XCircle size={12} color="#DC2626" />,
        };
      default:
        return {
          label: status,
          color: '#6B7280',
          bg: '#F3F4F6',
          icon: <Clock size={12} color="#6B7280" />,
        };
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.pageWrapper}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]}>My Orders</Text>
            {activeCount > 0 ? (
              <View style={styles.activePulseBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activePulseText}>{activeCount} Active</Text>
              </View>
            ) : null}
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: colors.surfaceSecondary }]}>
            <Search size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search by restaurant, item, or order #..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={10} style={styles.clearBtn}>
                <X size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                selectedFilter === 'ALL' && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFilter('ALL')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: colors.textSecondary },
                  selectedFilter === 'ALL' && styles.filterChipTextActive,
                ]}
              >
                All ({allOrders.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                selectedFilter === 'ACTIVE' && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFilter('ACTIVE')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: colors.textSecondary },
                  selectedFilter === 'ACTIVE' && styles.filterChipTextActive,
                ]}
              >
                Active ({activeCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                selectedFilter === 'DELIVERED' && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFilter('DELIVERED')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: colors.textSecondary },
                  selectedFilter === 'DELIVERED' && styles.filterChipTextActive,
                ]}
              >
                Delivered ({deliveredCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                selectedFilter === 'CANCELLED' && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFilter('CANCELLED')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: colors.textSecondary },
                  selectedFilter === 'CANCELLED' && styles.filterChipTextActive,
                ]}
              >
                Cancelled ({cancelledCount})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Content List */}
        {isLoading ? (
          <Loading fullScreen message="Loading your orders..." />
        ) : filteredOrders.length === 0 ? (
          <ScrollView
            contentContainerStyle={styles.emptyContainer}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF4B3A" />
            }
          >
            <EmptyState
              icon={<ShoppingBag size={48} color={colors.textMuted} />}
              title={searchQuery ? 'No matching orders' : 'No Orders Found'}
              message={
                searchQuery
                  ? `No orders matched "${searchQuery}". Try a different keyword.`
                  : selectedFilter === 'ACTIVE'
                  ? "You don't have any orders in progress right now. Hungry?"
                  : "You don't have any orders under this filter."
              }
              actionTitle="Browse Restaurants"
              onAction={() => router.push('/(customer)/(tabs)/home')}
            />
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF4B3A" />
            }
          >
            {filteredOrders.map((order: OrderSummary) => {
              const badge = getStatusBadge(order.status);
              const isActive = ACTIVE_STATUSES.includes(order.status);
              const canCancel =
                order.status === OrderStatus.PENDING ||
                order.status === OrderStatus.RESTAURANT_ACCEPTED;
              const isCancelling = cancellingOrderId === order.id;
              const isReordering = isReorderingId === order.id;
              const assignedDriver = order.deliveryAssignment?.driver?.user;

              const itemsSummary = (order.items || [])
                .map((i) => `${i.quantity}x ${i.nameSnapshot}`)
                .join(', ');

              return (
                <TouchableOpacity
                  key={order.id}
                  style={[
                    styles.orderCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    isActive && styles.orderCardActiveBorder,
                  ]}
                  activeOpacity={0.9}
                  onPress={() => router.push(`/(customer)/order-tracking/${order.id}` as any)}
                >
                  {/* Header: Restaurant + Status Badge */}
                  <View style={styles.cardHeader}>
                    <View style={styles.restaurantRow}>
                      {order.restaurant?.imageUrl ? (
                        <Image
                          source={{ uri: order.restaurant.imageUrl }}
                          style={styles.restaurantImage}
                        />
                      ) : (
                        <View style={styles.restaurantPlaceholder}>
                          <Utensils size={18} color="#FF4B3A" />
                        </View>
                      )}
                      <View style={styles.restaurantInfo}>
                        <Text style={[styles.restaurantName, { color: colors.text }]} numberOfLines={1}>
                          {order.restaurant?.name || 'Restaurant'}
                        </Text>
                        <Text style={[styles.orderMeta, { color: colors.textMuted }]}>
                          #{order.orderNumber} • {formatDate(order.placedAt)}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      {badge.icon}
                      <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                  </View>

                  {/* Assigned Courier Mini-Banner if active */}
                  {assignedDriver && isActive ? (
                    <View style={styles.driverCallout}>
                      <Bike size={14} color="#7C3AED" />
                      <Text style={styles.driverCalloutText} numberOfLines={1}>
                        Courier: <Text style={{ fontWeight: '700' }}>{assignedDriver.name}</Text>
                        {order.deliveryAssignment?.driver?.vehicleType
                          ? ` (${order.deliveryAssignment.driver.vehicleType})`
                          : ''}
                      </Text>
                    </View>
                  ) : null}

                  {/* Items Summary */}
                  <Text style={[styles.itemsText, { color: colors.textSecondary }]} numberOfLines={2}>
                    {itemsSummary || 'Delicious meal order'}
                  </Text>

                  <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

                  {/* Footer: Price + Quick Actions */}
                  <View style={styles.cardFooter}>
                    <View>
                      <Text style={[styles.totalLabel, { color: colors.textMuted }]}>TOTAL</Text>
                      <Text style={[styles.totalAmount, { color: colors.text }]}>${formatCurrency(order.totalAmount)}</Text>
                    </View>

                    <View style={styles.actionButtonsGroup}>
                      {/* Quick Cancel for pending orders */}
                      {canCancel ? (
                        <TouchableOpacity
                          style={[styles.quickCancelBtn, { backgroundColor: colors.dangerLight, borderColor: colors.danger }]}
                          onPress={() => handleQuickCancel(order)}
                          disabled={isCancelling}
                        >
                          {isCancelling ? (
                            <ActivityIndicator size="small" color="#DC2626" />
                          ) : (
                            <Text style={styles.quickCancelBtnText}>Cancel</Text>
                          )}
                        </TouchableOpacity>
                      ) : null}

                      {/* Order Again for past orders */}
                      {!isActive ? (
                        <TouchableOpacity
                          style={styles.reorderBtn}
                          onPress={() => handleReorder(order)}
                          disabled={isReordering}
                        >
                          {isReordering ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <RotateCcw size={13} color="#FFFFFF" />
                              <Text style={styles.reorderBtnText}>Order Again</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.trackActionBtn}>
                          <Text style={styles.trackActionBtnText}>Track Order</Text>
                          <ChevronRight size={15} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  pageWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : Platform.OS === 'android' ? 44 : 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  activePulseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  activePulseText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },
  clearBtn: {
    padding: 2,
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: '#FF4B3A',
    borderColor: '#FF4B3A',
    shadowColor: '#FF4B3A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 110,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  orderCardActiveBorder: {
    borderColor: '#FECACA',
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  restaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  restaurantImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  restaurantPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF1F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantInfo: {
    marginLeft: 12,
    flex: 1,
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  orderMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  driverCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  driverCalloutText: {
    fontSize: 12,
    color: '#6B21A8',
  },
  itemsText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 12,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 10,
    color: '#94A3B8',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  totalAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  actionButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF4B3A',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    shadowColor: '#FF4B3A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  reorderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  trackActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FF4B3A',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    shadowColor: '#FF4B3A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  trackActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
