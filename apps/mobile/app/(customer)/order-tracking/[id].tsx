import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  RefreshControl,
  Image,
  Modal,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../../../services/order.service';
import { cartService } from '../../../services/cart.service';
import { useCartStore } from '../../../store/cartStore';
import { mobileSocketService } from '../../../services/socket.service';
import { Loading } from '../../../components/ui/Loading';
import { Button } from '../../../components/ui/Button';
import { OrderStatus, LiveLocationUpdate } from '@food-delivery/shared';
import { formatCurrency, toNumber } from '../../../utils/formatters';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Utensils,
  Package,
  Bike,
  Phone,
  AlertCircle,
  XCircle,
  MapPin,
  CreditCard,
  Banknote,
  Receipt,
  RotateCcw,
  Copy,
  Check,
  X,
  AlertTriangle,
  Star,
  MessageCircle,
  Gift,
  Camera,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react-native';
import { mobileReviewService } from '../../../services/review.service';
import { ChatModal } from '../../../components/modals/ChatModal';
import { PostOrderRewardModal } from '../../../components/modals/PostOrderRewardModal';
import { OpenStreetMap } from '../../../components/map/OpenStreetMap';
import { OpenStreetMapModal } from '../../../components/map/OpenStreetMapModal';
import { OSMMarker } from '../../../components/map/osmHelper';
import { useTheme } from '../../../theme/useTheme';


const TRACKING_STEPS = [
  {
    key: 'step1',
    status: OrderStatus.PENDING,
    title: 'Order Placed',
    desc: 'Waiting for restaurant confirmation',
    icon: Clock,
  },
  {
    key: 'step2',
    status: OrderStatus.RESTAURANT_ACCEPTED,
    title: 'Restaurant Accepted',
    desc: 'Order confirmed and queued in kitchen',
    icon: Utensils,
  },
  {
    key: 'step3',
    status: OrderStatus.PREPARING,
    title: 'Kitchen Preparing',
    desc: 'Fresh ingredients being cooked',
    icon: Utensils,
  },
  {
    key: 'step4',
    status: OrderStatus.READY_FOR_PICKUP,
    title: 'Food Packaged',
    desc: 'Ready and packed for courier pickup',
    icon: Package,
  },
  {
    key: 'step5',
    status: OrderStatus.DRIVER_ASSIGNED,
    title: 'Courier Assigned',
    desc: 'Driver heading to restaurant',
    icon: Bike,
  },
  {
    key: 'step6',
    status: OrderStatus.ON_THE_WAY,
    title: 'Out for Delivery',
    desc: 'Courier is en route to your address',
    icon: Bike,
  },
  {
    key: 'step7',
    status: OrderStatus.DELIVERED,
    title: 'Delivered',
    desc: 'Enjoy your meal!',
    icon: CheckCircle2,
  },
];

function getStepIndex(status: OrderStatus): number {
  switch (status) {
    case OrderStatus.PENDING:
      return 0;
    case OrderStatus.RESTAURANT_ACCEPTED:
      return 1;
    case OrderStatus.PREPARING:
      return 2;
    case OrderStatus.READY_FOR_PICKUP:
      return 3;
    case OrderStatus.DRIVER_ASSIGNED:
      return 4;
    case OrderStatus.PICKED_UP:
    case OrderStatus.ON_THE_WAY:
      return 5;
    case OrderStatus.DELIVERED:
      return 6;
    default:
      return -1;
  }
}

