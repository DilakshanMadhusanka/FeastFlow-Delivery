import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { restaurantService } from '../../../services/restaurant.service';
import { menuService } from '../../../services/menu.service';
import { FoodCard } from '../../../components/cards/FoodCard';
import { Rating } from '../../../components/ui/Rating';
import { Badge } from '../../../components/ui/Badge';
import { Loading } from '../../../components/ui/Loading';
import { ArrowLeft, Clock, Bike, MapPin } from 'lucide-react-native';

export default function RestaurantDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);

  // 1. Fetch Restaurant Info
  const { data: restaurant, isLoading: loadingRestaurant } = useQuery({
    queryKey: ['restaurant', id],
    queryFn: () => restaurantService.getById(id!),
    enabled: Boolean(id),
  });

  // 2. Fetch Restaurant Menu (categories + items)
  const { data: menuData, isLoading: loadingMenu } = useQuery({
    queryKey: ['restaurant-menu', id],
    queryFn: () => menuService.getRestaurantMenu(id!),
    enabled: Boolean(id),
  });

  if (loadingRestaurant || loadingMenu) {
    return <Loading fullScreen message="Loading restaurant menu..." />;
  }

  if (!restaurant || !menuData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Restaurant Not Found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const categories = menuData.categories || [];
  const currentCategory = categories[selectedCategoryIndex];
  const defaultBanner =
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80';

  const numericFee =
    typeof restaurant.deliveryFeeBase === 'string'
      ? parseFloat(restaurant.deliveryFeeBase)
      : restaurant.deliveryFeeBase;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner with Back Button */}
        <View style={styles.bannerContainer}>
          <Image
            source={{ uri: restaurant.bannerUrl || defaultBanner }}
            style={styles.bannerImage}
            resizeMode="cover"
          />

          <TouchableOpacity
            style={styles.backIconButton}
            activeOpacity={0.8}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color="#111827" />
          </TouchableOpacity>

          <View style={styles.statusBadgeOverlay}>
            {restaurant.isOpen ? (
              <Badge label="Open Now" variant="success" />
            ) : (
              <Badge label="Closed" variant="error" />
            )}
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.titleRow}>
            <Text style={styles.restaurantName}>{restaurant.name}</Text>
            <Rating score={restaurant.ratingAverage} reviewCount={restaurant.ratingCount} size={16} />
          </View>

          {restaurant.description ? (
            <Text style={styles.description}>{restaurant.description}</Text>
          ) : null}

          {/* Delivery Meta Row */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Clock size={16} color="#FF4B3A" />
              <Text style={styles.metaText}>
                {restaurant.estimatedDeliveryMin}-{restaurant.estimatedDeliveryMax} mins
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Bike size={16} color="#FF4B3A" />
              <Text style={styles.metaText}>${numericFee.toFixed(2)} Fee</Text>
            </View>

            <View style={styles.metaItem}>
              <MapPin size={16} color="#FF4B3A" />
              <Text style={styles.metaText}>{restaurant.city}</Text>
            </View>
          </View>
        </View>

        {/* Menu Category Navigation Chips */}
        {categories.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {categories.map((cat, idx) => {
              const isSelected = selectedCategoryIndex === idx;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryTab, isSelected ? styles.categoryTabActive : null]}
                  onPress={() => setSelectedCategoryIndex(idx)}
                >
                  <Text
                    style={[styles.categoryTabText, isSelected ? styles.categoryTabTextActive : null]}
                  >
                    {cat.name} ({cat.foodItems.length})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        {/* Menu Items for Selected Category */}
        <View style={styles.itemsSection}>
          {currentCategory ? (
            <>
              <Text style={styles.categoryHeading}>{currentCategory.name}</Text>
              {currentCategory.foodItems.length === 0 ? (
                <Text style={styles.noItemsText}>No items available in this category yet.</Text>
              ) : (
                currentCategory.foodItems.map((item) => (
                  <FoodCard
                    key={item.id}
                    item={item}
                    onPress={() => router.push(`/(customer)/food/${item.id}`)}
                  />
                ))
              )}
            </>
          ) : (
            <Text style={styles.noItemsText}>No menu categories found.</Text>
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  backBtn: {
    backgroundColor: '#FF4B3A',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  bannerContainer: {
    width: '100%',
    height: 220,
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  backIconButton: {
    position: 'absolute',
    top: 52,
    left: 20,
    backgroundColor: '#FFFFFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  statusBadgeOverlay: {
    position: 'absolute',
    bottom: 16,
    right: 20,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  restaurantName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    flex: 1,
    marginRight: 10,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryTabActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
  },
  itemsSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  categoryHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  noItemsText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    padding: 16,
    textAlign: 'center',
  },
});
