import React from 'react';
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
import { driverService } from '../../services/driver.service';
import { Loading } from '../../components/ui/Loading';
import { formatCurrency } from '../../utils/formatters';
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Package,
  Calendar,
  Clock,
  HeartHandshake,
} from 'lucide-react-native';

export default function DriverEarningsScreen() {
  const router = useRouter();

  const { data: earnings, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['driverEarnings'],
    queryFn: () => driverService.getEarnings(),
  });

  if (isLoading) {
    return <Loading fullScreen message="Loading earnings & payouts..." />;
  }

  const todayEarnings = earnings?.todayEarnings || 0;
  const weekEarnings = earnings?.weekEarnings || 0;
  const totalEarnings = earnings?.totalEarnings || 0;
  const todayTrips = earnings?.todayDeliveries || 0;
  const totalTrips = earnings?.totalDeliveries || 0;
  const recentTrips = earnings?.recentDeliveries || [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings & Payouts</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF4B3A" />
        }
      >
        {/* Today's Hero Earnings Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Today's Total Earnings</Text>
          <Text style={styles.heroAmount}>${formatCurrency(todayEarnings)}</Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaItem}>
              <Package size={14} color="#9CA3AF" />
              <Text style={styles.heroMetaText}>{todayTrips} trips today</Text>
            </View>
            <View style={styles.heroMetaDivider} />
            <View style={styles.heroMetaItem}>
              <TrendingUp size={14} color="#22C55E" />
              <Text style={styles.heroMetaSuccess}>Instant Daily Payout</Text>
            </View>
          </View>
        </View>

        {/* Weekly & Lifetime Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Calendar size={18} color="#3B82F6" />
            <Text style={styles.statBoxLabel}>This Week</Text>
            <Text style={styles.statBoxValue}>${formatCurrency(weekEarnings)}</Text>
          </View>

          <View style={styles.statBox}>
            <DollarSign size={18} color="#16A34A" />
            <Text style={styles.statBoxLabel}>Lifetime Total</Text>
            <Text style={styles.statBoxValue}>${formatCurrency(totalEarnings)}</Text>
            <Text style={styles.statBoxSub}>{totalTrips} all-time deliveries</Text>
          </View>
        </View>

        {/* Tip Assurance Notice */}
        <View style={styles.tipNotice}>
          <HeartHandshake size={20} color="#FF4B3A" />
          <View style={{ flex: 1 }}>
            <Text style={styles.tipNoticeTitle}>100% Customer Tips Keep Guarantee</Text>
            <Text style={styles.tipNoticeText}>
              Every dollar customers tip goes directly to your balance with zero platform deduction fees.
            </Text>
          </View>
        </View>

        {/* Recent Completed Trips Log */}
        <View style={styles.tripsSection}>
          <Text style={styles.sectionTitle}>Completed Delivery Log</Text>

          {recentTrips.length === 0 ? (
            <View style={styles.emptyTrips}>
              <Text style={styles.emptyTripsText}>No delivery records found yet.</Text>
            </View>
          ) : (
            <View style={styles.tripsList}>
              {recentTrips.map((trip) => (
                <View key={trip.id} style={styles.tripCard}>
                  <View style={styles.tripLeft}>
                    <Text style={styles.tripRest}>{trip.restaurantName}</Text>
                    <Text style={styles.tripMeta}>
                      #{trip.orderNumber} • {new Date(trip.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>

                  <View style={styles.tripRight}>
                    <Text style={styles.tripTotal}>+${formatCurrency(trip.total)}</Text>
                    <Text style={styles.tripBreakdown}>
                      ${formatCurrency(trip.payout)} + ${formatCurrency(trip.tip)} tip
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 60,
  },
  heroCard: {
    backgroundColor: '#111827',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  heroLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroAmount: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 6,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroMetaText: {
    fontSize: 12,
    color: '#D1D5DB',
    fontWeight: '600',
  },
  heroMetaDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#374151',
  },
  heroMetaSuccess: {
    fontSize: 12,
    color: '#22C55E',
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statBoxLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginTop: 8,
  },
  statBoxValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginTop: 2,
  },
  statBoxSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  tipNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF1F0',
    borderWidth: 1,
    borderColor: '#FECDD3',
    padding: 14,
    borderRadius: 16,
  },
  tipNoticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9F1239',
  },
  tipNoticeText: {
    fontSize: 11,
    color: '#BE123C',
    marginTop: 2,
    lineHeight: 15,
  },
  tripsSection: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  emptyTrips: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptyTripsText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  tripsList: {
    gap: 10,
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  tripLeft: {
    flex: 1,
    marginRight: 10,
  },
  tripRest: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  tripMeta: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  tripRight: {
    alignItems: 'flex-end',
  },
  tripTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16A34A',
  },
  tripBreakdown: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
});
