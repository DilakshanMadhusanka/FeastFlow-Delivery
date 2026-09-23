import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverService } from '../../services/driver.service';
import { mobileSocketService } from '../../services/socket.service';
import { Loading } from '../../components/ui/Loading';
import { Button } from '../../components/ui/Button';
import { DeliveryWorkflowStep } from '@food-delivery/shared';
import { formatCurrency, toNumber } from '../../utils/formatters';
import {
  ArrowLeft,
  Navigation,
  Utensils,
  MapPin,
  Phone,
  CheckCircle2,
  PackageCheck,
  AlertTriangle,
  Banknote,
  CreditCard,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native';

export default function ActiveDeliveryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const { data: delivery, isLoading, refetch } = useQuery({
    queryKey: ['activeDelivery'],
    queryFn: () => driverService.getActiveDelivery(),
    refetchInterval: 6000,
  });

  // Stream live GPS telemetry over WebSocket while delivery is active
  useEffect(() => {
    if (!delivery || delivery.currentStep === 'DELIVERED') return;

    mobileSocketService.connect().then(() => {
      mobileSocketService.joinDriver();
    });

    const sendTelemetry = () => {
      const isEnRouteCustomer =
        delivery.currentStep === 'HEADING_TO_CUSTOMER' ||
        delivery.currentStep === 'ARRIVED_AT_CUSTOMER';

      const baseLat = isEnRouteCustomer
        ? delivery.deliveryAddress.latitude
        : delivery.restaurant.latitude;
      const baseLng = isEnRouteCustomer
        ? delivery.deliveryAddress.longitude
        : delivery.restaurant.longitude;

      const jitter = (Math.random() - 0.5) * 0.002;

      mobileSocketService.emitDriverLocation({
        orderId: delivery.orderId,
        latitude: baseLat + jitter,
        longitude: baseLng + jitter,
        bearing: Math.floor(Math.random() * 360),
        speed: 28 + Math.floor(Math.random() * 12),
      });
    };

    // Emit initial position
    sendTelemetry();

    // Pulse telemetry every 8 seconds
    const interval = setInterval(sendTelemetry, 8000);

    return () => {
      clearInterval(interval);
    };
  }, [delivery?.orderId, delivery?.currentStep]);

  const advanceStepMutation = useMutation({
    mutationFn: (nextStep: DeliveryWorkflowStep) =>
      driverService.advanceWorkflowStep(nextStep),
    onSuccess: (updated) => {
      queryClient.setQueryData(['activeDelivery'], updated);
      queryClient.invalidateQueries({ queryKey: ['driverEarnings'] });

      if (!updated || updated.currentStep === 'DELIVERED') {
        Alert.alert(
          'Delivery Completed! 🎉',
          `Great job! Payout of $${formatCurrency(delivery?.driverPayout || 5)} + $${formatCurrency(
            delivery?.customerTip || 0
          )} tip has been credited to your account.`,
          [
            {
              text: 'Back to Radar',
              onPress: () => router.replace('/(driver)/dashboard'),
            },
          ]
        );
      }
    },
    onError: (err: any) => {
      Alert.alert('Workflow Error', err?.message || 'Failed to advance delivery step.');
    },
  });

  const handleCall = (phoneNumber?: string | null) => {
    if (!phoneNumber) {
      Alert.alert('Unavailable', 'No phone contact provided.');
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleToggleCheck = (itemId: string) => {
    setCheckedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  if (isLoading) {
    return <Loading fullScreen message="Loading delivery route..." />;
  }

  if (!delivery) {
    return (
      <View style={styles.centerContainer}>
        <CheckCircle2 size={48} color="#16A34A" />
        <Text style={styles.noActiveTitle}>No Active Delivery</Text>
        <Text style={styles.noActiveSub}>
          You do not have any orders assigned at the moment.
        </Text>
        <Button
          title="Return to Dashboard"
          style={{ marginTop: 16 }}
          onPress={() => router.replace('/(driver)/dashboard')}
        />
      </View>
    );
  }

  const step = delivery.currentStep;
  const isCod = delivery.paymentMethod === 'COD';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Order #{delivery.orderNumber}</Text>
          <Text style={styles.headerSub}>Turn-by-Turn Delivery Route</Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Step Progress Visual Bar */}
        <View style={styles.stepProgressBar}>
          {[
            { key: 'HEADING_TO_RESTAURANT', label: 'To Store' },
            { key: 'ARRIVED_AT_RESTAURANT', label: 'At Store' },
            { key: 'PICKED_UP', label: 'Picked Up' },
            { key: 'HEADING_TO_CUSTOMER', label: 'En Route' },
            { key: 'ARRIVED_AT_CUSTOMER', label: 'At Door' },
          ].map((s, idx) => {
            const stepOrder = [
              'HEADING_TO_RESTAURANT',
              'ARRIVED_AT_RESTAURANT',
              'PICKED_UP',
              'HEADING_TO_CUSTOMER',
              'ARRIVED_AT_CUSTOMER',
            ];
            const currentIdx = stepOrder.indexOf(step);
            const isDone = currentIdx > idx;
            const isCurrent = currentIdx === idx;

            return (
              <View key={s.key} style={styles.progressSegment}>
                <View
                  style={[
                    styles.progressDot,
                    isDone
                      ? styles.progressDotDone
                      : isCurrent
                      ? styles.progressDotCurrent
                      : styles.progressDotPending,
                  ]}
                />
                <Text
                  style={[
                    styles.progressLabel,
                    isCurrent ? styles.progressLabelCurrent : null,
                  ]}
                >
                  {s.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* COD Alert Banner */}
        {isCod && (step === 'HEADING_TO_CUSTOMER' || step === 'ARRIVED_AT_CUSTOMER') ? (
          <View style={styles.codAlert}>
            <Banknote size={24} color="#15803D" />
            <View style={{ flex: 1 }}>
              <Text style={styles.codTitle}>Cash On Delivery Order</Text>
              <Text style={styles.codDesc}>
                Collect exactly <Text style={styles.codAmount}>${formatCurrency(delivery.totalAmount)}</Text> in cash from customer upon handover.
              </Text>
            </View>
          </View>
        ) : null}

        {/* Dynamic Card Based on Step */}
        {step === 'HEADING_TO_RESTAURANT' || step === 'ARRIVED_AT_RESTAURANT' ? (
          /* RESTAURANT PICKUP TARGET CARD */
          <View style={styles.card}>
            <View style={styles.cardTopRow}>
              <View style={styles.cardBadge}>
                <Utensils size={14} color="#2563EB" />
                <Text style={styles.cardBadgeText}>Step 1: Pickup Location</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleCall(delivery.restaurant.phone)}
                style={styles.callPill}
              >
                <Phone size={14} color="#FF4B3A" />
                <Text style={styles.callPillText}>Call Restaurant</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.locationTitle}>{delivery.restaurant.name}</Text>
            <Text style={styles.locationAddress}>
              {delivery.restaurant.street}, {delivery.restaurant.city}
            </Text>

            {/* Checklist of items to collect */}
            <View style={styles.itemsSection}>
              <Text style={styles.itemsSectionTitle}>Order Items Checklist</Text>
              {delivery.items.map((item) => {
                const isChecked = Boolean(checkedItems[item.id]);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.checkItemRow}
                    activeOpacity={0.7}
                    onPress={() => handleToggleCheck(item.id)}
                  >
                    <View
                      style={[
                        styles.checkBox,
                        isChecked ? styles.checkBoxActive : null,
                      ]}
                    >
                      {isChecked ? <CheckCircle2 size={16} color="#FFFFFF" /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.checkItemName,
                          isChecked ? styles.checkItemNameDone : null,
                        ]}
                      >
                        {item.quantity}x {item.name}
                      </Text>
                      {item.addons && item.addons.length > 0 ? (
                        <Text style={styles.checkItemAddons}>
                          + {item.addons.join(', ')}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {step === 'HEADING_TO_RESTAURANT' ? (
              <Button
                title="I Have Arrived at Restaurant"
                size="lg"
                variant="primary"
                isLoading={advanceStepMutation.isPending}
                onPress={() => advanceStepMutation.mutate('ARRIVED_AT_RESTAURANT')}
                style={{ marginTop: 16 }}
              />
            ) : (
              <Button
                title="Confirm Food Picked Up"
                size="lg"
                variant="primary"
                isLoading={advanceStepMutation.isPending}
                onPress={() => advanceStepMutation.mutate('PICKED_UP')}
                style={{ marginTop: 16 }}
              />
            )}
          </View>
        ) : (
          /* CUSTOMER DROPOFF TARGET CARD */
          <View style={styles.card}>
            <View style={styles.cardTopRow}>
              <View style={styles.cardBadgeRed}>
                <MapPin size={14} color="#DC2626" />
                <Text style={styles.cardBadgeRedText}>Step 2: Customer Dropoff</Text>
              </View>
              {delivery.customer.phone ? (
                <TouchableOpacity
                  onPress={() => handleCall(delivery.customer.phone)}
                  style={styles.callPill}
                >
                  <Phone size={14} color="#FF4B3A" />
                  <Text style={styles.callPillText}>Call Customer</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={styles.locationTitle}>{delivery.customer.name}</Text>
            <Text style={styles.locationAddress}>
              {delivery.deliveryAddress.street}
              {delivery.deliveryAddress.apartment
                ? `, Apt ${delivery.deliveryAddress.apartment}`
                : ''}
              , {delivery.deliveryAddress.city}
            </Text>

            {delivery.deliveryAddress.deliveryInstructions ? (
              <View style={styles.instructionsBox}>
                <Text style={styles.instructionsLabel}>Dropoff Instructions:</Text>
                <Text style={styles.instructionsText}>
                  "{delivery.deliveryAddress.deliveryInstructions}"
                </Text>
              </View>
            ) : null}

            {step === 'PICKED_UP' ? (
              <Button
                title="Start Route to Customer"
                size="lg"
                variant="primary"
                isLoading={advanceStepMutation.isPending}
                onPress={() => advanceStepMutation.mutate('HEADING_TO_CUSTOMER')}
                style={{ marginTop: 16 }}
              />
            ) : step === 'HEADING_TO_CUSTOMER' ? (
              <Button
                title="I Have Arrived at Customer Door"
                size="lg"
                variant="primary"
                isLoading={advanceStepMutation.isPending}
                onPress={() => advanceStepMutation.mutate('ARRIVED_AT_CUSTOMER')}
                style={{ marginTop: 16 }}
              />
            ) : (
              <Button
                title="Complete Delivery (Handed to Customer)"
                size="lg"
                variant="primary"
                isLoading={advanceStepMutation.isPending}
                onPress={() => advanceStepMutation.mutate('DELIVERED')}
                style={{ marginTop: 16 }}
              />
            )}
          </View>
        )}

        {/* Delivery Compensation Summary */}
        <View style={styles.payoutCard}>
          <Text style={styles.payoutTitle}>Estimated Earnings for this Trip</Text>
          <View style={styles.payoutRow}>
            <Text style={styles.payoutLabel}>Courier Base + Distance Payout</Text>
            <Text style={styles.payoutVal}>${formatCurrency(delivery.driverPayout)}</Text>
          </View>
          <View style={styles.payoutRow}>
            <Text style={styles.payoutLabel}>Customer Tip (100% yours)</Text>
            <Text style={styles.payoutVal}>+${formatCurrency(delivery.customerTip)}</Text>
          </View>
          <View style={styles.payoutTotalRow}>
            <Text style={styles.payoutTotalLabel}>Guaranteed Total</Text>
            <Text style={styles.payoutTotalVal}>
              ${formatCurrency(toNumber(delivery.driverPayout) + toNumber(delivery.customerTip))}
            </Text>
          </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  noActiveTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginTop: 12,
  },
  noActiveSub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
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
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  headerSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 60,
  },
  stepProgressBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  progressSegment: {
    alignItems: 'center',
    flex: 1,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 4,
  },
  progressDotDone: {
    backgroundColor: '#16A34A',
  },
  progressDotCurrent: {
    backgroundColor: '#FF4B3A',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  progressDotPending: {
    backgroundColor: '#E5E7EB',
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  progressLabelCurrent: {
    color: '#FF4B3A',
    fontWeight: '800',
  },
  codAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    padding: 14,
    borderRadius: 16,
  },
  codTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803D',
  },
  codDesc: {
    fontSize: 12,
    color: '#166534',
    marginTop: 2,
    lineHeight: 16,
  },
  codAmount: {
    fontWeight: '900',
    fontSize: 14,
    color: '#14532D',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  cardBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  cardBadgeRed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  cardBadgeRedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  callPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF1F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  callPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF4B3A',
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  locationAddress: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 18,
  },
  instructionsBox: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  instructionsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
  },
  instructionsText: {
    fontSize: 13,
    color: '#111827',
    fontStyle: 'italic',
    marginTop: 2,
  },
  itemsSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  itemsSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkBoxActive: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  checkItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  checkItemNameDone: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  checkItemAddons: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  payoutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  payoutTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  payoutLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  payoutVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  payoutTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  payoutTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  payoutTotalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#16A34A',
  },
});
