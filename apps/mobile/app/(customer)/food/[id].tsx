import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { menuService, FoodAddonItem } from '../../../services/menu.service';
import { useCartStore } from '../../../store/cartStore';
import { useAuthStore } from '../../../store/authStore';
import { Button } from '../../../components/ui/Button';
import { Loading } from '../../../components/ui/Loading';
import { ArrowLeft, Plus, Minus, Check } from 'lucide-react-native';
import { useTheme } from '../../../theme/useTheme';

export default function FoodDetailsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated } = useAuthStore();
  const { addItem, isLoading: isAddingToCart } = useCartStore();

  // Fetch food item details
  const { data: item, isLoading } = useQuery({
    queryKey: ['food-item', id],
    queryFn: () => menuService.getFoodItem(id!),
    enabled: Boolean(id),
  });

  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Selected options: map optionId -> selected addonId (for SINGLE)
  const [selectedSingleOptions, setSelectedSingleOptions] = useState<Record<string, string>>({});

  // Selected add-ons: set of addonIds
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set());

  // Handle single selection (radio)
  const handleSelectSingle = (optionId: string, addonId: string) => {
    setSelectedSingleOptions((prev) => ({ ...prev, [optionId]: addonId }));
  };

  // Handle multiple selection (checkbox)
  const toggleAddon = (addonId: string) => {
    setSelectedAddonIds((prev) => {
      const next = new Set(prev);
      if (next.has(addonId)) {
        next.delete(addonId);
      } else {
        next.add(addonId);
      }
      return next;
    });
  };

  // Calculate dynamic price including selected addons
  const totalPrice = useMemo(() => {
    if (!item) return 0;
    const basePrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
    let addonsTotal = 0;

    // Check single options addons price
    if (item.options) {
      for (const opt of item.options) {
        if (opt.type === 'SINGLE') {
          const selectedAddonId = selectedSingleOptions[opt.id];
          if (selectedAddonId) {
            const found = opt.addons?.find((a) => a.id === selectedAddonId);
            if (found) {
              addonsTotal += typeof found.price === 'string' ? parseFloat(found.price) : found.price;
            }
          }
        }
      }
    }

    // Check multi options and standalone addons
    const allAddons: FoodAddonItem[] = [
      ...(item.addons || []),
      ...(item.options?.flatMap((o) => (o.type === 'MULTIPLE' ? o.addons : [])) || []),
    ];

    selectedAddonIds.forEach((id) => {
      const found = allAddons.find((a) => a.id === id);
      if (found) {
        addonsTotal += typeof found.price === 'string' ? parseFloat(found.price) : found.price;
      }
    });

    return (basePrice + addonsTotal) * quantity;
  }, [item, quantity, selectedSingleOptions, selectedAddonIds]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to add items to your basket.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }

    if (!item) return;

    // Validate required options
    if (item?.options) {
      for (const opt of item.options) {
        if (opt.isRequired && opt.type === 'SINGLE' && !selectedSingleOptions[opt.id]) {
          Alert.alert('Selection Required', `Please choose an option for "${opt.name}"`);
          return;
        }
      }
    }

    const addonIds = [
      ...Object.values(selectedSingleOptions),
      ...Array.from(selectedAddonIds),
    ];

    try {
      const result = await addItem({
        foodItemId: item.id,
        quantity,
        addonIds,
        specialInstructions: specialInstructions.trim() || undefined,
      });

      if (result.requiresConfirmation) {
        Alert.alert('Replace Basket?', result.message, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace & Add',
            style: 'destructive',
            onPress: async () => {
              await addItem({
                foodItemId: item.id,
                quantity,
                addonIds,
                specialInstructions: specialInstructions.trim() || undefined,
                clearExistingIfDifferentRestaurant: true,
              });
              router.push('/(customer)/cart');
            },
          },
        ]);
      } else {
        router.push('/(customer)/cart');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to add item to basket');
    }
  };

  if (isLoading || !item) {
    return <Loading fullScreen message="Loading dish customization..." />;
  }

  const defaultImage =
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Large Food Image with Back Button */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.imageUrl || defaultImage }}
            style={styles.image}
            resizeMode="cover"
          />
          <TouchableOpacity
            style={[styles.backIconButton, { backgroundColor: colors.card }]}
            activeOpacity={0.8}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Content Section */}
        <View style={[styles.content, { backgroundColor: colors.card }]}>
          <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
          <Text style={styles.basePrice}>
            ${(typeof item.price === 'string' ? parseFloat(item.price) : item.price).toFixed(2)}
          </Text>

          {item.description ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>{item.description}</Text>
          ) : null}

          {/* Ingredients */}
          {item.ingredients && item.ingredients.length > 0 ? (
            <View style={[styles.ingredientsBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Ingredients</Text>
              <Text style={[styles.ingredientsText, { color: colors.textSecondary }]}>{item.ingredients.join(', ')}</Text>
            </View>
          ) : null}

          {/* Option Groups (e.g. Size, Doneness) */}
          {item.options?.map((option) => (
            <View key={option.id} style={[styles.optionGroup, { borderTopColor: colors.borderLight }]}>
              <View style={styles.optionHeader}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>{option.name}</Text>
                {option.isRequired ? <Text style={styles.requiredBadge}>Required</Text> : null}
              </View>

              {option.addons?.map((addon) => {
                const numericAddonPrice =
                  typeof addon.price === 'string' ? parseFloat(addon.price) : addon.price;
                const isSelected =
                  option.type === 'SINGLE'
                    ? selectedSingleOptions[option.id] === addon.id
                    : selectedAddonIds.has(addon.id);

                return (
                  <TouchableOpacity
                    key={addon.id}
                    style={[styles.addonRow, { borderBottomColor: colors.borderLight }]}
                    activeOpacity={0.7}
                    onPress={() =>
                      option.type === 'SINGLE'
                        ? handleSelectSingle(option.id, addon.id)
                        : toggleAddon(addon.id)
                    }
                  >
                    <View style={styles.addonLeft}>
                      <View
                        style={[
                          option.type === 'SINGLE' ? styles.radioCircle : styles.checkboxSquare,
                          { borderColor: colors.border },
                          isSelected ? styles.selectedBox : null,
                        ]}
                      >
                        {isSelected ? <Check size={12} color="#FFFFFF" strokeWidth={3} /> : null}
                      </View>
                      <Text style={[styles.addonName, { color: colors.text }]}>{addon.name}</Text>
                    </View>

                    <Text style={[styles.addonPrice, { color: colors.textSecondary }]}>
                      {numericAddonPrice > 0 ? `+$${numericAddonPrice.toFixed(2)}` : 'Free'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {/* Standalone Add-ons (e.g. Extra Cheese, Bacon) */}
          {item.addons && item.addons.length > 0 ? (
            <View style={[styles.optionGroup, { borderTopColor: colors.borderLight }]}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>Extra Add-ons</Text>
              {item.addons.map((addon) => {
                const numericAddonPrice =
                  typeof addon.price === 'string' ? parseFloat(addon.price) : addon.price;
                const isSelected = selectedAddonIds.has(addon.id);

                return (
                  <TouchableOpacity
                    key={addon.id}
                    style={[styles.addonRow, { borderBottomColor: colors.borderLight }]}
                    activeOpacity={0.7}
                    onPress={() => toggleAddon(addon.id)}
                  >
                    <View style={styles.addonLeft}>
                      <View style={[styles.checkboxSquare, { borderColor: colors.border }, isSelected ? styles.selectedBox : null]}>
                        {isSelected ? <Check size={12} color="#FFFFFF" strokeWidth={3} /> : null}
                      </View>
                      <Text style={[styles.addonName, { color: colors.text }]}>{addon.name}</Text>
                    </View>

                    <Text style={[styles.addonPrice, { color: colors.textSecondary }]}>+${numericAddonPrice.toFixed(2)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {/* Special Instructions */}
          <View style={styles.specialInstructionsSection}>
            <Text style={[styles.optionTitle, { color: colors.text }]}>Special Instructions</Text>
            <TextInput
              placeholder="e.g. Less spicy, dressing on the side..."
              placeholderTextColor={colors.textMuted}
              style={[styles.specialInput, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
              value={specialInstructions}
              onChangeText={setSpecialInstructions}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom Bar: Quantity & Add to Cart */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={[styles.quantityControl, { backgroundColor: colors.surfaceSecondary }]}>
          <TouchableOpacity
            style={[styles.qtyButton, { backgroundColor: colors.card }]}
            onPress={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            <Minus size={18} color={colors.text} />
          </TouchableOpacity>

          <Text style={[styles.qtyText, { color: colors.text }]}>{quantity}</Text>

          <TouchableOpacity style={[styles.qtyButton, { backgroundColor: colors.card }]} onPress={() => setQuantity((q) => q + 1)}>
            <Plus size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <Button
          title={`Add to Basket • $${totalPrice.toFixed(2)}`}
          onPress={handleAddToCart}
          style={styles.addToCartButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 110,
  },
  imageContainer: {
    width: '100%',
    height: 280,
    backgroundColor: '#E5E7EB',
    position: 'relative',
  },
  image: {
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
  content: {
    padding: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  basePrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FF4B3A',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 16,
  },
  ingredientsBox: {
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  ingredientsText: {
    fontSize: 13,
    color: '#6B7280',
  },
  optionGroup: {
    marginBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  requiredBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF4B3A',
    backgroundColor: '#FFF5F4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  addonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  addonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBox: {
    backgroundColor: '#FF4B3A',
    borderColor: '#FF4B3A',
  },
  addonName: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  addonPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  specialInstructionsSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
    marginBottom: 20,
  },
  specialInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top',
    height: 80,
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
    gap: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 12,
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    minWidth: 20,
    textAlign: 'center',
  },
  addToCartButton: {
    flex: 1,
  },
});
