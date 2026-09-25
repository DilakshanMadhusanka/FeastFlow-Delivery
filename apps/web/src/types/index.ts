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

export interface Coupon {
  id: string;
  code: string;
  description?: string | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minimumAmount: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  perUserLimit: number;
  usedCount: number;
  usageCount: number;
  orderCount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCouponInput {
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minimumAmount?: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  perUserLimit?: number;
  startDate?: string;
  endDate: string;
  isActive?: boolean;
}

export interface ReviewItem {
  id: string;
  rating: number;
  comment?: string | null;
  reply?: string | null;
  repliedAt?: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
  restaurant: {
    id: string;
    name: string;
    city?: string;
  };
  order: {
    id: string;
    orderNumber: string;
    placedAt: string;
  };
  foodItem?: {
    id: string;
    name: string;
  } | null;
}

export interface FinancialSummary {
  commissionRate: number;
  commissionPercentage: number;
  totalDeliveredOrders: number;
  grossSales: number;
  platformCommission: number;
  netMerchantRevenue: number;
  totalDeliveryFees: number;
  totalServiceFees: number;
  totalTips: number;
  totalDiscounts: number;
  totalVolume: number;
  driverPayouts: number;
  availablePayoutBalance: number;
}

export interface FinancialLedgerItem {
  id: string;
  orderNumber: string;
  placedAt: string;
  completedAt: string;
  restaurant: {
    id: string;
    name: string;
    city?: string;
  };
  customer: {
    name: string;
    email: string;
  };
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  commissionRate: number;
  platformCommission: number;
  netMerchantAmount: number;
  deliveryFee: number;
  serviceFee: number;
  tipAmount: number;
  discountAmount: number;
  totalAmount: number;
  settlementStatus: string;
}

export interface DriverFleetItem {
  id: string;
  userId: string;
  vehicleType: string;
  licensePlate?: string | null;
  isOnline: boolean;
  isVerified: boolean;
  currentLatitude?: number | null;
  currentLongitude?: number | null;
  ratingAverage: number;
  ratingCount: number;
  totalDeliveries: number;
  user?: {
    name: string;
    email: string;
    phone?: string | null;
    avatarUrl?: string | null;
  } | null;
  activeAssignment?: {
    id: string;
    status: string;
    orderId: string;
    orderNumber: string;
    restaurantName: string;
  } | null;
}

export type { OrderSummary, OrderItemSummary, OrderStatus, UserRole, PaymentMethod, PaymentStatus };