export default function OrderTrackingScreen() {
  const { colors, isDark } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('Changed my mind');
  const [customReason, setCustomReason] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [courierLocation, setCourierLocation] = useState<LiveLocationUpdate | null>(null);
  const [isSocketLive, setIsSocketLive] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  // In-App Chat & Reward Modals State
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatTarget, setChatTarget] = useState<'COURIER' | 'STORE'>('COURIER');
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardClaimedOrShown, setRewardClaimedOrShown] = useState(false);

  const handleReviewSubmit = async () => {
    if (!id) return;
    setIsSubmittingReview(true);
    try {
      await mobileReviewService.submitReview({
        orderId: id as string,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      setHasReviewed(true);
      setShowReviewModal(false);
      Alert.alert(
        'Review Submitted! ⭐',
        'Thank you for rating your meal! Your feedback has been sent to the restaurant.'
      );
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to submit review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const CANCELLATION_REASONS = [
    'Taking longer than expected',
    'Ordered by mistake',
    'Need to change delivery address',
    'Changed my mind',
    'Other reason',
  ];

  // Subscribe to real-time status transitions and courier GPS breadcrumbs
  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    mobileSocketService.connect().then((socket) => {
      if (!isMounted) return;
      setIsSocketLive(socket.connected);
      mobileSocketService.joinOrder(id as string);
    });

    const unsubStatus = mobileSocketService.onOrderStatusChanged((event) => {
      if (event.orderId === id) {
        queryClient.invalidateQueries({ queryKey: ['order', id] });
        queryClient.invalidateQueries({ queryKey: ['myOrders'] });
      }
    });

    const unsubLocation = mobileSocketService.onDriverLocation((loc) => {
      if (loc.orderId === id) {
        setCourierLocation(loc);
        setIsSocketLive(true);
      }
    });

    return () => {
      isMounted = false;
      unsubStatus();
      unsubLocation();
      mobileSocketService.leaveOrder(id as string);
    };
  }, [id, queryClient]);

  const {
    data: order,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderService.getOrderById(id!),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => orderService.cancelOrder(id!, reason),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', id], updated);
      queryClient.invalidateQueries({ queryKey: ['myOrders'] });
      setShowCancelModal(false);
      Alert.alert('Order Cancelled', 'Your order has been cancelled.');
    },
    onError: (err: any) => {
      Alert.alert(
        'Cancellation Failed',
        err?.response?.data?.message || err?.message || 'Unable to cancel order.'
      );
    },
    onSettled: () => {
      setIsCancelling(false);
    },
  });

  const [showMapModal, setShowMapModal] = useState(false);

  const mapMarkers: OSMMarker[] = useMemo(() => {
    if (!order) return [];
    const list: OSMMarker[] = [];

    // 1. Restaurant Pickup Point
    if (order.restaurant?.latitude && order.restaurant?.longitude) {
      list.push({
        id: 'store',
        type: 'STORE',
        title: order.restaurant.name || 'Restaurant',
        description: `${order.restaurant.street || ''}, ${order.restaurant.city || ''}`,
        latitude: order.restaurant.latitude,
        longitude: order.restaurant.longitude,
        badgeText: 'Pickup',
      });
    }

    // 2. Customer Delivery Destination
    if (order.deliveryAddress?.latitude && order.deliveryAddress?.longitude) {
      list.push({
        id: 'dest',
        type: 'CUSTOMER',
        title: order.deliveryAddress.title || 'Delivery Destination',
        description: `${order.deliveryAddress.street || ''}, ${order.deliveryAddress.city || ''}`,
        latitude: order.deliveryAddress.latitude,
        longitude: order.deliveryAddress.longitude,
        badgeText: 'Dropoff',
      });
    }

    // 3. Live Courier Location
    if (courierLocation?.latitude && courierLocation?.longitude) {
      list.push({
        id: 'courier',
        type: 'COURIER',
        title: order.deliveryAssignment?.driver?.user?.name || 'Courier Partner',
        description: `Speed: ${Math.round(courierLocation.speed || 0)} km/h`,
        latitude: courierLocation.latitude,
        longitude: courierLocation.longitude,
        bearing: courierLocation.bearing,
        speed: courierLocation.speed,
        badgeText: 'Driver',
      });
    }

    return list;
  }, [order, courierLocation]);

  const mapCenter = useMemo(() => {
    if (courierLocation) {
      return { latitude: courierLocation.latitude, longitude: courierLocation.longitude };
    }
    if (order?.deliveryAddress?.latitude && order?.deliveryAddress?.longitude) {
      return { latitude: order.deliveryAddress.latitude, longitude: order.deliveryAddress.longitude };
    }
    if (order?.restaurant?.latitude && order?.restaurant?.longitude) {
      return { latitude: order.restaurant.latitude, longitude: order.restaurant.longitude };
    }
    return { latitude: 40.7128, longitude: -74.006 };
  }, [courierLocation, order]);

  const routeCoordinates: Array<[number, number]> = useMemo(() => {
    if (!order) return [];
    const pts: Array<[number, number]> = [];
    if (order.restaurant?.latitude && order.restaurant?.longitude) {
      pts.push([order.restaurant.latitude, order.restaurant.longitude]);
    }
    if (courierLocation?.latitude && courierLocation?.longitude) {
      pts.push([courierLocation.latitude, courierLocation.longitude]);
    }
    if (order.deliveryAddress?.latitude && order.deliveryAddress?.longitude) {
      pts.push([order.deliveryAddress.latitude, order.deliveryAddress.longitude]);
    }
    return pts;
  }, [order, courierLocation]);

  const handleConfirmCancel = () => {
    const finalReason =
      selectedReason === 'Other reason' && customReason.trim()
        ? customReason.trim()
        : selectedReason;

    setIsCancelling(true);
    cancelMutation.mutate(finalReason);
  };

  const handleReorder = async () => {
    if (!order?.items || order.items.length === 0) {
      Alert.alert('Cannot Reorder', 'This order has no available items.');
      return;
    }

    setIsReordering(true);

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
        err?.response?.data?.message || err?.message || 'Could not re-add items to basket.'
      );
    } finally {
      setIsReordering(false);
    }
  };

  const handleCopyOrderNumber = (num: string) => {
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCall = (phoneNumber?: string) => {
    if (!phoneNumber) {
      Alert.alert('Phone Number Unavailable', 'Contact details are not available.');
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`);
  };

  if (isLoading) {
    return <Loading fullScreen message="Loading live delivery status..." />;
  }

  if (!order) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.pageWrapper}>
          <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
            <AlertCircle size={48} color="#EF4444" />
            <Text style={[styles.notFoundTitle, { color: colors.text }]}>Order Not Found</Text>
            <Text style={[styles.notFoundSub, { color: colors.textSecondary }]}>
              We couldn't retrieve the details for this order.
            </Text>
            <Button
              title="Return to Orders"
              onPress={() => router.replace('/(customer)/(tabs)/orders')}
              style={{ marginTop: 20 }}
            />
          </View>
        </View>
      </View>
    );
  }

  const isTerminal =
    order.status === OrderStatus.DELIVERED ||
    order.status === OrderStatus.CANCELLED ||
    order.status === OrderStatus.REJECTED;

  const isCancelledOrRejected =
    order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REJECTED;

  const canCancel =
    order.status === OrderStatus.PENDING ||
    order.status === OrderStatus.RESTAURANT_ACCEPTED;

  const currentStepIdx = getStepIndex(order.status);

  const formatEstimatedTime = (timeString?: string | null) => {
    if (!timeString) return '25-35 minutes';
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '25-35 minutes';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.pageWrapper}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9' }]}
            accessibilityLabel="Go back"
            hitSlop={10}
          >
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <TouchableOpacity
              style={styles.orderNumberRow}
              onPress={() => handleCopyOrderNumber(order.orderNumber)}
              activeOpacity={0.7}
            >
              <Text style={[styles.headerTitle, { color: colors.text }]}>Order #{order.orderNumber}</Text>
              {copiedId ? (
                <Check size={14} color="#16A34A" />
              ) : (
                <Copy size={13} color={colors.textMuted} />
              )}
            </TouchableOpacity>

            <View style={styles.headerSubRow}>
              {isSocketLive && !isCancelledOrRejected ? (
                <View style={styles.headerLiveDot} />
              ) : null}
              <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                {copiedId ? 'Order # Copied!' : isSocketLive ? 'Live Tracking' : 'Order Details'}
              </Text>
            </View>
          </View>

          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF4B3A" />
          }
        >
          {/* Status / ETA Hero Card */}
          {isCancelledOrRejected ? (
            <View style={[styles.cancelledCard, isDark && { backgroundColor: '#450A0A', borderColor: '#991B1B' }]}>
              <XCircle size={36} color="#DC2626" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.cancelledTitle, isDark && { color: '#FCA5A5' }]}>
                  {order.status === OrderStatus.CANCELLED ? 'Order Cancelled' : 'Order Declined'}
                </Text>
                <Text style={[styles.cancelledReason, isDark && { color: '#F87171' }]}>
                  {order.cancellationReason || 'This order was cancelled.'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.heroTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.heroStatusText, { color: colors.text }]}>
                    {order.status === OrderStatus.DELIVERED
                      ? 'Delivered 🎉'
                      : order.status === OrderStatus.ON_THE_WAY || order.status === OrderStatus.PICKED_UP
                      ? 'Courier on the Way!'
                      : order.status === OrderStatus.PREPARING
                      ? 'Kitchen is Cooking'
                      : 'Order in Progress'}
                  </Text>
                  <Text style={[styles.heroEstText, { color: colors.textSecondary }]}>
                    {order.status === OrderStatus.DELIVERED
                      ? 'Thank you for ordering with FeastFlow!'
                      : `Estimated Arrival: ~${formatEstimatedTime(order.estimatedDeliveryAt)}`}
                  </Text>
                </View>

                <View style={[styles.heroIconBox, { backgroundColor: isDark ? colors.brandLight : '#FFF1F0' }]}>
                  {order.status === OrderStatus.DELIVERED ? (
                    <CheckCircle2 size={28} color="#16A34A" />
                  ) : order.status === OrderStatus.ON_THE_WAY || order.status === OrderStatus.PICKED_UP ? (
                    <Bike size={28} color="#FF4B3A" />
                  ) : (
                    <Utensils size={28} color="#FF4B3A" />
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Live OpenStreetMap Route Card */}
          {!isCancelledOrRejected ? (
            <View style={styles.mapSectionWrapper}>
              <OpenStreetMap
                center={mapCenter}
                zoom={14}
                markers={mapMarkers}
                routeCoordinates={routeCoordinates}
                height={225}
                interactive={true}
                showControls={true}
                fitBounds={true}
                headerTitle="Live OpenStreetMap Tracking"
                headerSubtitle={
                  courierLocation
                    ? `Courier moving at ${Math.round(courierLocation.speed || 0)} km/h`
                    : order.status === OrderStatus.DELIVERED
                    ? 'Delivered to your address'
                    : 'Dispatch corridor active'
                }
                showExpandBtn={true}
                onExpandPress={() => setShowMapModal(true)}
              />

              {/* Live Courier GPS Telemetry telemetry pill */}
              {(courierLocation || isSocketLive) ? (
                <View style={[styles.mapTelemetryRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.livePulseContainer}>
                    <View style={styles.livePulseDot} />
                    <Text style={[styles.livePulseTitle, { color: colors.text }]}>
                      {courierLocation ? `GPS: ${courierLocation.latitude.toFixed(4)}, ${courierLocation.longitude.toFixed(4)}` : 'Live Telemetry Active'}
                    </Text>
                  </View>
                  {courierLocation?.speed ? (
                    <View style={styles.liveSpeedPill}>
                      <Text style={styles.liveSpeedText}>{Math.round(courierLocation.speed)} km/h</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

          {/* 7-Step Fulfillment Stepper */}
          {!isCancelledOrRejected ? (
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Delivery Progress</Text>
              <View style={styles.stepperContainer}>
                {TRACKING_STEPS.map((step, index) => {
                  const isCompleted = currentStepIdx > index;
                  const isCurrent = currentStepIdx === index;
                  const StepIcon = step.icon;

                  return (
                    <View key={step.key} style={styles.stepRow}>
                      {/* Left Column: Icon circle + vertical line */}
                      <View style={styles.stepLeftCol}>
                        <View
                          style={[
                            styles.stepCircle,
                            isCompleted
                              ? styles.stepCircleCompleted
                              : isCurrent
                              ? styles.stepCircleCurrent
                              : [styles.stepCirclePending, { backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9', borderColor: colors.border }],
                          ]}
                        >
                          {isCompleted ? (
                            <CheckCircle2 size={16} color="#FFFFFF" />
                          ) : (
                            <StepIcon
                              size={15}
                              color={isCurrent ? '#FFFFFF' : colors.textMuted}
                            />
                          )}
                        </View>

                        {index < TRACKING_STEPS.length - 1 ? (
                          <View
                            style={[
                              styles.stepLine,
                              isCompleted ? styles.stepLineCompleted : [styles.stepLinePending, { backgroundColor: colors.border }],
                            ]}
                          />
                        ) : null}
                      </View>

                      {/* Right Column: Step Label & Description */}
                      <View style={styles.stepContent}>
                        <Text
                          style={[
                            styles.stepTitle,
                            isCurrent
                              ? styles.stepTitleCurrent
                              : isCompleted
                              ? [styles.stepTitleCompleted, { color: colors.text }]
                              : [styles.stepTitlePending, { color: colors.textMuted }],
                          ]}
                        >
                          {step.title}
                        </Text>
                        <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{step.desc}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Assigned Courier Card */}
          {order.deliveryAssignment?.driver && !isCancelledOrRejected ? (
            <View style={[styles.sectionCard, isDark ? { backgroundColor: '#1E1B4B', borderColor: '#4338CA' } : styles.courierCardHighlight]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <Bike size={18} color={isDark ? '#A5B4FC' : '#7C3AED'} />
                  <Text style={[styles.sectionTitle, { color: isDark ? '#A5B4FC' : '#6B21A8' }]}>Assigned Courier</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setChatTarget('COURIER');
                      setShowChatModal(true);
                    }}
                    style={[styles.chatCourierPill, isDark && { backgroundColor: '#312E81', borderColor: '#4338CA' }]}
                  >
                    <MessageCircle size={13} color={isDark ? '#C7D2FE' : '#7C3AED'} />
                    <Text style={[styles.chatCourierPillText, isDark && { color: '#C7D2FE' }]}>Chat</Text>
                  </TouchableOpacity>
                  {order.deliveryAssignment.driver.user?.phone ? (
                    <TouchableOpacity
                      onPress={() => handleCall(order.deliveryAssignment?.driver?.user?.phone || '')}
                      style={[styles.callCourierPill, isDark && { backgroundColor: '#312E81' }]}
                    >
                      <Phone size={13} color={isDark ? '#C7D2FE' : '#7C3AED'} />
                      <Text style={[styles.callCourierPillText, isDark && { color: '#C7D2FE' }]}>Call</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              <View style={styles.courierInfoRow}>
                {order.deliveryAssignment.driver.user?.avatarUrl ? (
                  <Image
                    source={{ uri: order.deliveryAssignment.driver.user.avatarUrl }}
                    style={styles.courierAvatar}
                  />
                ) : (
                  <View style={styles.courierAvatarPlaceholder}>
                    <Text style={styles.courierInitials}>
                      {order.deliveryAssignment.driver.user?.name?.charAt(0) || 'D'}
                    </Text>
                  </View>
                )}

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.courierName, { color: colors.text }]}>
                    {order.deliveryAssignment.driver.user?.name || 'Assigned Courier'}
                  </Text>
                  <Text style={[styles.courierVehicle, { color: isDark ? '#A5B4FC' : '#6B21A8' }]}>
                    {order.deliveryAssignment.driver.vehicleType || 'Motorcycle'}
                    {order.deliveryAssignment.driver.vehiclePlate
                      ? ` • ${order.deliveryAssignment.driver.vehiclePlate}`
                      : ''}
                  </Text>
                  <Text style={[styles.courierStatusSub, { color: isDark ? '#C7D2FE' : '#9333EA' }]}>
                    {order.status === OrderStatus.ON_THE_WAY
                      ? 'En route to your location'
                      : order.status === OrderStatus.PICKED_UP
                      ? 'Order picked up from kitchen'
                      : 'Heading to restaurant'}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* Restaurant Details Card */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <Utensils size={18} color="#FF4B3A" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Restaurant Details</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  onPress={() => {
                    setChatTarget('STORE');
                    setShowChatModal(true);
                  }}
                  style={[styles.chatStorePill, isDark && { backgroundColor: colors.brandLight, borderColor: colors.brand }]}
                >
                  <MessageCircle size={13} color="#FF4B3A" />
                  <Text style={styles.chatStorePillText}>Chat</Text>
                </TouchableOpacity>
                {order.restaurant?.phone ? (
                  <TouchableOpacity
                    onPress={() => handleCall(order.restaurant?.phone)}
                    style={[styles.callPill, isDark && { backgroundColor: colors.brandLight }]}
                  >
                    <Phone size={13} color="#FF4B3A" />
                    <Text style={styles.callPillText}>Call</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <Text style={[styles.restaurantName, { color: colors.text }]}>{order.restaurant?.name}</Text>
            <Text style={[styles.addressSub, { color: colors.textSecondary }]}>
              {order.restaurant?.street}, {order.restaurant?.city}
            </Text>
          </View>

          {/* Delivery Address Card */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <MapPin size={18} color="#FF4B3A" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Delivery Destination</Text>
              </View>
            </View>

            <Text style={[styles.addressTitle, { color: colors.text }]}>
              {order.deliveryAddress?.title || 'Address'}
            </Text>
            <Text style={[styles.addressSub, { color: colors.textSecondary }]}>
              {order.deliveryAddress?.street}
              {order.deliveryAddress?.apartment ? `, Apt ${order.deliveryAddress.apartment}` : ''},{' '}
              {order.deliveryAddress?.city}
            </Text>
            {order.deliveryAddress?.deliveryInstructions ? (
              <View style={[styles.instructionsBox, { backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9' }]}>
                <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
                  Note: {order.deliveryAddress.deliveryInstructions}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Ordered Items Breakdown */}
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <Receipt size={18} color="#FF4B3A" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Ordered Items</Text>
              </View>
            </View>

            {(order.items || []).map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemQty}>{item.quantity}x</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: colors.text }]}>{item.nameSnapshot}</Text>
                    {item.addons && item.addons.length > 0 ? (
                      <Text style={[styles.itemAddons, { color: colors.textSecondary }]}>
                        + {item.addons.map((a) => a.nameSnapshot).join(', ')}
                      </Text>
                    ) : null}
                    {item.specialNotes ? (
                      <Text style={[styles.itemNotes, { color: colors.textMuted }]}>"{item.specialNotes}"</Text>
                    ) : null}
                  </View>
                </View>
                <Text style={[styles.itemPrice, { color: colors.text }]}>${formatCurrency(item.subtotal)}</Text>
              </View>
            ))}

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Bill Breakdown */}
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Subtotal</Text>
              <Text style={[styles.billValue, { color: colors.text }]}>${formatCurrency(order.subtotal)}</Text>
            </View>

            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Delivery Fee</Text>
              <Text style={[styles.billValue, { color: colors.text }]}>${formatCurrency(order.deliveryFee)}</Text>
            </View>

            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Service Fee</Text>
              <Text style={[styles.billValue, { color: colors.text }]}>${formatCurrency(order.serviceFee)}</Text>
            </View>

            {toNumber(order.discountAmount) > 0 ? (
              <View style={styles.billRow}>
                <Text style={styles.discountLabel}>Discount</Text>
                <Text style={styles.discountValue}>-${formatCurrency(order.discountAmount)}</Text>
              </View>
            ) : null}

            {toNumber(order.tipAmount) > 0 ? (
              <View style={styles.billRow}>
                <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Courier Tip</Text>
                <Text style={[styles.billValue, { color: colors.text }]}>+${formatCurrency(order.tipAmount)}</Text>
              </View>
            ) : null}

            <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
              <View>
                <Text style={[styles.totalLabel, { color: colors.text }]}>Total Paid</Text>
                <View style={styles.paymentMethodRow}>
                  {order.payment?.paymentMethod === 'COD' ? (
                    <Banknote size={14} color="#16A34A" />
                  ) : (
                    <CreditCard size={14} color="#2563EB" />
                  )}
                  <Text style={[styles.paymentMethodText, { color: colors.textSecondary }]}>
                    {order.payment?.paymentMethod === 'COD'
                      ? 'Cash on Delivery'
                      : 'Credit Card (Stripe)'}
                  </Text>
                </View>
              </View>
              <Text style={styles.totalValue}>${formatCurrency(order.totalAmount)}</Text>
            </View>
          </View>

          {/* Verified Proof of Delivery Card */}
          {order.status === OrderStatus.DELIVERED ? (
            <View style={[styles.sectionCard, styles.proofCard, isDark && { backgroundColor: '#064E3B', borderColor: '#059669' }]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <ShieldCheck size={18} color={isDark ? '#6EE7B7' : '#059669'} />
                  <Text style={[styles.sectionTitle, { color: isDark ? '#6EE7B7' : '#065F46' }]}>
                    Verified Proof of Delivery
                  </Text>
                </View>
                <View style={[styles.proofBadge, isDark && { backgroundColor: '#047857' }]}>
                  <Check size={12} color={isDark ? '#A7F3D0' : '#047857'} />
                  <Text style={[styles.proofBadgeText, isDark && { color: '#A7F3D0' }]}>Completed</Text>
                </View>
              </View>

              <Text style={[styles.proofDesc, isDark && { color: '#D1FAE5' }]}>
                Drop-off location verified and photo logged by courier upon delivery handover.
              </Text>

              <View style={[styles.proofDetailsRow, isDark && { backgroundColor: '#022C22', borderColor: '#065F46' }]}>
                <Camera size={14} color={isDark ? '#6EE7B7' : '#059669'} />
                <Text style={[styles.proofDetailsText, isDark && { color: '#A7F3D0' }]}>
                  Drop-off photo verification encrypted & saved to delivery record.
                </Text>
              </View>
            </View>
          ) : null}

          {/* Gamified Post-Order Mystery Reward Perk Card */}
          {order.status === OrderStatus.DELIVERED ? (
            <TouchableOpacity
              style={[styles.rewardBanner, isDark && { backgroundColor: '#451A03', borderColor: '#B45309' }]}
              activeOpacity={0.88}
              onPress={() => setShowRewardModal(true)}
            >
              <View style={[styles.rewardBannerIcon, isDark && { backgroundColor: '#78350F', borderColor: '#92400E' }]}>
                <Gift size={22} color={isDark ? '#FDE68A' : '#D97706'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rewardBannerTitle, isDark && { color: '#FDE68A' }]}>Claim Your Mystery Reward Card! 🎁</Text>
                <Text style={[styles.rewardBannerSub, isDark && { color: '#FCD34D' }]}>Scratch & reveal 15% discount for your next order</Text>
              </View>
              <ArrowRight size={18} color={isDark ? '#FDE68A' : '#D97706'} />
            </TouchableOpacity>
          ) : null}

          {/* Action Buttons: Rate & Review, Order Again, or Cancel */}
          {order.status === OrderStatus.DELIVERED ? (
            <TouchableOpacity
              style={[
                styles.reviewBtn,
                hasReviewed && styles.reviewBtnDisabled,
                isDark && !hasReviewed && { backgroundColor: '#451A03', borderColor: '#B45309' },
                isDark && hasReviewed && { backgroundColor: '#064E3B', borderColor: '#059669' },
              ]}
              onPress={() => setShowReviewModal(true)}
              disabled={hasReviewed}
              activeOpacity={0.88}
            >
              <Star
                size={18}
                color={hasReviewed ? '#16A34A' : '#D97706'}
                fill={hasReviewed ? '#16A34A' : '#F59E0B'}
              />
              <Text
                style={[
                  styles.reviewBtnText,
                  isDark && !hasReviewed && { color: '#FDE68A' },
                  hasReviewed && { color: '#16A34A', fontWeight: '800' },
                ]}
              >
                {hasReviewed ? 'Feedback Submitted ✓' : 'Rate & Review Order'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {isTerminal ? (
            <TouchableOpacity
              style={styles.reorderLargeBtn}
              onPress={handleReorder}
              disabled={isReordering}
              activeOpacity={0.88}
            >
              {isReordering ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <RotateCcw size={18} color="#FFFFFF" />
                  <Text style={styles.reorderLargeBtnText}>Order Again</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}

          {canCancel ? (
            <TouchableOpacity
              style={[styles.cancelBtn, isDark && { backgroundColor: '#450A0A', borderColor: '#7F1D1D' }]}
              onPress={() => setShowCancelModal(true)}
              disabled={isCancelling}
              activeOpacity={0.85}
            >
              <Text style={[styles.cancelBtnText, isDark && { color: '#FCA5A5' }]}>
                {isCancelling ? 'Cancelling...' : 'Cancel Order'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>

        {/* Cancellation Reason Modal */}
        <Modal
          visible={showCancelModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCancelModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  <AlertTriangle size={20} color="#DC2626" />
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Cancel Order</Text>
                </View>
                <TouchableOpacity onPress={() => setShowCancelModal(false)} hitSlop={10}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                Please select a reason for cancelling order #{order.orderNumber}:
              </Text>

              <View style={styles.reasonsList}>
                {CANCELLATION_REASONS.map((reason) => {
                  const isSelected = selectedReason === reason;
                  return (
                    <TouchableOpacity
                      key={reason}
                      style={[
                        styles.reasonOption,
                        { backgroundColor: isDark ? colors.surfaceSecondary : '#F8FAFC', borderColor: colors.border },
                        isSelected && (isDark ? { borderColor: '#EF4444', backgroundColor: '#450A0A' } : styles.reasonOptionSelected),
                      ]}
                      onPress={() => setSelectedReason(reason)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected ? <View style={styles.radioDot} /> : null}
                      </View>
                      <Text
                        style={[
                          styles.reasonText,
                          { color: colors.text },
                          isSelected && (isDark ? { color: '#FCA5A5', fontWeight: '700' } : styles.reasonTextSelected),
                        ]}
                      >
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedReason === 'Other reason' ? (
                <TextInput
                  style={[styles.customReasonInput, { backgroundColor: isDark ? colors.surfaceSecondary : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
                  placeholder="Please describe why you're cancelling..."
                  placeholderTextColor={colors.textMuted}
                  value={customReason}
                  onChangeText={setCustomReason}
                  multiline
                  numberOfLines={3}
                />
              ) : null}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.keepOrderBtn, { backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9' }]}
                  onPress={() => setShowCancelModal(false)}
                >
                  <Text style={[styles.keepOrderBtnText, { color: colors.text }]}>Keep Order</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmCancelBtn}
                  onPress={handleConfirmCancel}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmCancelBtnText}>Confirm Cancel</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Customer Review Modal */}
        <Modal
          visible={showReviewModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowReviewModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  <Star size={20} color="#F59E0B" fill="#F59E0B" />
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Rate Your Experience</Text>
                </View>
                <TouchableOpacity onPress={() => setShowReviewModal(false)} hitSlop={10}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                How was your meal from {order.restaurant?.name || 'this restaurant'}?
              </Text>

              {/* 5-Star Rating Buttons */}
              <View style={styles.starRatingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    style={styles.starButton}
                    onPress={() => setReviewRating(star)}
                    activeOpacity={0.7}
                  >
                    <Star
                      size={32}
                      color="#F59E0B"
                      fill={star <= reviewRating ? '#F59E0B' : (isDark ? '#374151' : '#FFFFFF')}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[styles.reviewTextInput, { backgroundColor: isDark ? colors.surfaceSecondary : '#F8FAFC', borderColor: colors.border, color: colors.text }]}
                placeholder="Share your thoughts about food taste, packaging, or speed..."
                placeholderTextColor={colors.textMuted}
                value={reviewComment}
                onChangeText={setReviewComment}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.keepOrderBtn, { backgroundColor: isDark ? colors.surfaceSecondary : '#F1F5F9' }]}
                  onPress={() => setShowReviewModal(false)}
                >
                  <Text style={[styles.keepOrderBtnText, { color: colors.text }]}>Later</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitReviewBtn}
                  onPress={handleReviewSubmit}
                  disabled={isSubmittingReview}
                >
                  {isSubmittingReview ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitReviewBtnText}>Submit Review</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Live In-App Chat Modal */}
        {id && order ? (
          <ChatModal
            visible={showChatModal}
            onClose={() => setShowChatModal(false)}
            orderId={id as string}
            orderNumber={order.orderNumber}
            role="CUSTOMER"
            targetRole={chatTarget}
            recipientName={
              chatTarget === 'COURIER'
                ? order.deliveryAssignment?.driver?.user?.name || 'Courier Driver'
                : order.restaurant?.name || 'Restaurant Support'
            }
          />
        ) : null}

        {/* Post-Order Reward Scratch Card Modal */}
        <PostOrderRewardModal
          visible={showRewardModal}
          onClose={() => setShowRewardModal(false)}
          onUseCode={(code) => {
            Alert.alert('Perk Unlocked!', `Promo code ${code} is ready to use on your next order!`);
            router.replace('/(customer)/(tabs)/home');
          }}
        />

        {/* Fullscreen OpenStreetMap Route Modal */}
        <OpenStreetMapModal
          visible={showMapModal}
          onClose={() => setShowMapModal(false)}
          center={mapCenter}
          markers={mapMarkers}
          routeCoordinates={routeCoordinates}
          title={`Order #${order.orderNumber} Live Route`}
          subtitle="Real-time OpenStreetMap Telemetry & Route"
        />

        {/* Floating Chat with Courier / Restaurant Button */}
        {!isTerminal && order ? (
          <TouchableOpacity
            style={styles.floatingChatBtn}
            activeOpacity={0.9}
            onPress={() => {
              setChatTarget(order.deliveryAssignment?.driver ? 'COURIER' : 'STORE');
              setShowChatModal(true);
            }}
          >
            <MessageCircle size={18} color="#FFFFFF" />
            <Text style={styles.floatingChatText}>
              {order.deliveryAssignment?.driver ? 'Chat with Courier' : 'Chat with Restaurant'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  reviewBtn: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  reviewBtnDisabled: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  reviewBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
  },
  starRatingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 16,
  },
  starButton: {
    padding: 4,
  },
  reviewTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitReviewBtn: {
    flex: 1,
    backgroundColor: '#FF4B3A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitReviewBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
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
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 16,
  },
  notFoundSub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : Platform.OS === 'android' ? 44 : 20,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  headerLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroStatusText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  heroEstText: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
    fontWeight: '500',
  },
  heroIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF1F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelledCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 16,
    borderRadius: 16,
  },
  cancelledTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#991B1B',
  },
  cancelledReason: {
    fontSize: 13,
    color: '#B91C1C',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  stepperContainer: {
    marginTop: 16,
  },
  stepRow: {
    flexDirection: 'row',
    minHeight: 52,
  },
  stepLeftCol: {
    alignItems: 'center',
    width: 32,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepCircleCompleted: {
    backgroundColor: '#16A34A',
  },
  stepCircleCurrent: {
    backgroundColor: '#FF4B3A',
    shadowColor: '#FF4B3A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  stepCirclePending: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    marginVertical: 2,
  },
  stepLineCompleted: {
    backgroundColor: '#16A34A',
  },
  stepLinePending: {
    backgroundColor: '#E2E8F0',
  },
  stepContent: {
    marginLeft: 14,
    flex: 1,
    paddingBottom: 16,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepTitleCurrent: {
    color: '#FF4B3A',
    fontWeight: '800',
  },
  stepTitleCompleted: {
    color: '#0F172A',
    fontWeight: '700',
  },
  stepTitlePending: {
    color: '#94A3B8',
  },
  stepDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  callPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF1F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  callPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF4B3A',
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  addressTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  addressSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 18,
  },
  instructionsBox: {
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  instructionsText: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  itemLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 10,
  },
  itemQty: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF4B3A',
    marginRight: 8,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  itemAddons: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  itemNotes: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 1,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  billLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  billValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  discountLabel: {
    fontSize: 13,
    color: '#16A34A',
  },
  discountValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16A34A',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FF4B3A',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  paymentMethodText: {
    fontSize: 11,
    color: '#64748B',
  },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  liveTelemetryCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  liveTelemetryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  livePulseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  livePulseTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  liveSpeedPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveSpeedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
  },
  liveTelemetrySub: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  courierCardHighlight: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
    borderWidth: 1.5,
  },
  callCourierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  callCourierPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  courierInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  courierAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E9D5FF',
  },
  courierAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  courierInitials: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  courierName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  courierVehicle: {
    fontSize: 13,
    color: '#6B21A8',
    fontWeight: '600',
    marginTop: 2,
  },
  courierStatusSub: {
    fontSize: 11,
    color: '#9333EA',
    marginTop: 2,
  },
  reorderLargeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF4B3A',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#FF4B3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  reorderLargeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    paddingBottom: 28,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  reasonsList: {
    gap: 10,
    marginBottom: 16,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  reasonOptionSelected: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#DC2626',
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#DC2626',
  },
  reasonText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  reasonTextSelected: {
    color: '#991B1B',
    fontWeight: '700',
  },
  customReasonInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  keepOrderBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  keepOrderBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chatCourierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  chatCourierPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  chatStorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  chatStorePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF4B3A',
  },
  proofCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1.5,
  },
  proofBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  proofBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  proofDesc: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 10,
  },
  proofDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  proofDetailsText: {
    flex: 1,
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
  },
  rewardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  rewardBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  rewardBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  rewardBannerSub: {
    fontSize: 11,
    color: '#B45309',
  },
  floatingChatBtn: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: '#FF4B3A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingChatText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mapSectionWrapper: {
    marginBottom: 16,
    gap: 8,
  },
  mapTelemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});


