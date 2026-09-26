import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addressService, AddressItem } from '../../services/address.service';
import { paymentService } from '../../services/payment.service';
import { orderService } from '../../services/order.service';
import { useCartStore } from '../../store/cartStore';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { PaymentMethod } from '@food-delivery/shared';
import { formatCurrency, toNumber } from '../../utils/formatters';
import {
  ArrowLeft,
  MapPin,
  Plus,
  CreditCard,
  Banknote,
  Smartphone,
  Check,
  ShieldCheck,
  HeartHandshake,
  Clock,
  Calendar,
  DoorClosed,
  Key,
} from 'lucide-react-native';
import { OpenStreetMap } from '../../components/map/OpenStreetMap';
import { useTheme } from '../../theme/useTheme';

type DropoffPreference = 'LEAVE_AT_DOOR' | 'HAND_DELIVER' | 'MEET_IN_LOBBY';
type DeliveryTiming = 'ASAP' | 'SCHEDULED';

export default function CheckoutScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { cart, clearCart } = useCartStore();
  const { colors, isDark } = useTheme();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(
    PaymentMethod.CARD
  );
  const [tipAmount, setTipAmount] = useState<number>(2.0);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);

  // Delivery Timing & Drop-off Preference State
  const [deliveryTiming, setDeliveryTiming] = useState<DeliveryTiming>('ASAP');
  const [scheduledSlot, setScheduledSlot] = useState('Today, 6:30 PM - 7:00 PM');
  const [dropoffPref, setDropoffPref] = useState<DropoffPreference>('LEAVE_AT_DOOR');
  const [buzzerCode, setBuzzerCode] = useState('');

  // New Address Form State
  const [newTitle, setNewTitle] = useState('Home');
  const [newStreet, setNewStreet] = useState('');
  const [newApt, setNewApt] = useState('');
  const [newCity, setNewCity] = useState('New York');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // 1. Fetch Saved Addresses
  const { data: addresses, isLoading: loadingAddresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const list = await addressService.getAddresses();
      if (list.length > 0 && !selectedAddressId) {
        const defaultAddr = list.find((a) => a.isDefault) || list[0];
        setSelectedAddressId(defaultAddr.id);
      }
      return list;
    },
  });

  // 2. Add New Address Mutation
  const addAddressMutation = useMutation({
    mutationFn: (data: any) => addressService.createAddress(data),
    onSuccess: (newAddr) => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      if (newAddr) {
        setSelectedAddressId(newAddr.id);
      }
      setShowNewAddressForm(false);
      setNewStreet('');
      setNewApt('');
      setNewNotes('');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save address');
    },
  });

  const handleSaveNewAddress = () => {
    if (!newStreet.trim() || !newCity.trim()) {
      Alert.alert('Required Fields', 'Please enter a valid street address and city.');
      return;
    }

    addAddressMutation.mutate({
      title: newTitle,
      type: newTitle === 'Work' ? 'WORK' : newTitle === 'Home' ? 'HOME' : 'OTHER',
      street: newStreet.trim(),
      apartment: newApt.trim() || undefined,
      city: newCity.trim(),
      latitude: 40.7128, // Default coordinates for dev/simulator
      longitude: -74.006,
      deliveryInstructions: newNotes.trim() || undefined,
      isDefault: true,
    });
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      Alert.alert('Address Missing', 'Please select or add a delivery address.');
      return;
    }

    if (!cart || cart.items.length === 0) {
      Alert.alert('Empty Basket', 'Your basket is empty.');
      router.replace('/(customer)/(tabs)/home');
      return;
    }

    setIsSubmittingOrder(true);

    try {
      // Format dropoff instructions & schedule
      const dropoffLabel =
        dropoffPref === 'LEAVE_AT_DOOR'
          ? 'Leave at door (Contactless)'
          : dropoffPref === 'HAND_DELIVER'
          ? 'Hand to me directly'
          : 'Meet in building lobby';

      const timingLabel =
        deliveryTiming === 'ASAP' ? 'Deliver ASAP' : `Scheduled: ${scheduledSlot}`;

      const buzzerLabel = buzzerCode.trim() ? ` [Buzzer: ${buzzerCode.trim()}]` : '';
      const formattedInstructions = `[${dropoffLabel}${buzzerLabel}] • ${timingLabel}`;

      // 1. Create Order via Order API (atomic order creation, pricing snapshot, payment record)
      const order = await orderService.createOrder({
        deliveryAddressId: selectedAddressId,
        paymentMethod: selectedPaymentMethod,
        tipAmount,
        couponCode: cart.pricing.couponCode || undefined,
        specialInstructions: formattedInstructions,
      });

      // 2. Clear Cart store
      await clearCart();

      // Invalidate queries so orders screen refreshes
      queryClient.invalidateQueries({ queryKey: ['myOrders'] });

      // 3. Confirm & Redirect to Live Tracking Screen
      Alert.alert(
        'Order Placed! 🎉',
        `Your order #${order.orderNumber} from ${order.restaurant?.name || 'the restaurant'} is confirmed!`,
        [
          {
            text: 'Track Order',
            onPress: () => router.replace(`/(customer)/order-tracking/${order.id}` as any),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert(
        'Order Placement Failed',
        err?.response?.data?.message || err?.message || 'Failed to place order.'
      );
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  if (loadingAddresses) {
    return <Loading fullScreen message="Loading checkout details..." />;
  }

  const selectedAddress = addresses?.find((a) => a.id === selectedAddressId);
  const pricing = cart?.pricing;
  const items = cart?.items || [];
  const finalTotal = pricing ? Math.round((pricing.total + tipAmount) * 100) / 100 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Checkout</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Delivery Address Section */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <MapPin size={20} color="#FF4B3A" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Delivery Address</Text>
            </View>

            <TouchableOpacity
              onPress={() => setShowNewAddressForm(!showNewAddressForm)}
              style={styles.addAddressBtn}
            >
              <Plus size={16} color="#FF4B3A" />
              <Text style={styles.addAddressText}>Add New</Text>
            </TouchableOpacity>
          </View>

          {/* New Address Form */}
          {showNewAddressForm ? (
            <View style={[styles.newAddressForm, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>Add New Delivery Address</Text>

              <View style={styles.typeSelectorRow}>
                {['Home', 'Work', 'Other'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeChip,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      newTitle === type && styles.typeChipActive,
                    ]}
                    onPress={() => setNewTitle(type)}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        { color: colors.textSecondary },
                        newTitle === type && styles.typeChipTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                placeholder="Street Address (e.g. 124 W 30th St)"
                placeholderTextColor={colors.textMuted}
                style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={newStreet}
                onChangeText={setNewStreet}
              />

              <TextInput
                placeholder="Apt, Suite, Floor (Optional)"
                placeholderTextColor={colors.textMuted}
                style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={newApt}
                onChangeText={setNewApt}
              />

              <TextInput
                placeholder="City (e.g. New York)"
                placeholderTextColor={colors.textMuted}
                style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={newCity}
                onChangeText={setNewCity}
              />

              <TextInput
                placeholder="Dropoff notes: Ring bell, leave at door..."
                placeholderTextColor={colors.textMuted}
                style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                value={newNotes}
                onChangeText={setNewNotes}
              />

              <Button
                title="Save Address"
                size="sm"
                isLoading={addAddressMutation.isPending}
                onPress={handleSaveNewAddress}
                style={styles.saveAddrBtn}
              />
            </View>
          ) : null}

          {/* Saved Addresses List */}
          {addresses && addresses.length > 0 ? (
            addresses.map((addr) => {
              const isSelected = selectedAddressId === addr.id;
              return (
                <TouchableOpacity
                  key={addr.id}
                  style={[
                    styles.addressItem,
                    { borderColor: colors.border, backgroundColor: colors.card },
                    isSelected && [styles.addressItemActive, { borderColor: colors.brand, backgroundColor: colors.brandLight }],
                  ]}
                  onPress={() => setSelectedAddressId(addr.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radioBox, { borderColor: colors.border }]}>
                    {isSelected ? <View style={styles.radioDot} /> : null}
                  </View>

                  <View style={styles.addressInfo}>
                    <View style={styles.addressTitleRow}>
                      <Text style={[styles.addressTitle, { color: colors.text }]}>{addr.title}</Text>
                      {addr.isDefault ? <Text style={styles.defaultBadge}>Default</Text> : null}
                    </View>
                    <Text style={[styles.addressStreet, { color: colors.textSecondary }]} numberOfLines={1}>
                      {addr.street} {addr.apartment ? `(${addr.apartment})` : ''}, {addr.city}
                    </Text>
                    {addr.deliveryInstructions ? (
                      <Text style={styles.addressNotes} numberOfLines={1}>
                        Note: {addr.deliveryInstructions}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={styles.noAddressText}>No saved addresses. Please add an address above.</Text>
          )}

          {/* Mini OpenStreetMap Destination Preview */}
          {selectedAddress ? (
            <View style={styles.checkoutMapWrapper}>
              <OpenStreetMap
                center={{
                  latitude: selectedAddress.latitude || 40.7128,
                  longitude: selectedAddress.longitude || -74.006,
                }}
                zoom={15}
                markers={[
                  {
                    id: 'checkout_dest',
                    type: 'CUSTOMER',
                    title: selectedAddress.title,
                    description: `${selectedAddress.street}, ${selectedAddress.city}`,
                    latitude: selectedAddress.latitude || 40.7128,
                    longitude: selectedAddress.longitude || -74.006,
                    badgeText: selectedAddress.title,
                  },
                ]}
                height={130}
                interactive={false}
                showControls={false}
                headerTitle="Drop-off Spot on OpenStreetMap"
                showExpandBtn={false}
              />
            </View>
          ) : null}
        </View>

        {/* 2. Delivery Timing Section */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Clock size={20} color="#FF4B3A" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Delivery Timing</Text>
            </View>
            <View style={styles.timingBadge}>
              <Text style={styles.timingBadgeText}>
                {deliveryTiming === 'ASAP' ? '25-35 min' : 'Scheduled'}
              </Text>
            </View>
          </View>

          <View style={styles.timingOptionRow}>
            <TouchableOpacity
              style={[
                styles.timingOptionBtn,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                deliveryTiming === 'ASAP' && [styles.timingOptionBtnActive, { borderColor: colors.brand, backgroundColor: colors.brandLight }],
              ]}
              onPress={() => setDeliveryTiming('ASAP')}
              activeOpacity={0.7}
            >
              <Clock size={16} color={deliveryTiming === 'ASAP' ? '#FF4B3A' : colors.textMuted} />
              <Text
                style={[
                  styles.timingOptionText,
                  { color: colors.textSecondary },
                  deliveryTiming === 'ASAP' && [styles.timingOptionTextActive, { color: colors.brand }],
                ]}
              >
                Deliver ASAP
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.timingOptionBtn,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                deliveryTiming === 'SCHEDULED' && [styles.timingOptionBtnActive, { borderColor: colors.brand, backgroundColor: colors.brandLight }],
              ]}
              onPress={() => setDeliveryTiming('SCHEDULED')}
              activeOpacity={0.7}
            >
              <Calendar size={16} color={deliveryTiming === 'SCHEDULED' ? '#FF4B3A' : colors.textMuted} />
              <Text
                style={[
                  styles.timingOptionText,
                  { color: colors.textSecondary },
                  deliveryTiming === 'SCHEDULED' && [styles.timingOptionTextActive, { color: colors.brand }],
                ]}
              >
                Schedule for Later
              </Text>
            </TouchableOpacity>
          </View>

          {deliveryTiming === 'SCHEDULED' ? (
            <View style={styles.scheduleSlotContainer}>
              <Text style={[styles.slotPickerTitle, { color: colors.textSecondary }]}>Select Delivery Window:</Text>
              <View style={styles.slotChipsWrap}>
                {[
                  'Today, 6:00 - 6:30 PM',
                  'Today, 7:00 - 7:30 PM',
                  'Today, 8:00 - 8:30 PM',
                  'Tomorrow, 12:30 - 1:00 PM',
                ].map((slot) => {
                  const isSelected = scheduledSlot === slot;
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[
                        styles.slotChip,
                        { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                        isSelected && styles.slotChipActive,
                      ]}
                      onPress={() => setScheduledSlot(slot)}
                    >
                      <Text style={[styles.slotChipText, { color: colors.textSecondary }, isSelected && styles.slotChipTextActive]}>
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>

        {/* 3. Drop-off Preferences Section */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <DoorClosed size={20} color="#FF4B3A" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Drop-off Preference</Text>
            </View>
          </View>

          <View style={styles.dropoffList}>
            {[
              {
                id: 'LEAVE_AT_DOOR' as DropoffPreference,
                title: 'Leave at door',
                desc: 'Contactless delivery, driver leaves food safely outside',
              },
              {
                id: 'HAND_DELIVER' as DropoffPreference,
                title: 'Hand it to me',
                desc: 'Driver will ring bell and hand the package directly to you',
              },
              {
                id: 'MEET_IN_LOBBY' as DropoffPreference,
                title: 'Meet in building lobby',
                desc: 'Driver will wait at reception or ground entrance',
              },
            ].map((pref) => {
              const isSelected = dropoffPref === pref.id;
              return (
                <TouchableOpacity
                  key={pref.id}
                  style={[
                    styles.dropoffItem,
                    { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                    isSelected && [styles.dropoffItemActive, { borderColor: colors.brand, backgroundColor: colors.brandLight }],
                  ]}
                  onPress={() => setDropoffPref(pref.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radioBox, { borderColor: colors.border }]}>
                    {isSelected ? <View style={styles.radioDot} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dropoffItemTitle, { color: colors.text }, isSelected && [styles.dropoffItemTitleActive, { color: colors.brand }]]}>
                      {pref.title}
                    </Text>
                    <Text style={[styles.dropoffItemDesc, { color: colors.textSecondary }]}>{pref.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.buzzerRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Key size={16} color={colors.textMuted} />
            <TextInput
              style={[styles.buzzerInput, { color: colors.text }]}
              placeholder="Buzzer code / Gate access code (optional)"
              placeholderTextColor={colors.textMuted}
              value={buzzerCode}
              onChangeText={setBuzzerCode}
            />
          </View>
        </View>

        {/* 4. Payment Method Section */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <CreditCard size={20} color="#FF4B3A" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Method</Text>
            </View>
            <View style={styles.secureBadge}>
              <ShieldCheck size={14} color="#166534" />
              <Text style={styles.secureBadgeText}>Encrypted & Secure</Text>
            </View>
          </View>

          {/* Card Option */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              { borderColor: colors.border, backgroundColor: colors.card },
              selectedPaymentMethod === PaymentMethod.CARD && [styles.paymentOptionActive, { borderColor: colors.brand, backgroundColor: colors.brandLight }],
            ]}
            onPress={() => setSelectedPaymentMethod(PaymentMethod.CARD)}
            activeOpacity={0.7}
          >
            <View style={styles.paymentLeft}>
              <View style={[styles.paymentIconBox, { backgroundColor: colors.surfaceSecondary }]}>
                <CreditCard size={20} color="#2563EB" />
              </View>
              <View>
                <Text style={[styles.paymentName, { color: colors.text }]}>Credit or Debit Card</Text>
                <Text style={[styles.paymentSub, { color: colors.textSecondary }]}>Visa, MasterCard, Amex via Stripe</Text>
              </View>
            </View>
            <View style={[styles.radioBox, { borderColor: colors.border }]}>
              {selectedPaymentMethod === PaymentMethod.CARD ? <View style={styles.radioDot} /> : null}
            </View>
          </TouchableOpacity>

          {/* Online Wallet Option */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              { borderColor: colors.border, backgroundColor: colors.card },
              selectedPaymentMethod === PaymentMethod.ONLINE && [styles.paymentOptionActive, { borderColor: colors.brand, backgroundColor: colors.brandLight }],
            ]}
            onPress={() => setSelectedPaymentMethod(PaymentMethod.ONLINE)}
            activeOpacity={0.7}
          >
            <View style={styles.paymentLeft}>
              <View style={[styles.paymentIconBox, { backgroundColor: colors.surfaceSecondary }]}>
                <Smartphone size={20} color="#7C3AED" />
              </View>
              <View>
                <Text style={[styles.paymentName, { color: colors.text }]}>Instant Pay (Apple Pay / Google Pay)</Text>
                <Text style={[styles.paymentSub, { color: colors.textSecondary }]}>1-tap biometric checkout</Text>
              </View>
            </View>
            <View style={[styles.radioBox, { borderColor: colors.border }]}>
              {selectedPaymentMethod === PaymentMethod.ONLINE ? (
                <View style={styles.radioDot} />
              ) : null}
            </View>
          </TouchableOpacity>

          {/* Cash on Delivery Option */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              { borderColor: colors.border, backgroundColor: colors.card },
              selectedPaymentMethod === PaymentMethod.COD && [styles.paymentOptionActive, { borderColor: colors.brand, backgroundColor: colors.brandLight }],
            ]}
            onPress={() => setSelectedPaymentMethod(PaymentMethod.COD)}
            activeOpacity={0.7}
          >
            <View style={styles.paymentLeft}>
              <View style={[styles.paymentIconBox, { backgroundColor: colors.surfaceSecondary }]}>
                <Banknote size={20} color="#16A34A" />
              </View>
              <View>
                <Text style={[styles.paymentName, { color: colors.text }]}>Cash on Delivery</Text>
                <Text style={[styles.paymentSub, { color: colors.textSecondary }]}>Pay driver with cash upon arrival</Text>
              </View>
            </View>
            <View style={[styles.radioBox, { borderColor: colors.border }]}>
              {selectedPaymentMethod === PaymentMethod.COD ? <View style={styles.radioDot} /> : null}
            </View>
          </TouchableOpacity>
        </View>

        {/* 3. Courier Tip Section */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionTitleRow}>
            <HeartHandshake size={20} color="#FF4B3A" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tip Your Courier</Text>
          </View>
          <Text style={[styles.tipSubtitle, { color: colors.textSecondary }]}>100% of tips go directly to your delivery driver.</Text>

          <View style={styles.tipRow}>
            {[0, 1.0, 2.0, 3.0, 5.0].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.tipChip,
                  { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                  tipAmount === amount && [styles.tipChipActive, { borderColor: colors.brand, backgroundColor: colors.brandLight }],
                ]}
                onPress={() => setTipAmount(amount)}
              >
                <Text style={[styles.tipChipText, { color: colors.textSecondary }, tipAmount === amount && [styles.tipChipTextActive, { color: colors.brand }]]}>
                  {amount === 0 ? 'Not now' : `$${amount.toFixed(0)}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 4. Order Summary Card */}
        {pricing ? (
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Order Summary</Text>

            <View style={styles.itemsSummary}>
              {items.map((item) => (
                <View key={item.id} style={styles.summaryItemRow}>
                  <Text style={[styles.summaryItemName, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.quantity}x {item.name}
                  </Text>
                  <Text style={[styles.summaryItemPrice, { color: colors.text }]}>${formatCurrency(item.lineSubtotal)}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Subtotal</Text>
              <Text style={[styles.billValue, { color: colors.text }]}>${formatCurrency(pricing.subtotal)}</Text>
            </View>

            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Delivery Fee</Text>
              <Text style={[styles.billValue, { color: colors.text }]}>${formatCurrency(pricing.deliveryFee)}</Text>
            </View>

            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Service Fee</Text>
              <Text style={[styles.billValue, { color: colors.text }]}>${formatCurrency(pricing.serviceFee)}</Text>
            </View>

            {toNumber(pricing.discount) > 0 ? (
              <View style={styles.billRow}>
                <Text style={styles.discountLabel}>Coupon Discount ({pricing.couponCode})</Text>
                <Text style={styles.discountValue}>-${formatCurrency(pricing.discount)}</Text>
              </View>
            ) : null}

            {tipAmount > 0 ? (
              <View style={styles.billRow}>
                <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Driver Tip</Text>
                <Text style={[styles.billValue, { color: colors.text }]}>+${formatCurrency(tipAmount)}</Text>
              </View>
            ) : null}

            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Estimated Tax</Text>
              <Text style={[styles.billValue, { color: colors.text }]}>${formatCurrency(pricing.tax)}</Text>
            </View>

            <View style={styles.finalTotalRow}>
              <Text style={[styles.finalTotalLabel, { color: colors.text }]}>Total Due</Text>
              <Text style={[styles.finalTotalValue, { color: colors.brand }]}>${formatCurrency(finalTotal)}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Place Order Sticky Bottom Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={styles.bottomPriceContainer}>
          <Text style={[styles.bottomTotalText, { color: colors.textMuted }]}>Total</Text>
          <Text style={[styles.bottomAmount, { color: colors.text }]}>${formatCurrency(finalTotal)}</Text>
        </View>

        <Button
          title="Place Order"
          isLoading={isSubmittingOrder}
          onPress={handlePlaceOrder}
          style={styles.placeOrderBtn}
        />
      </View>
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
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  backBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addAddressText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF4B3A',
  },
  newAddressForm: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  formTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  typeChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  typeChipActive: {
    backgroundColor: '#FF4B3A',
    borderColor: '#FF4B3A',
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  typeChipTextActive: {
    color: '#FFFFFF',
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
    marginBottom: 8,
  },
  saveAddrBtn: {
    marginTop: 4,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  addressItemActive: {
    borderColor: '#FF4B3A',
    backgroundColor: '#FFF5F4',
  },
  radioBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF4B3A',
  },
  addressInfo: {
    flex: 1,
  },
  addressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  addressTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  defaultBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  addressStreet: {
    fontSize: 12,
    color: '#6B7280',
  },
  addressNotes: {
    fontSize: 11,
    color: '#F59E0B',
    marginTop: 2,
  },
  noAddressText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 8,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  secureBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  paymentOptionActive: {
    borderColor: '#FF4B3A',
    backgroundColor: '#FFF5F4',
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  paymentSub: {
    fontSize: 11,
    color: '#6B7280',
  },
  tipSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tipChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  tipChipActive: {
    backgroundColor: '#FF4B3A',
    borderColor: '#FF4B3A',
  },
  tipChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  tipChipTextActive: {
    color: '#FFFFFF',
  },
  itemsSummary: {
    gap: 6,
    marginTop: 8,
  },
  summaryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItemName: {
    fontSize: 13,
    color: '#4B5563',
    flex: 1,
    marginRight: 8,
  },
  summaryItemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  billLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  billValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  discountLabel: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '600',
  },
  discountValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16A34A',
  },
  finalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  finalTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  finalTotalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FF4B3A',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  bottomPriceContainer: {
    marginRight: 16,
  },
  bottomTotalText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  bottomAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  placeOrderBtn: {
    flex: 1,
  },
  timingBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF4B3A',
  },
  timingOptionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timingOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  timingOptionBtnActive: {
    borderColor: '#FF4B3A',
    backgroundColor: '#FFF1F2',
  },
  timingOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  timingOptionTextActive: {
    color: '#FF4B3A',
    fontWeight: '700',
  },
  scheduleSlotContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  slotPickerTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  slotChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  slotChipActive: {
    backgroundColor: '#FF4B3A',
    borderColor: '#FF4B3A',
  },
  slotChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  slotChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dropoffList: {
    gap: 10,
    marginBottom: 12,
  },
  dropoffItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  dropoffItemActive: {
    borderColor: '#FF4B3A',
    backgroundColor: '#FFF8F7',
  },
  dropoffItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  dropoffItemTitleActive: {
    color: '#111827',
  },
  dropoffItemDesc: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 15,
  },
  buzzerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  buzzerInput: {
    flex: 1,
    fontSize: 12,
    color: '#111827',
    paddingVertical: 6,
  },
  checkoutMapWrapper: {
    marginTop: 14,
    borderRadius: 14,
    overflow: 'hidden',
  },
});


