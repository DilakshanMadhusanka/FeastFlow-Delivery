import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { restaurantService } from '../../../services/restaurant.service';
import { menuService } from '../../../services/menu.service';
import { cartService } from '../../../services/cart.service';
import { useCartStore } from '../../../store/cartStore';
import { useFavoritesStore } from '../../../store/favoritesStore';
import { RestaurantCard } from '../../../components/cards/RestaurantCard';
import { FoodCard } from '../../../components/cards/FoodCard';
import { CategoryPill } from '../../../components/cards/CategoryPill';
import { Loading } from '../../../components/ui/Loading';
import { EmptyState } from '../../../components/ui/EmptyState';
import { orderService } from '../../../services/order.service';
import { useAuthStore } from '../../../store/authStore';
import { OrderStatus, OrderSummary } from '@food-delivery/shared';
import {
  MapPin,
  Search as SearchIcon,
  ChevronDown,
  Sparkles,
  Bike,
  ChevronRight,
  Utensils,
  Heart,
  RotateCcw,
} from 'lucide-react-native';

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.RESTAURANT_ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.READY_FOR_PICKUP,
  OrderStatus.DRIVER_ASSIGNED,
  OrderStatus.PICKED_UP,
  OrderStatus.ON_THE_WAY,
];

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // 0. Fetch Active Orders for live home banner
  const { data: ordersData, refetch: refetchOrders } = useQuery({
    queryKey: ['myOrders'],
    queryFn: () => orderService.getMyOrders({ limit: 10 }),
    enabled: isAuthenticated,
    staleTime: 15 * 1000,
  });

  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const { isRestaurantFavorite, restaurantIds } = useFavoritesStore();

  const pastOrders = useMemo(() => {
    return (ordersData?.items || []).filter((o) => o.status === OrderStatus.DELIVERED);
  }, [ordersData?.items]);

  const handleReorderPastOrder = async (pastOrder: OrderSummary) => {
    if (!pastOrder.items || pastOrder.items.length === 0) return;
    setReorderingId(pastOrder.id);
    try {
      for (let i = 0; i < pastOrder.items.length; i++) {
        const item = pastOrder.items[i];
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
      Alert.alert('Reorder Failed', err?.message || 'Could not re-add items to basket.');
    } finally {
      setReorderingId(null);
    }
  };

  const activeOrder = ordersData?.items?.find((o) => ACTIVE_STATUSES.includes(o.status));

  // 1. Fetch Categories
  const { data: categories, isLoading: loadingCategories, refetch: refetchCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => menuService.getCategories(),
  });

  // 2. Fetch Restaurants
  const {
    data: restaurantData,
    isLoading: loadingRestaurants,
    refetch: refetchRestaurants,
  } = useQuery({
    queryKey: ['restaurants', selectedCategory],
    queryFn: () =>
      restaurantService.search({
        categoryId:
          selectedCategory === 'FAVORITES'
            ? undefined
            : selectedCategory || undefined,
        sortBy: 'rating',
        limit: 10,
      }),
  });

  const restaurants = useMemo(() => {
    const list = restaurantData?.items || [];
    if (selectedCategory === 'FAVORITES') {
      return list.filter((r) => isRestaurantFavorite(r.id));
    }
    return list;
  }, [restaurantData?.items, selectedCategory, isRestaurantFavorite]);

  // 3. Fetch Featured Food Items
  const {
    data: featuredFood,
    isLoading: loadingFood,
    refetch: refetchFood,
  } = useQuery({
    queryKey: ['featured-food'],
    queryFn: () => menuService.searchFood({ query: 'burger', limit: 5 }),
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchCategories(),
      refetchRestaurants(),
      refetchFood(),
      refetchOrders(),
    ]);
    setRefreshing(false);
  };

  const foodItems = (featuredFood?.items as any[]) || [];

  return (
    <View style={styles.container}>
      {/* Top Address & Header */}
      <View style={styles.header}>
        <View style={styles.addressSection}>
          <Text style={styles.deliverTo}>DELIVER TO</Text>
          <TouchableOpacity style={styles.addressRow} activeOpacity={0.7}>
            <MapPin size={16} color="#FF4B3A" />
            <Text style={styles.addressText} numberOfLines={1}>
              350 5th Ave, New York
            </Text>
            <ChevronDown size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF4B3A']} />}
      >
        {/* Search Bar Button */}
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.8}
          onPress={() => router.push('/(customer)/(tabs)/search')}
        >
          <SearchIcon size={20} color="#9CA3AF" />
          <Text style={styles.searchPlaceholder}>Search for restaurants, burgers, pizza...</Text>
        </TouchableOpacity>

        {/* Live Active Order Banner */}
        {activeOrder ? (
          <TouchableOpacity
            style={styles.activeOrderBanner}
            activeOpacity={0.88}
            onPress={() => router.push(`/(customer)/order-tracking/${activeOrder.id}` as any)}
          >
            <View style={styles.activeBannerIconBox}>
              {activeOrder.status === OrderStatus.ON_THE_WAY ||
              activeOrder.status === OrderStatus.PICKED_UP ? (
                <Bike size={20} color="#FFFFFF" />
              ) : (
                <Utensils size={20} color="#FFFFFF" />
              )}
            </View>

            <View style={styles.activeBannerTextCol}>
              <View style={styles.activeBannerRow}>
                <View style={styles.activeDot} />
                <Text style={styles.activeBannerStatus}>
                  {activeOrder.status === OrderStatus.ON_THE_WAY
                    ? 'Courier on the Way!'
                    : activeOrder.status === OrderStatus.PREPARING
                    ? 'Kitchen is Cooking'
                    : activeOrder.status === OrderStatus.READY_FOR_PICKUP
                    ? 'Ready for Courier'
                    : activeOrder.status === OrderStatus.DRIVER_ASSIGNED
                    ? 'Courier Assigned'
                    : 'Order in Progress'}
                </Text>
              </View>
              <Text style={styles.activeBannerRestaurant} numberOfLines={1}>
                {activeOrder.restaurant?.name || 'Restaurant'} • #{activeOrder.orderNumber}
              </Text>
            </View>

            <View style={styles.activeBannerAction}>
              <Text style={styles.activeBannerActionText}>Track</Text>
              <ChevronRight size={15} color="#FF4B3A" />
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Promotional Banner */}
        <View style={styles.promoBanner}>
          <View style={styles.promoTextContainer}>
            <View style={styles.promoBadge}>
              <Sparkles size={12} color="#FFFFFF" />
              <Text style={styles.promoBadgeText}>LIMITED OFFER</Text>
            </View>
            <Text style={styles.promoTitle}>20% OFF FIRST ORDER</Text>
            <Text style={styles.promoSubtitle}>Use code WELCOME20 at checkout</Text>
          </View>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=250&q=80',
            }}
            style={styles.promoImage}
          />
        </View>

        {/* Order Again in 1 Tap Carousel */}
        {pastOrders.length > 0 && (
          <View style={styles.orderAgainSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.orderAgainHeaderTitle}>
                <RotateCcw size={16} color="#FF4B3A" />
                <Text style={styles.sectionTitle}>Order Again in 1 Tap</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(customer)/(tabs)/orders')}>
                <Text style={styles.seeAllText}>Past Orders</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.orderAgainScroll}
            >
              {pastOrders.slice(0, 5).map((order) => (
                <View key={order.id} style={styles.orderAgainCard}>
                  <View style={styles.orderAgainCardTop}>
                    <Text style={styles.orderAgainRestName} numberOfLines={1}>
                      {order.restaurant?.name || 'Restaurant'}
                    </Text>
                    <Text style={styles.orderAgainDate}>
                      {new Date(order.placedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>

                  <Text style={styles.orderAgainItems} numberOfLines={2}>
                    {order.items?.map((i) => `${i.quantity}x ${i.nameSnapshot}`).join(', ')}
                  </Text>

                  <View style={styles.orderAgainCardBottom}>
                    <Text style={styles.orderAgainPrice}>
                      ${Number(order.totalAmount || 0).toFixed(2)}
                    </Text>
                    <TouchableOpacity
                      style={styles.reorderPillBtn}
                      activeOpacity={0.8}
                      disabled={reorderingId === order.id}
                      onPress={() => handleReorderPastOrder(order)}
                    >
                      {reorderingId === order.id ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <RotateCcw size={12} color="#FFFFFF" />
                          <Text style={styles.reorderPillText}>Re-Order</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Categories Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Food Categories</Text>
        </View>

        {loadingCategories ? (
          <Loading message="Loading cuisines..." />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            <CategoryPill
              name="All"
              isSelected={selectedCategory === null}
              onPress={() => setSelectedCategory(null)}
            />
            {/* Favorites Filter Pill */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.favPill,
                selectedCategory === 'FAVORITES' ? styles.favPillActive : null,
              ]}
              onPress={() =>
                setSelectedCategory(selectedCategory === 'FAVORITES' ? null : 'FAVORITES')
              }
            >
              <Heart
                size={13}
                color={selectedCategory === 'FAVORITES' ? '#FFFFFF' : '#FF4B3A'}
                fill={selectedCategory === 'FAVORITES' ? '#FFFFFF' : '#FF4B3A'}
              />
              <Text
                style={[
                  styles.favPillText,
                  selectedCategory === 'FAVORITES' ? styles.favPillTextActive : null,
                ]}
              >
                Favorites ({restaurantIds.length})
              </Text>
            </TouchableOpacity>

            {categories?.map((cat) => (
              <CategoryPill
                key={cat.id}
                id={cat.id}
                name={cat.name}
                iconUrl={cat.iconUrl}
                isSelected={selectedCategory === cat.id}
                onPress={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
              />
            ))}
          </ScrollView>
        )}

        {/* Popular Restaurants Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Restaurants</Text>
        </View>

        {loadingRestaurants ? (
          <Loading message="Finding popular restaurants..." />
        ) : restaurants.length === 0 ? (
          <EmptyState
            title="No Restaurants Found"
            message="No restaurants match your selected category filter right now."
            actionTitle="Reset Filters"
            onAction={() => setSelectedCategory(null)}
          />
        ) : (
          restaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              onPress={() => router.push(`/(customer)/restaurant/${restaurant.id}`)}
            />
          ))
        )}

        {/* Recommended Food Items Section */}
        {foodItems.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recommended For You</Text>
            </View>

            {foodItems.map((item) => (
              <FoodCard
                key={item.id}
                item={item}
                onPress={() => router.push(`/(customer)/food/${item.id}`)}
              />
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  addressSection: {
    marginBottom: 4,
  },
  deliverTo: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF4B3A',
    letterSpacing: 0.8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  addressText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    maxWidth: '85%',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
    gap: 10,
    marginBottom: 20,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  promoBanner: {
    backgroundColor: '#1E1B4B',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    overflow: 'hidden',
  },
  promoTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  promoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF4B3A',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  promoBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  promoTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  promoSubtitle: {
    color: '#C7D2FE',
    fontSize: 12,
  },
  promoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
  },
  categoriesScroll: {
    paddingBottom: 20,
  },
  activeOrderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    shadowColor: '#FF4B3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  activeBannerIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FF4B3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBannerTextCol: {
    flex: 1,
    marginLeft: 12,
  },
  activeBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
  },
  activeBannerStatus: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  activeBannerRestaurant: {
    fontSize: 12,
    color: '#6B7280',
  },
  activeBannerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFF5F4',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  activeBannerActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF4B3A',
  },
  orderAgainSection: {
    marginBottom: 20,
  },
  orderAgainHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF4B3A',
  },
  orderAgainScroll: {
    paddingRight: 16,
    gap: 12,
  },
  orderAgainCard: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    justifyContent: 'space-between',
  },
  orderAgainCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  orderAgainRestName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  orderAgainDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginLeft: 6,
  },
  orderAgainItems: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 10,
  },
  orderAgainCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  orderAgainPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  reorderPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF4B3A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  reorderPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  favPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  favPillActive: {
    backgroundColor: '#FF4B3A',
    borderColor: '#FF4B3A',
  },
  favPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF4B3A',
  },
  favPillTextActive: {
    color: '#FFFFFF',
  },
});
