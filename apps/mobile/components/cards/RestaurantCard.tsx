import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Clock, Bike, MapPin, Heart } from 'lucide-react-native';
import { Rating } from '../ui/Rating';
import { Badge } from '../ui/Badge';
import { RestaurantItem } from '../../services/restaurant.service';
import { useFavoritesStore } from '../../store/favoritesStore';

interface RestaurantCardProps {
  restaurant: RestaurantItem;
  onPress: () => void;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant, onPress }) => {
  const { isRestaurantFavorite, toggleRestaurant } = useFavoritesStore();
  const isFav = isRestaurantFavorite(restaurant.id);
  const defaultBanner =
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80';

  const numericFee =
    typeof restaurant.deliveryFeeBase === 'string'
      ? parseFloat(restaurant.deliveryFeeBase)
      : restaurant.deliveryFeeBase;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.card}
      onPress={onPress}
    >
      {/* Banner & Open Status Overlay */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: restaurant.bannerUrl || restaurant.logoUrl || defaultBanner }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.badgeOverlay}>
          {restaurant.isOpen ? (
            <Badge label="Open Now" variant="success" />
          ) : (
            <Badge label="Closed" variant="error" />
          )}
        </View>

        {/* Favorite Heart Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.favButton}
          onPress={() => toggleRestaurant(restaurant.id)}
          hitSlop={8}
        >
          <Heart
            size={18}
            color={isFav ? '#FF4B3A' : '#FFFFFF'}
            fill={isFav ? '#FF4B3A' : 'rgba(0,0,0,0.3)'}
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>
            {restaurant.name}
          </Text>
          <Rating score={restaurant.ratingAverage} reviewCount={restaurant.ratingCount} />
        </View>

        {restaurant.cuisines && restaurant.cuisines.length > 0 ? (
          <Text style={styles.cuisines} numberOfLines={1}>
            {restaurant.cuisines.join(' • ')}
          </Text>
        ) : null}

        {/* Metadata Footer */}
        <View style={styles.footerRow}>
          <View style={styles.metaItem}>
            <Clock size={14} color="#6B7280" />
            <Text style={styles.metaText}>
              {restaurant.estimatedDeliveryMin}-{restaurant.estimatedDeliveryMax} min
            </Text>
          </View>

          <Text style={styles.bullet}>•</Text>

          <View style={styles.metaItem}>
            <Bike size={14} color="#6B7280" />
            <Text style={styles.metaText}>
              ${numericFee.toFixed(2)} delivery
            </Text>
          </View>

          {restaurant.distanceKm !== undefined ? (
            <>
              <Text style={styles.bullet}>•</Text>
              <View style={styles.metaItem}>
                <MapPin size={14} color="#6B7280" />
                <Text style={styles.metaText}>{restaurant.distanceKm} km</Text>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  imageContainer: {
    width: '100%',
    height: 160,
    backgroundColor: '#E5E7EB',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badgeOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  favButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  content: {
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 10,
  },
  cuisines: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 10,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  bullet: {
    marginHorizontal: 6,
    color: '#9CA3AF',
    fontSize: 12,
  },
});
