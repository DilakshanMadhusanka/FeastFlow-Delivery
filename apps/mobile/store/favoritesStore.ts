import { create } from 'zustand';
import { getItem, setItem } from '../services/storage';

const FAVORITES_RESTAURANTS_KEY = 'feastflow_fav_restaurants';
const FAVORITES_FOOD_KEY = 'feastflow_fav_food';

interface FavoritesState {
  restaurantIds: string[];
  foodIds: string[];
  isLoaded: boolean;
  loadFavorites: () => Promise<void>;
  toggleRestaurant: (id: string) => Promise<void>;
  toggleFoodItem: (id: string) => Promise<void>;
  isRestaurantFavorite: (id: string) => boolean;
  isFoodFavorite: (id: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  restaurantIds: [],
  foodIds: [],
  isLoaded: false,

  loadFavorites: async () => {
    try {
      const restRaw = await getItem(FAVORITES_RESTAURANTS_KEY);
      const foodRaw = await getItem(FAVORITES_FOOD_KEY);
      const restaurantIds = restRaw ? JSON.parse(restRaw) : [];
      const foodIds = foodRaw ? JSON.parse(foodRaw) : [];
      set({ restaurantIds, foodIds, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },

  toggleRestaurant: async (id: string) => {
    const current = get().restaurantIds;
    const exists = current.includes(id);
    const updated = exists ? current.filter((x) => x !== id) : [...current, id];
    set({ restaurantIds: updated });
    await setItem(FAVORITES_RESTAURANTS_KEY, JSON.stringify(updated));
  },

  toggleFoodItem: async (id: string) => {
    const current = get().foodIds;
    const exists = current.includes(id);
    const updated = exists ? current.filter((x) => x !== id) : [...current, id];
    set({ foodIds: updated });
    await setItem(FAVORITES_FOOD_KEY, JSON.stringify(updated));
  },

  isRestaurantFavorite: (id: string) => {
    return get().restaurantIds.includes(id);
  },

  isFoodFavorite: (id: string) => {
    return get().foodIds.includes(id);
  },
}));

// Auto-hydrate on startup
useFavoritesStore.getState().loadFavorites();
