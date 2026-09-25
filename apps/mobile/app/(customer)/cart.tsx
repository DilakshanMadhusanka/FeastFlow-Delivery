import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { CartItemCard } from '../../components/cards/CartItemCard';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loading } from '../../components/ui/Loading';
import { ArrowLeft, Tag, ShoppingBag, Store, Trash2, Plus, Sparkles } from 'lucide-react-native';
import { formatCurrency, toNumber } from '../../utils/formatters';

export default function CartScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const {
    cart,
    isLoading,
    fetchCart,
    updateQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    removeCoupon,
  } = useCartStore();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated, fetchCart]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponError('');
    setIsApplyingCoupon(true);

    try {
      await applyCoupon(couponInput.trim().toUpperCase());
      setCouponInput('');
    } catch (err: any) {
      setCouponError(err?.response?.data?.message || 'Invalid or expired coupon code.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleClearCart = () => {
    Alert.alert('Clear Cart?', 'Are you sure you want to remove all items from your basket?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clearCart() },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centerContainer}>
        <EmptyState
          icon={<ShoppingBag size={48} color="#FF4B3A" />}
          title="Sign in to view your cart"
          message="Your cart items and saved coupons will sync across your devices."
          actionTitle="Sign In"
          onAction={() => router.push('/(auth)/login')}
        />
      </View>
    );
  }

  if (isLoading && !cart) {
    return <Loading fullScreen message="Loading your basket..." />;
  }

  const items = cart?.items || [];
  const pricing = cart?.pricing;

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Basket</Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={styles.emptyContent}>
          <EmptyState
            icon={<ShoppingBag size={56} color="#9CA3AF" />}
            title="Your Basket is Empty"
            message="Looks like you haven't added anything to your basket yet. Explore tasty meals nearby!"
            actionTitle="Browse Restaurants"
            onAction={() => router.replace('/(customer)/(tabs)/home')}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Basket</Text>
        <TouchableOpacity onPress={handleClearCart}>
          <Trash2 size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Restaurant Header */}
        {cart?.restaurant ? (
          <View style={styles.restaurantCard}>
            <Store size={20} color="#FF4B3A" />
            <View style={styles.restaurantInfo}>
              <Text style={styles.orderingFrom}>ORDERING FROM</Text>
              <Text style={styles.restaurantName}>{cart.restaurant.name}</Text>
            </View>
          </View>
        ) : null}

        {/* Cart Items List */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionHeading}>Items ({items.length})</Text>
          {items.map((item) => (
            <CartItemCard
              key={item.id}
              item={item}
              onIncrease={() => updateQuantity(item.id, item.quantity + 1)}
              onDecrease={() => updateQuantity(item.id, item.quantity - 1)}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </View>

        {/* Coupon Code Section */}
        <View style={styles.couponSection}>
          <Text style={styles.sectionHeading}>Promotions & Coupons</Text>
          <View style={styles.couponInputRow}>
            <View style={styles.couponInputWrapper}>
              <Tag size={18} color="#9CA3AF" />
              <TextInput
                placeholder="Enter coupon code (e.g. WELCOME20)"
                placeholderTextColor="#9CA3AF"
                style={styles.couponInput}
                value={couponInput}
                onChangeText={setCouponInput}
                autoCapitalize="characters"
              />
            </View>
            <Button
              title="Apply"
              size="sm"
              isLoading={isApplyingCoupon}
              onPress={handleApplyCoupon}
              style={styles.applyBtn}
            />
          </View>

          {/* Quick Available Promo Chips */}
          <View style={styles.quickChipsRow}>
            <Text style={styles.quickChipsLabel}>Try code:</Text>
            {['WELCOME15', 'FEAST20', 'FREESHIP'].map((promo) => (
              <TouchableOpacity
                key={promo}
                style={styles.quickChip}
                onPress={() => {
                  setCouponInput(promo);
                  setCouponError('');
                }}
              >
                <Tag size={11} color="#FF4B3A" />
                <Text style={styles.quickChipText}>{promo}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {couponError ? <Text style={styles.couponErrorText}>{couponError}</Text> : null}

          {pricing?.couponCode ? (
            <View style={styles.activeCouponBadge}>
              <Text style={styles.activeCouponText}>
                Coupon "{pricing.couponCode}" applied (-${formatCurrency(pricing.discount)})
              </Text>
              <TouchableOpacity onPress={() => removeCoupon()}>
                <Text style={styles.removeCouponText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Chef Recommendations & Upsells */}
        <View style={styles.upsellSection}>
          <View style={styles.upsellHeader}>
            <Sparkles size={16} color="#FF4B3A" />
            <Text style={styles.upsellTitle}>Frequently Ordered Together</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.upsellScroll}>
            {[
              { id: 'side-1', name: 'Garlic Herb Bread', price: 4.99, tag: '🌱 Vegetarian' },
              { id: 'side-2', name: 'Fresh Lemonade', price: 3.50, tag: '🌿 Vegan' },
              { id: 'side-3', name: 'Choco Lava Cake', price: 5.99, tag: '⭐ Best Seller' },
            ].map((side) => (
              <View key={side.id} style={styles.upsellCard}>
                <Text style={styles.upsellItemTag}>{side.tag}</Text>
                <Text style={styles.upsellItemName} numberOfLines={1}>{side.name}</Text>
                <View style={styles.upsellItemFooter}>
                  <Text style={styles.upsellItemPrice}>${side.price.toFixed(2)}</Text>
                  <TouchableOpacity
                    style={styles.upsellAddBtn}
                    onPress={() => Alert.alert('Added', `${side.name} added to your basket!`)}
                  >
                    <Plus size={14} color="#FF4B3A" strokeWidth={3} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>


        {/* Order Summary Pricing Breakdown */}
        {pricing ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Bill Details</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Item Subtotal</Text>
              <Text style={styles.summaryValue}>${formatCurrency(pricing.subtotal)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>${formatCurrency(pricing.deliveryFee)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service Fee</Text>
              <Text style={styles.summaryValue}>${formatCurrency(pricing.serviceFee)}</Text>
            </View>

            {toNumber(pricing.discount) > 0 ? (
              <View style={styles.summaryRow}>
                <Text style={styles.discountLabel}>Coupon Discount</Text>
                <Text style={styles.discountValue}>-${formatCurrency(pricing.discount)}</Text>
              </View>
            ) : null}

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Estimated Taxes</Text>
              <Text style={styles.summaryValue}>${formatCurrency(pricing.tax)}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>To Pay</Text>
              <Text style={styles.totalValue}>${formatCurrency(pricing.total)}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Floating Checkout Button */}
      {pricing && toNumber(pricing.total) > 0 ? (
        <View style={styles.bottomBar}>
          <View style={styles.totalSummary}>
            <Text style={styles.bottomTotalLabel}>Total Amount</Text>
            <Text style={styles.bottomTotalValue}>${formatCurrency(pricing.total)}</Text>
          </View>
          <Button
            title="Proceed to Checkout"
            onPress={() => router.push('/(customer)/checkout')}
            style={styles.checkoutBtn}
          />
        </View>
      ) : null}
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
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    padding: 24,
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
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 110,
  },
  restaurantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  restaurantInfo: {
    flex: 1,
  },
  orderingFrom: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF4B3A',
    letterSpacing: 0.5,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  itemsSection: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  couponSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  couponInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  couponInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  couponInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  applyBtn: {
    minWidth: 70,
    height: 44,
  },
  couponErrorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    fontWeight: '500',
  },
  activeCouponBadge: {
    marginTop: 10,
    backgroundColor: '#DCFCE7',
    padding: 10,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeCouponText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  removeCouponText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  discountLabel: {
    fontSize: 14,
    color: '#16A34A',
    fontWeight: '600',
  },
  discountValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16A34A',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  totalValue: {
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
  totalSummary: {
    marginRight: 16,
  },
  bottomTotalLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  bottomTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  checkoutBtn: {
    flex: 1,
  },
  quickChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  quickChipsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    marginRight: 2,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E11D48',
  },
  upsellSection: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  upsellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  upsellTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  upsellScroll: {
    gap: 10,
  },
  upsellCard: {
    width: 140,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  upsellItemTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4,
  },
  upsellItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  upsellItemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upsellItemPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  upsellAddBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

