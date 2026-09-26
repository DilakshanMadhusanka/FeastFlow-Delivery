import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { restaurantService } from '../../../services/restaurant.service';
import { menuService } from '../../../services/menu.service';
import { RestaurantCard } from '../../../components/cards/RestaurantCard';
import { FoodCard } from '../../../components/cards/FoodCard';
import { Loading } from '../../../components/ui/Loading';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Search as SearchIcon, X, SlidersHorizontal } from 'lucide-react-native';

import { useTheme } from '../../../theme/useTheme';

export default function SearchScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'restaurants' | 'dishes'>('restaurants');
  const [isOpenOnly, setIsOpenOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'deliveryFee' | 'deliveryTime'>('rating');

  // Query Restaurants
  const { data: restaurantResults, isLoading: loadingRestaurants } = useQuery({
    queryKey: ['search-restaurants', searchTerm, isOpenOnly, sortBy],
    queryFn: () =>
      restaurantService.search({
        query: searchTerm.trim() || undefined,
        isOpen: isOpenOnly || undefined,
        sortBy,
        limit: 20,
      }),
    enabled: activeTab === 'restaurants',
  });

  // Query Food Items
  const { data: foodResults, isLoading: loadingFood } = useQuery({
    queryKey: ['search-food', searchTerm],
    queryFn: () =>
      menuService.searchFood({
        query: searchTerm.trim() || 'a', // default broad search
        limit: 20,
      }),
    enabled: activeTab === 'dishes',
  });

  const restaurants = restaurantResults?.items || [];
  const foodItems = (foodResults?.items as any[]) || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header & Search Bar */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.surfaceSecondary }]}>
          <SearchIcon size={20} color={colors.textMuted} />
          <TextInput
            placeholder="Search restaurants or dishes..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoCorrect={false}
          />
          {searchTerm.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Tab Selector: Restaurants vs Dishes */}
        <View style={[styles.tabsRow, { backgroundColor: colors.surfaceSecondary }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'restaurants' && [styles.tabActive, { backgroundColor: colors.card }],
            ]}
            onPress={() => setActiveTab('restaurants')}
          >
            <Text
              style={[
                styles.tabText,
                { color: colors.textSecondary },
                activeTab === 'restaurants' && [styles.tabTextActive, { color: colors.text }],
              ]}
            >
              Restaurants
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'dishes' && [styles.tabActive, { backgroundColor: colors.card }],
            ]}
            onPress={() => setActiveTab('dishes')}
          >
            <Text
              style={[
                styles.tabText,
                { color: colors.textSecondary },
                activeTab === 'dishes' && [styles.tabTextActive, { color: colors.text }],
              ]}
            >
              Dishes & Food
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Quick Pills (Only for Restaurants) */}
        {activeTab === 'restaurants' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: colors.cardAlt, borderColor: colors.border },
                isOpenOnly && styles.filterChipActive,
              ]}
              onPress={() => setIsOpenOnly(!isOpenOnly)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: colors.textSecondary },
                  isOpenOnly && styles.filterChipTextActive,
                ]}
              >
                ● Open Now
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: colors.cardAlt, borderColor: colors.border },
                sortBy === 'rating' && styles.filterChipActive,
              ]}
              onPress={() => setSortBy('rating')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: colors.textSecondary },
                  sortBy === 'rating' && styles.filterChipTextActive,
                ]}
              >
                ⭐ Top Rated
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: colors.cardAlt, borderColor: colors.border },
                sortBy === 'deliveryTime' && styles.filterChipActive,
              ]}
              onPress={() => setSortBy('deliveryTime')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: colors.textSecondary },
                  sortBy === 'deliveryTime' && styles.filterChipTextActive,
                ]}
              >
                ⚡ Fastest
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: colors.cardAlt, borderColor: colors.border },
                sortBy === 'deliveryFee' && styles.filterChipActive,
              ]}
              onPress={() => setSortBy('deliveryFee')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: colors.textSecondary },
                  sortBy === 'deliveryFee' && styles.filterChipTextActive,
                ]}
              >
                🛵 Low Delivery Fee
              </Text>
            </TouchableOpacity>
          </ScrollView>
        ) : null}
      </View>

      {/* Content Area */}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {activeTab === 'restaurants' ? (
          loadingRestaurants ? (
            <Loading message="Searching restaurants..." />
          ) : restaurants.length === 0 ? (
            <EmptyState
              title="No Restaurants Found"
              message={`We couldn't find any restaurants matching "${searchTerm}". Try another keyword.`}
              actionTitle="Clear Search"
              onAction={() => setSearchTerm('')}
            />
          ) : (
            restaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                onPress={() => router.push(`/(customer)/restaurant/${restaurant.id}`)}
              />
            ))
          )
        ) : loadingFood ? (
          <Loading message="Searching dishes..." />
        ) : foodItems.length === 0 ? (
          <EmptyState
            title="No Dishes Found"
            message={`No food items matched "${searchTerm}".`}
            actionTitle="Clear Search"
            onAction={() => setSearchTerm('')}
          />
        ) : (
          foodItems.map((item) => (
            <FoodCard
              key={item.id}
              item={item}
              onPress={() => router.push(`/(customer)/food/${item.id}`)}
            />
          ))
        )}
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
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#111827',
  },
  filterBar: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#FFF5F4',
    borderColor: '#FF4B3A',
  },
  filterChipText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FF4B3A',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
});
