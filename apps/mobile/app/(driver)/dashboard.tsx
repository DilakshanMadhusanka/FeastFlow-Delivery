import React, { useState, useEffect, useMemo } from 'react';
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
import { useTheme } from '../../theme/useTheme';
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
  Flame,
  Zap,
  Sun,
  Moon,
} from 'lucide-react-native';
import { OpenStreetMap } from '../../components/map/OpenStreetMap';
import { OpenStreetMapModal } from '../../components/map/OpenStreetMapModal';
import { OSMMarker } from '../../components/map/osmHelper';

export default function DriverDashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { colors, isDark, toggleTheme } = useTheme();

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
      if (activeDelivery) return;
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
  }, [isOnline, activeDelivery, queryClient]);

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

  const [radarViewMode, setRadarViewMode] = useState<'LIST' | 'MAP'>('MAP');
  const [showRadarMapModal, setShowRadarMapModal] = useState(false);
  const [selectedRadarJobId, setSelectedRadarJobId] = useState<string | null>(null);

  const radarMapMarkers: OSMMarker[] = useMemo(() => {
    const list: OSMMarker[] = [];

    // 1. Driver Position Pin
    list.push({
      id: 'driver_me',
      type: 'COURIER',
      title: 'Your Radar Terminal',
      description: 'Listening for dispatch within 25 km',
      latitude: 40.7128,
      longitude: -74.006,
      badgeText: 'You',
    });

    // 2. Available Job Pickup Pins
    (jobs || []).forEach((j: DeliveryJobRequestDto) => {
      if (j.restaurant?.latitude && j.restaurant?.longitude) {
        list.push({
          id: j.orderId,
          type: 'PICKUP',
          title: j.restaurant.name,
          description: `${(j.distanceToRestaurantKm + j.distanceToCustomerKm).toFixed(1)} km total • ${j.itemsCount} items`,
          latitude: j.restaurant.latitude,
          longitude: j.restaurant.longitude,
          price: `$${formatCurrency(j.estimatedEarnings)}`,
        });
      }
    });

    return list;
  }, [jobs]);

  if (loadingProfile) {
    return <Loading fullScreen message="Loading courier terminal..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.avatarBox, { backgroundColor: colors.brandLight }]}>
            <Bike size={20} color={colors.brand} />
          </View>
          <View>
            <Text style={[styles.driverName, { color: colors.text }]}>{user?.name || 'Courier Partner'}</Text>
            <Text style={[styles.driverSub, { color: colors.textMuted }]}>
              {profile?.vehicleType || 'Motorcycle'} • {profile?.ratingAverage?.toFixed(1) || '5.0'} ★
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.themeToggleBtn, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => toggleTheme()}
            activeOpacity={0.7}
          >
            {isDark ? <Sun size={18} color="#F59E0B" /> : <Moon size={18} color="#6366F1" />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.switchModeBtn, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => router.replace('/(customer)/(tabs)/home')}
          >
            <Text style={[styles.switchModeText, { color: colors.textSecondary }]}>Customer App</Text>
          </TouchableOpacity>
        </View>
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
            tintColor={colors.brand}
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
        <View
          style={[
            styles.statusCard,
            { backgroundColor: colors.card },
            isOnline
              ? (isDark ? { borderColor: '#065F46' } : styles.statusCardOnline)
              : { borderColor: colors.borderLight },
          ]}
        >
          <View style={styles.statusLeft}>
            <View
              style={[
                styles.statusBeacon,
                isOnline ? styles.statusBeaconOnline : { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <Power size={18} color={isOnline ? '#16A34A' : colors.textMuted} />
            </View>
            <View>
              <Text style={[styles.statusTitle, { color: colors.text }]}>
                {isOnline ? 'Online & Searching' : 'You are Offline'}
              </Text>
              <Text style={[styles.statusSubtitle, { color: colors.textMuted }]}>
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
          style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
          activeOpacity={0.8}
          onPress={() => router.push('/(driver)/earnings')}
        >
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Today's Payout</Text>
            <Text style={[styles.statAmount, { color: colors.text }]}>
              ${formatCurrency(earningsData?.todayEarnings)}
            </Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />

          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Trips Completed</Text>
            <Text style={[styles.statAmount, { color: colors.text }]}>{earningsData?.todayDeliveries || 0}</Text>
          </View>

          <View style={styles.statChevron}>
            <ChevronRight size={18} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* Surge Bonus & High-Demand District Radar Card */}
        <View style={[styles.surgeCard, isDark && { backgroundColor: '#20120D', borderColor: '#7C2D12' }]}>
          <View style={styles.surgeHeader}>
            <View style={styles.surgeTitleRow}>
              <Flame size={18} color="#EA580C" />
              <Text style={[styles.surgeTitle, isDark && { color: '#FB923C' }]}>Surge Demand Radar</Text>
            </View>
            <View style={[styles.surgeBoostBadge, isDark && { backgroundColor: '#451A03', borderColor: '#78350F' }]}>
              <Zap size={12} color={isDark ? '#FBBF24' : '#D97706'} />
              <Text style={[styles.surgeBoostBadgeText, isDark && { color: '#FCD34D' }]}>Up to +$2.50 / trip</Text>
            </View>
          </View>

          <Text style={[styles.surgeDesc, isDark && { color: '#FDBA74' }]}>
            High order density detected in these clusters. Relocate nearby for priority dispatch and bonus multipliers.
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.surgeZonesScroll}
          >
            {[
              {
                district: 'Downtown / Wall St',
                boost: '+$2.50',
                multiplier: '2.2x demand',
                wait: '< 3m wait',
                level: 'HIGH',
              },
              {
                district: 'Midtown West',
                boost: '+$1.75',
                multiplier: '1.7x demand',
                wait: '~ 6m wait',
                level: 'MED',
              },
              {
                district: 'Brooklyn Heights',
                boost: '+$1.25',
                multiplier: '1.4x demand',
                wait: '~ 8m wait',
                level: 'MED',
              },
            ].map((zone) => (
              <View
                key={zone.district}
                style={[
                  styles.zoneCard,
                  { backgroundColor: colors.card, borderColor: isDark ? '#7C2D12' : '#FFEDD5' },
                ]}
              >
                <View style={styles.zoneTopRow}>
                  <Text style={[styles.zoneDistrict, { color: colors.text }]} numberOfLines={1}>
                    {zone.district}
                  </Text>
                  <View
                    style={
                      zone.level === 'HIGH' ? styles.levelBadgeHigh : styles.levelBadgeMed
                    }
                  >
                    <Text
                      style={
                        zone.level === 'HIGH' ? styles.levelTextHigh : styles.levelTextMed
                      }
                    >
                      {zone.level === 'HIGH' ? '🔥 Heavy' : '⚡ Busy'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.zoneBoost}>
                  {zone.boost} <Text style={[styles.zoneBoostSub, { color: colors.textMuted }]}>per order</Text>
                </Text>
                <View style={styles.zoneBottomRow}>
                  <Text style={[styles.zoneMeta, { color: colors.textSecondary }]}>{zone.multiplier}</Text>
                  <Text style={[styles.zoneMeta, { color: colors.textMuted }]}>•</Text>
                  <Text style={[styles.zoneMeta, { color: colors.textSecondary }]}>{zone.wait}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Job Radar Section */}
        <View style={styles.radarHeader}>
          <View style={styles.radarTitleRow}>
            <Navigation size={18} color={colors.brand} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Job Radar</Text>
          </View>

          {isOnline ? (
            <View style={styles.radarHeaderRight}>
              {/* Map / List View Mode Toggle */}
              <View style={[styles.togglePillGroup, { backgroundColor: colors.surfaceSecondary }]}>
                <TouchableOpacity
                  style={[
                    styles.togglePill,
                    radarViewMode === 'MAP' && [styles.togglePillActive, { backgroundColor: colors.card }],
                  ]}
                  onPress={() => setRadarViewMode('MAP')}
                >
                  <Text
                    style={[
                      styles.togglePillText,
                      { color: radarViewMode === 'MAP' ? colors.text : colors.textMuted },
                    ]}
                  >
                    🗺️ Map
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.togglePill,
                    radarViewMode === 'LIST' && [styles.togglePillActive, { backgroundColor: colors.card }],
                  ]}
                  onPress={() => setRadarViewMode('LIST')}
                >
                  <Text
                    style={[
                      styles.togglePillText,
                      { color: radarViewMode === 'LIST' ? colors.text : colors.textMuted },
                    ]}
                  >
                    📋 List ({jobs.length})
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.liveTag}>
                <View style={styles.liveDot} />
                <Text style={styles.liveTagText}>25km</Text>
              </View>
            </View>
          ) : null}
        </View>

        {!isOnline ? (
          <View style={[styles.offlineState, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            <Power size={40} color={colors.textMuted} />
            <Text style={[styles.offlineStateTitle, { color: colors.text }]}>Go Online to Receive Jobs</Text>
            <Text style={[styles.offlineStateText, { color: colors.textMuted }]}>
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
        ) : activeDelivery ? (
          <View style={[styles.activeRadarNotice, { backgroundColor: colors.card, borderColor: isDark ? '#7C2D12' : '#FED7AA' }]}>
            <View style={[styles.activeRadarIcon, isDark && { backgroundColor: '#451A03' }]}>
              <Bike size={32} color={colors.brand} />
            </View>
            <Text style={[styles.activeRadarNoticeTitle, { color: colors.text }]}>Active Delivery in Progress</Text>
            <Text style={styles.activeRadarNoticeSub}>Order #{activeDelivery.orderNumber}</Text>
            <Text style={[styles.activeRadarNoticeText, { color: colors.textSecondary }]}>
              A courier driver can accept only one job at a time. Please fulfill Order #{activeDelivery.orderNumber} before accepting new radar requests.
            </Text>
            <Button
              title="Resume Delivery Navigation"
              size="sm"
              variant="primary"
              style={{ marginTop: 14 }}
              onPress={() => router.push('/(driver)/active-delivery')}
            />
          </View>
        ) : jobs.length === 0 ? (
          <View style={[styles.emptyRadarState, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            <Clock size={40} color={colors.textMuted} />
            <Text style={[styles.emptyRadarTitle, { color: colors.text }]}>Scanning for Orders...</Text>
            <Text style={[styles.emptyRadarText, { color: colors.textMuted }]}>
              New kitchen requests within 25 km will pop up automatically. Keep your phone nearby!
            </Text>
          </View>
        ) : radarViewMode === 'MAP' ? (
          /* OpenStreetMap Radar View */
          <View style={styles.radarMapSection}>
            <OpenStreetMap
              center={{ latitude: 40.7128, longitude: -74.006 }}
              zoom={13}
              markers={radarMapMarkers}
              height={260}
              interactive={true}
              showControls={true}
              fitBounds={radarMapMarkers.length > 1}
              headerTitle={`OpenStreetMap Dispatch Radar (${jobs.length} Available)`}
              headerSubtitle="Live OpenStreetMap slippy cartography • Tap pins to view"
              showExpandBtn={true}
              onExpandPress={() => setShowRadarMapModal(true)}
            />

            {/* Quick Trip Carousel under the Map */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.radarJobsScroll}
            >
              {jobs.map((job: DeliveryJobRequestDto) => (
                <View
                  key={job.orderId}
                  style={[
                    styles.radarMiniJobCard,
                    { backgroundColor: colors.card, borderColor: colors.borderLight },
                  ]}
                >
                  <View style={styles.miniJobTop}>
                    <Text style={styles.miniJobEarnings}>
                      ${formatCurrency(job.estimatedEarnings)}
                    </Text>
                    <View style={[styles.miniJobDistancePill, { backgroundColor: colors.surfaceSecondary }]}>
                      <Text style={[styles.miniJobDistanceText, { color: colors.textSecondary }]}>
                        {(job.distanceToRestaurantKm + job.distanceToCustomerKm).toFixed(1)} km
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.miniJobName, { color: colors.text }]} numberOfLines={1}>
                    {job.restaurant.name}
                  </Text>
                  <Text style={[styles.miniJobDrop, { color: colors.textMuted }]} numberOfLines={1}>
                    Drop: {job.deliveryAddress.street}
                  </Text>
                  <Button
                    title="Accept Job"
                    size="sm"
                    variant="primary"
                    isLoading={acceptJobMutation.isPending}
                    onPress={() => acceptJobMutation.mutate(job.orderId)}
                    style={{ marginTop: 8 }}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.jobsList}>
            {jobs.map((job: DeliveryJobRequestDto) => (
              <View
                key={job.orderId}
                style={[
                  styles.jobCard,
                  { backgroundColor: colors.card, borderColor: colors.borderLight },
                ]}
              >
                {/* Header: Earnings & Distance */}
                <View style={styles.jobCardTop}>
                  <View>
                    <Text style={styles.jobEarnings}>
                      ${formatCurrency(job.estimatedEarnings)}
                    </Text>
                    <Text style={[styles.jobEarningsSub, { color: colors.textMuted }]}>
                      Includes ${formatCurrency(job.customerTip)} customer tip
                    </Text>
                  </View>

                  <View style={[styles.jobDistancePill, { backgroundColor: colors.surfaceSecondary }]}>
                    <Text style={[styles.jobDistanceText, { color: colors.textSecondary }]}>
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
                      <Text style={[styles.routeLocationName, { color: colors.text }]}>{job.restaurant.name}</Text>
                      <Text style={[styles.routeAddress, { color: colors.textMuted }]} numberOfLines={1}>
                        {job.restaurant.street}, {job.restaurant.city} ({job.distanceToRestaurantKm.toFixed(1)} km away)
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.routeDottedLine, { backgroundColor: colors.borderLight }]} />

                  {/* Dropoff */}
                  <View style={styles.routeRow}>
                    <View style={styles.dropoffDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.routeLocationName, { color: colors.text }]}>Customer Dropoff</Text>
                      <Text style={[styles.routeAddress, { color: colors.textMuted }]} numberOfLines={1}>
                        {job.deliveryAddress.street}, {job.deliveryAddress.city}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Items & action */}
                <View style={[styles.jobCardFooter, { borderTopColor: colors.borderLight }]}>
                  <Text style={[styles.jobItemsText, { color: colors.textMuted }]}>
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

      {/* Fullscreen OpenStreetMap Radar Modal */}
      <OpenStreetMapModal
        visible={showRadarMapModal}
        onClose={() => setShowRadarMapModal(false)}
        center={{ latitude: 40.7128, longitude: -74.006 }}
        markers={radarMapMarkers}
        title="Live Job Radar (OpenStreetMap)"
        subtitle="Real-time 25km Dispatch Radar & Pickup Pins"
      />
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchModeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  activeRadarNotice: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  activeRadarIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeRadarNoticeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 6,
  },
  activeRadarNoticeSub: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EA580C',
    marginTop: 2,
  },
  activeRadarNoticeText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    paddingHorizontal: 10,
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
  surgeCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    marginBottom: 6,
  },
  surgeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  surgeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  surgeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#9A3412',
  },
  surgeBoostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  surgeBoostBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  surgeDesc: {
    fontSize: 12,
    color: '#7C2D12',
    lineHeight: 16,
    marginBottom: 12,
  },
  surgeZonesScroll: {
    gap: 10,
    paddingRight: 8,
  },
  zoneCard: {
    width: 175,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFEDD5',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  zoneTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  zoneDistrict: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    marginRight: 4,
  },
  levelBadgeHigh: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelBadgeMed: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelTextHigh: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
  },
  levelTextMed: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
  },
  zoneBoost: {
    fontSize: 16,
    fontWeight: '900',
    color: '#EA580C',
    marginBottom: 4,
  },
  zoneBoostSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  zoneBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  zoneMeta: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  radarHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  togglePillGroup: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 2,
  },
  togglePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  togglePillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  togglePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  togglePillTextActive: {
    color: '#111827',
    fontWeight: '800',
  },
  radarMapSection: {
    gap: 12,
  },
  radarJobsScroll: {
    gap: 10,
    paddingVertical: 2,
  },
  radarMiniJobCard: {
    width: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  miniJobTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  miniJobEarnings: {
    fontSize: 16,
    fontWeight: '900',
    color: '#16A34A',
  },
  miniJobDistancePill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniJobDistanceText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4B5563',
  },
  miniJobName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  miniJobDrop: {
    fontSize: 11,
    color: '#6B7280',
  },
});


