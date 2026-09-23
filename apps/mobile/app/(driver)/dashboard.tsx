import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverService } from '../../services/driver.service';
import { mobileSocketService } from '../../services/socket.service';
import { useAuthStore } from '../../store/authStore';
import { Loading } from '../../components/ui/Loading';
import { Button } from '../../components/ui/Button';
import { DeliveryJobRequestDto } from '@food-delivery/shared';
import { formatCurrency } from '../../utils/formatters';
import {
  Bike,
  Navigation,
  DollarSign,
  CheckCircle2,
  Clock,
  ArrowRight,
  MapPin,
  Utensils,
  ChevronRight,
  TrendingUp,
  User,
  Power,
  Package,
} from 'lucide-react-native';

export default function DriverDashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Fetch driver profile
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['driverProfile'],
    queryFn: () => driverService.getProfile(),
  });

  // Fetch active delivery if any (Socket.IO pushes status transitions)
  const { data: activeDelivery, refetch: refetchActive } = useQuery({
    queryKey: ['activeDelivery'],
    queryFn: () => driverService.getActiveDelivery(),
    staleTime: 30 * 1000,
  });

  // Fetch today's earnings
  const { data: earningsData } = useQuery({
    queryKey: ['driverEarnings'],
    queryFn: () => driverService.getEarnings(),
    staleTime: 60 * 1000,
  });

  const isOnline = profile?.isOnline ?? false;

  // Listen for real-time dispatch events from Job Radar channel
  useEffect(() => {
    if (!isOnline) {
      mobileSocketService.leaveDriver();
      return;
    }

    mobileSocketService.connect().then(() => {
      mobileSocketService.joinDriver();
    });

    const unsubJob = mobileSocketService.onJobAvailable((newJob) => {
      console.log('⚡ New job broadcast received on radar:', newJob.orderNumber);
      queryClient.setQueryData(['availableJobs'], (oldJobs: DeliveryJobRequestDto[] = []) => {
        if (oldJobs.some((j) => j.orderId === newJob.orderId)) {
          return oldJobs;
        }
        return [newJob, ...oldJobs];
      });
    });

    return () => {
      unsubJob();
    };
  }, [isOnline, queryClient]);

  // Available jobs on radar (real-time jobs received via Socket.IO above)
  const {
    data: jobs = [],
    isLoading: loadingJobs,
    isRefetching: refetchingJobs,
    refetch: refetchJobs,
  } = useQuery({
    queryKey: ['availableJobs'],
    queryFn: () => driverService.getAvailableJobs(40.7128, -74.006),
    enabled: isOnline && !activeDelivery,
    staleTime: 30 * 1000,
    refetchInterval: isOnline ? 30000 : false,
  });

  // Toggle online status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: (newStatus: boolean) =>
      driverService.toggleOnline(newStatus, 40.7128, -74.006),
    onSuccess: (data) => {
      queryClient.setQueryData(['driverProfile'], (old: any) => ({
        ...old,
        isOnline: data.isOnline,
      }));
      queryClient.invalidateQueries({ queryKey: ['availableJobs'] });
    },
    onError: (err: any) => {
      Alert.alert('Status Update Failed', err?.message || 'Unable to update online status.');
    },
  });

  // Accept job mutation
  const acceptJobMutation = useMutation({
    mutationFn: (orderId: string) => driverService.acceptJob(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeDelivery'] });
      queryClient.invalidateQueries({ queryKey: ['availableJobs'] });
      router.push('/(driver)/active-delivery');
    },
    onError: (err: any) => {
      Alert.alert('Job Unavailable', err?.message || 'This order is no longer available.');
      refetchJobs();
    },
  });

  if (loadingProfile) {
    return <Loading fullScreen message="Loading courier terminal..." />;
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarBox}>
            <Bike size={20} color="#FF4B3A" />
          </View>
          <View>
            <Text style={styles.driverName}>{user?.name || 'Courier Partner'}</Text>
            <Text style={styles.driverSub}>
              {profile?.vehicleType || 'Motorcycle'} • {profile?.ratingAverage?.toFixed(1) || '5.0'} ★
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.switchModeBtn}
          onPress={() => router.replace('/(customer)/(tabs)/home')}
        >
          <Text style={styles.switchModeText}>Customer App</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refetchingJobs}
            onRefresh={() => {
              refetchJobs();
              refetchActive();
            }}
            tintColor="#FF4B3A"
          />
        }
      >
        {/* In-Flight Delivery Banner (if driver has an active assignment) */}
        {activeDelivery ? (
          <TouchableOpacity
            style={styles.activeDeliveryBanner}
            activeOpacity={0.9}
            onPress={() => router.push('/(driver)/active-delivery')}
          >
            <View style={styles.activeBannerTop}>
              <View style={styles.pulseDot} />
              <Text style={styles.activeBannerTitle}>Active Delivery in Progress</Text>
              <Text style={styles.activeBannerOrder}>#{activeDelivery.orderNumber}</Text>
            </View>

            <Text style={styles.activeBannerRest}>
              Pickup: {activeDelivery.restaurant.name}
            </Text>
            <Text style={styles.activeBannerDrop}>
              Dropoff: {activeDelivery.deliveryAddress.street}, {activeDelivery.deliveryAddress.city}
            </Text>

            <View style={styles.resumeRow}>
              <Text style={styles.resumeText}>Resume Turn-by-Turn Route</Text>
              <ArrowRight size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Online / Offline Toggle Card */}
        <View style={[styles.statusCard, isOnline ? styles.statusCardOnline : styles.statusCardOffline]}>
          <View style={styles.statusLeft}>
            <View
              style={[
                styles.statusBeacon,
                isOnline ? styles.statusBeaconOnline : styles.statusBeaconOffline,
              ]}
            >
              <Power size={18} color={isOnline ? '#16A34A' : '#9CA3AF'} />
            </View>
            <View>
              <Text style={styles.statusTitle}>
                {isOnline ? 'Online & Searching' : 'You are Offline'}
              </Text>
              <Text style={styles.statusSubtitle}>
                {isOnline
                  ? 'Listening for nearby pickup requests'
                  : 'Toggle switch to go online and earn'}
              </Text>
            </View>
          </View>

          <Switch
            value={isOnline}
            onValueChange={(val) => toggleStatusMutation.mutate(val)}
            trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
            thumbColor={isOnline ? '#16A34A' : '#F3F4F6'}
          />
        </View>

        {/* Daily Stats Summary */}
        <TouchableOpacity
          style={styles.statsRow}
          activeOpacity={0.8}
          onPress={() => router.push('/(driver)/earnings')}
        >
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Today's Payout</Text>
            <Text style={styles.statAmount}>
              ${formatCurrency(earningsData?.todayEarnings)}
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Trips Completed</Text>
            <Text style={styles.statAmount}>{earningsData?.todayDeliveries || 0}</Text>
          </View>

          <View style={styles.statChevron}>
            <ChevronRight size={18} color="#9CA3AF" />
          </View>
        </TouchableOpacity>

        {/* Job Radar Section */}
        <View style={styles.radarHeader}>
          <View style={styles.radarTitleRow}>
            <Navigation size={18} color="#FF4B3A" />
            <Text style={styles.sectionTitle}>Job Radar (Available Deliveries)</Text>
          </View>
          {isOnline ? (
            <View style={styles.liveTag}>
              <View style={styles.liveDot} />
              <Text style={styles.liveTagText}>Live 25km</Text>
            </View>
          ) : null}
        </View>

        {!isOnline ? (
          <View style={styles.offlineState}>
            <Power size={40} color="#D1D5DB" />
            <Text style={styles.offlineStateTitle}>Go Online to Receive Jobs</Text>
            <Text style={styles.offlineStateText}>
              Turn on your availability to see incoming orders ready for pickup around you.
            </Text>
            <Button
              title="Go Online Now"
              size="sm"
              variant="primary"
              style={{ marginTop: 14 }}
              onPress={() => toggleStatusMutation.mutate(true)}
            />
          </View>
        ) : jobs.length === 0 ? (
          <View style={styles.emptyRadarState}>
            <Clock size={40} color="#9CA3AF" />
            <Text style={styles.emptyRadarTitle}>Scanning for Orders...</Text>
            <Text style={styles.emptyRadarText}>
              New kitchen requests within 25 km will pop up automatically. Keep your phone nearby!
            </Text>
          </View>
        ) : (
          <View style={styles.jobsList}>
            {jobs.map((job: DeliveryJobRequestDto) => (
              <View key={job.orderId} style={styles.jobCard}>
                {/* Header: Earnings & Distance */}
                <View style={styles.jobCardTop}>
                  <View>
                    <Text style={styles.jobEarnings}>
                      ${formatCurrency(job.estimatedEarnings)}
                    </Text>
                    <Text style={styles.jobEarningsSub}>
                      Includes ${formatCurrency(job.customerTip)} customer tip
                    </Text>
                  </View>

                  <View style={styles.jobDistancePill}>
                    <Text style={styles.jobDistanceText}>
                      {(job.distanceToRestaurantKm + job.distanceToCustomerKm).toFixed(1)} km total
                    </Text>
                  </View>
                </View>

                {/* Route breakdown */}
                <View style={styles.routeContainer}>
                  {/* Pickup */}
                  <View style={styles.routeRow}>
                    <View style={styles.pickupDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.routeLocationName}>{job.restaurant.name}</Text>
                      <Text style={styles.routeAddress} numberOfLines={1}>
                        {job.restaurant.street}, {job.restaurant.city} ({job.distanceToRestaurantKm.toFixed(1)} km away)
                      </Text>
                    </View>
                  </View>

                  <View style={styles.routeDottedLine} />

                  {/* Dropoff */}
                  <View style={styles.routeRow}>
                    <View style={styles.dropoffDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.routeLocationName}>Customer Dropoff</Text>
                      <Text style={styles.routeAddress} numberOfLines={1}>
                        {job.deliveryAddress.street}, {job.deliveryAddress.city}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Items & action */}
                <View style={styles.jobCardFooter}>
                  <Text style={styles.jobItemsText}>
                    Order #{job.orderNumber} • {job.itemsCount} items
                  </Text>

                  <Button
                    title="Accept Job"
                    size="sm"
                    isLoading={acceptJobMutation.isPending}
                    onPress={() => acceptJobMutation.mutate(job.orderId)}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFF1F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  driverSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  switchModeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  switchModeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  activeDeliveryBanner: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  activeBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  activeBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#22C55E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeBannerOrder: {
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 'auto',
    fontWeight: '700',
  },
  activeBannerRest: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activeBannerDrop: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  resumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  resumeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  statusCardOnline: {
    borderColor: '#BBF7D0',
  },
  statusCardOffline: {
    borderColor: '#E5E7EB',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  statusBeacon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBeaconOnline: {
    backgroundColor: '#DCFCE7',
  },
  statusBeaconOffline: {
    backgroundColor: '#F3F4F6',
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  statusSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  statsRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  statAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },
  statChevron: {
    padding: 4,
  },
  radarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  radarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  liveTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  offlineState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    textAlign: 'center',
  },
  offlineStateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#374151',
    marginTop: 12,
  },
  offlineStateText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  emptyRadarState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptyRadarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#374151',
    marginTop: 12,
  },
  emptyRadarText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  jobsList: {
    gap: 14,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  jobCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  jobEarnings: {
    fontSize: 22,
    fontWeight: '900',
    color: '#16A34A',
  },
  jobEarningsSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  jobDistancePill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  jobDistanceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  routeContainer: {
    marginBottom: 14,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },
  dropoffDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  routeDottedLine: {
    width: 2,
    height: 16,
    backgroundColor: '#E5E7EB',
    marginLeft: 4,
    marginVertical: 2,
  },
  routeLocationName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  routeAddress: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  jobCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  jobItemsText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
});
