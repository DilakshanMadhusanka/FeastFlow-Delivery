import {
  OrderStatus,
  UserRole,
  PaymentMethod,
  PaymentStatus,
  OrderSummary,
  OrderItemSummary,
} from '@food-delivery/shared';

export interface User {
  id: string;
  name: string;
  email: string;
  roles: UserRole[];
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface OperatingHour {
  id?: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface Restaurant {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description?: string | null;
  phone: string;
  email?: string | null;
  street: string;
  city: string;
  latitude?: number;
  longitude?: number;
  deliveryRadiusKm?: number;
  minimumOrderAmount?: number;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  deliveryFeeBase: number;
  estimatedDeliveryMin: number;
  estimatedDeliveryMax: number;
  ratingAverage: number;
  ratingCount: number;
  isActive: boolean;
  isApproved: boolean;
  operatingHours?: OperatingHour[];
  owner?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  categoryLinks?: Array<{
    category: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
}

export interface CreateRestaurantInput {
  name: string;
  description?: string;
  phone: string;
  email?: string;
  street: string;
  city: string;
  latitude?: number;
  longitude?: number;
  deliveryRadiusKm?: number;
  minimumOrderAmount?: number;
  deliveryFeeBase?: number;
  estimatedDeliveryMin?: number;
  estimatedDeliveryMax?: number;
  categoryIds?: string[];
  ownerId?: string;
  isApproved?: boolean;
}

export interface FoodAddon {
  id: string;
  foodItemId: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface FoodOption {
  id: string;
  foodItemId: string;
  name: string;
  type: 'SINGLE' | 'MULTIPLE';
  isRequired: boolean;
  addons?: FoodAddon[];
}

export interface FoodItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  isAvailable: boolean;
  preparationTimeMin: number;
  category?: {
    id: string;
    name: string;
  };
  restaurant?: {
    id: string;
    name: string;
    slug?: string;
    city?: string;
  };
  options?: FoodOption[];
}

export interface FoodCategory {
  id: string;
  restaurantId?: string | null;
  name: string;
  slug: string;
  foodItems?: FoodItem[];
}

export type { OrderSummary, OrderItemSummary, OrderStatus, UserRole, PaymentMethod, PaymentStatus };
