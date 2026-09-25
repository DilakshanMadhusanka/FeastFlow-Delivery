import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { orderService } from '../../../services/order.service';
import { Loading } from '../../../components/ui/Loading';
import { Button } from '../../../components/ui/Button';
import { OrderStatus } from '@food-delivery/shared';
import { formatCurrency } from '../../../utils/formatters';
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Utensils,
  ChevronRight,
  Compass,
  ArrowRight,
} from 'lucide-react-native';

const ACTIVE_STATUSES = [
  OrderStatus.PENDING,
  OrderStatus.RESTAURANT_ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY_FOR_PICKUP,
  OrderStatus.DRIVER_ASSIGNED,
  OrderStatus.PICKED_UP,
  OrderStatus.ON_THE_WAY,
];

export default function OrderTrackingIndexScreen() {
  const router = useRouter();

  const {
    data: ordersData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['myOrders', 'tracking-index'],
    queryFn: () => orderService.getMyOrders({ limit: 10 }),
    staleTime: 10 * 1000,
  });

  const orders = ordersData?.items || [];
  const activeOrder = orders.find((o) => ACTIVE_STATUSES.includes(o.status));
  const recentOrders = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status));

  // Automatically forward to active order if one exists
  useEffect(() => {
    if (activeOrder) {
      router.replace(`/(customer)/order-tracking/${activeOrder.id}` as any);
    }
  }, [activeOrder, router]);

  if (isLoading) {
    return <Loading fullScreen message="Checking active deliveries..." />;
  }

  // If redirecting to active order
  if (activeOrder) {
    return (
      <View style={styles.centerContainer}>
        <Loading message={`Connecting to Live Order #${activeOrder.orderNumber}...`} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.pageWrapper}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityLabel="Go back"
            hitSlop={10}
          >
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Order Tracking</Text>
            <Text style={styles.headerSub}>Live Delivery Status</Text>
          </View>

          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#FF4B3A"
            />
          }
        >
          {/* Empty State Banner */}
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Compass size={40} color="#FF4B3A" />
            </View>
            <Text style={styles.emptyTitle}>No Active Deliveries</Text>
            <Text style={styles.emptySubtitle}>
              You don't have any orders currently on the way. Once you place an order,
              you can track its real-time GPS location and courier status right here.
            </Text>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => router.push('/(customer)/(tabs)/home')}
                activeOpacity={0.8}
              >
                <Utensils size={16} color="#FFFFFF" />
                <Text style={styles.browseBtnText}>Browse Restaurants</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.historyBtn}
                onPress={() => router.push('/(customer)/(tabs)/orders')}
                activeOpacity={0.8}
              >
                <Clock size={16} color="#475569" />
                <Text style={styles.historyBtnText}>Order History</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Orders Section */}
          {recentOrders.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.sectionTitle}>Recent Orders</Text>
              <Text style={styles.sectionSubtitle}>
                Select a previous order to inspect delivery details and receipt:
              </Text>

              {recentOrders.slice(0, 5).map((order) => {
                const isDelivered = order.status === OrderStatus.DELIVERED;
                const formattedDate = new Date(order.placedAt).toLocaleDateString(
                  undefined,
                  {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }
                );

                return (
                  <TouchableOpacity
                    key={order.id}
                    style={styles.orderCard}
                    onPress={() =>
                      router.push(`/(customer)/order-tracking/${order.id}` as any)
                    }
                    activeOpacity={0.7}
                  >
                    <View style={styles.orderTopRow}>
                      <View style={styles.orderRestInfo}>
                        <Text style={styles.orderRestName}>
                          {order.restaurant?.name || 'Restaurant Order'}
                        </Text>
                        <Text style={styles.orderDate}>{formattedDate}</Text>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          isDelivered
                            ? styles.statusBadgeDelivered
                            : styles.statusBadgeOther,
                        ]}
                      >
                        {isDelivered ? (
                          <CheckCircle2 size={13} color="#16A34A" />
                        ) : (
                          <XCircle size={13} color="#DC2626" />
                        )}
                        <Text
                          style={[
                            styles.statusText,
                            isDelivered
                              ? styles.statusTextDelivered
                              : styles.statusTextOther,
                          ]}
                        >
                          {order.status.replace(/_/g, ' ')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.orderBottomRow}>
                      <View>
                        <Text style={styles.orderNum}>#{order.orderNumber}</Text>
                        <Text style={styles.orderAmount}>
                          {formatCurrency(order.totalAmount)}
                        </Text>
                      </View>

                      <View style={styles.trackPastBtn}>
                        <Text style={styles.trackPastBtnText}>View Tracking Details</Text>
                        <ChevronRight size={14} color="#FF4B3A" />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
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
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  browseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF4B3A',
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  historyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
  },
  historyBtnText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 13,
  },
  recentSection: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderRestInfo: {
    flex: 1,
  },
  orderRestName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  orderDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeDelivered: {
    backgroundColor: '#F0FDF4',
  },
  statusBadgeOther: {
    backgroundColor: '#FEF2F2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextDelivered: {
    color: '#16A34A',
  },
  statusTextOther: {
    color: '#DC2626',
  },
  orderBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 2,
  },
  orderNum: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  trackPastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trackPastBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF4B3A',
  },
});
