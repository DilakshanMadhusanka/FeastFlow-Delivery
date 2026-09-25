import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, Heart } from 'lucide-react-native';
import { FoodDetailItem } from '../../services/menu.service';
import { useFavoritesStore } from '../../store/favoritesStore';

interface FoodCardProps {
  item: FoodDetailItem;
  onPress: () => void;
  onAddPress?: () => void;
}

export const FoodCard: React.FC<FoodCardProps> = ({ item, onPress, onAddPress }) => {
  const { isFoodFavorite, toggleFoodItem } = useFavoritesStore();
  const isFav = isFoodFavorite(item.id);
  const defaultImage =
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80';

  const numericPrice =
    typeof item.price === 'string' ? parseFloat(item.price) : item.price;

  const isVegetarian =
    item.ingredients?.some((i) => i.toLowerCase().includes('veg')) ||
    item.name.toLowerCase().includes('veggie') ||
    item.description?.toLowerCase().includes('vegetarian');

  const isSpicy =
    item.ingredients?.some((i) => i.toLowerCase().includes('spic') || i.toLowerCase().includes('chili')) ||
    item.name.toLowerCase().includes('spicy');

  const isVegan =
    item.ingredients?.some((i) => i.toLowerCase().includes('vegan')) ||
    item.description?.toLowerCase().includes('vegan');

  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.card} onPress={onPress}>
      {/* Text Info */}
      <View style={styles.textContainer}>
        {/* Dietary Tag Row */}
        {(isVegetarian || isSpicy || isVegan) && (
          <View style={styles.badgeRow}>
            {isVegan && <Text style={styles.veganBadge}>🌿 Vegan</Text>}
            {!isVegan && isVegetarian && <Text style={styles.vegBadge}>🌱 Veg</Text>}
            {isSpicy && <Text style={styles.spicyBadge}>🔥 Spicy</Text>}
          </View>
        )}

        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>

        {item.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.priceRow}>
          <Text style={styles.price}>${numericPrice.toFixed(2)}</Text>

          {item.calories ? (
            <Text style={styles.calories}>{item.calories} kcal</Text>
          ) : null}
        </View>
      </View>


      {/* Image & Quick Add */}
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: item.imageUrl || defaultImage }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Favorite Heart Toggle */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.favButton}
          onPress={() => toggleFoodItem(item.id)}
          hitSlop={8}
        >
          <Heart
            size={13}
            color={isFav ? '#FF4B3A' : '#FFFFFF'}
            fill={isFav ? '#FF4B3A' : 'rgba(0,0,0,0.2)'}
          />
        </TouchableOpacity>

        {item.isAvailable ? (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.addButton}
            onPress={onAddPress || onPress}
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={3} />
          </TouchableOpacity>
        ) : (
          <View style={styles.soldOutBadge}>
            <Text style={styles.soldOutText}>Sold Out</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FF4B3A',
  },
  calories: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  imageWrapper: {
    width: 90,
    height: 90,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  addButton: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: '#FF4B3A',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  favButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  soldOutBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  soldOutText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  veganBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#047857',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  vegBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  spicyBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B91C1C',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
});

