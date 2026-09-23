import { OrderStatus, UserRole, PaymentMethod, PaymentStatus, VehicleType, NotificationType } from '../enums';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errorCode?: string;
  details?: unknown;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface JwtPayload {
  userId: string;
  email: string;
  roles: UserRole[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  roles: UserRole[];
  isEmailVerified: boolean;
}

export interface CartCalculationResult {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  tax: number;
  total: number;
  couponCode?: string;
}

export interface LiveLocationUpdate {
  orderId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  bearing?: number;
  speed?: number;
  updatedAt: string;
}

export interface OrderStatusChangedEvent {
  orderId: string;
  orderNumber: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  updatedAt: string;
  notes?: string;
}

export interface OrderItemAddonSummary {
  id: string;
  addonId: string;
  nameSnapshot: string;
  priceSnapshot: number;
}

export interface OrderItemSummary {
  id: string;
  orderId: string;
  foodItemId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  subtotal: number;
  specialNotes?: string | null;
  addons?: OrderItemAddonSummary[];
}

export interface OrderStatusHistorySummary {
  id: string;
  orderId: string;
  status: OrderStatus;
  notes?: string | null;
  changedById?: string | null;
  createdAt: string;
  changedBy?: {
    id: string;
    name: string;
  } | null;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  customerId: string;
  restaurantId: string;
  deliveryAddressId: string;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discountAmount: number;
  tipAmount: number;
  totalAmount: number;
  couponId?: string | null;
  specialInstructions?: string | null;
  placedAt: string;
  estimatedDeliveryAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  restaurant?: {
    id: string;
    name: string;
    slug?: string;
    imageUrl?: string | null;
    logoUrl?: string | null;
    bannerUrl?: string | null;
    phone?: string;
    street?: string;
    city?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  deliveryAddress?: {
    id: string;
    title: string;
    street: string;
    apartment?: string | null;
    city: string;
    state?: string | null;
    postalCode?: string | null;
    latitude: number;
    longitude: number;
    deliveryInstructions?: string | null;
  };
  items?: OrderItemSummary[];
  statusHistory?: OrderStatusHistorySummary[];
  payment?: {
    id: string;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    transactionId?: string | null;
  };
  deliveryAssignment?: {
    id: string;
    status: string;
    driver?: {
      id: string;
      vehicleType?: string | null;
      vehiclePlate?: string | null;
      user?: {
        id: string;
        name: string;
        phone?: string | null;
        avatarUrl?: string | null;
      };
    };
  } | null;
}

export interface CreateOrderInput {
  deliveryAddressId: string;
  paymentMethod: PaymentMethod;
  tipAmount?: number;
  couponCode?: string;
  specialInstructions?: string;
}

export interface UpdateOrderStatusInput {
  status: OrderStatus;
  notes?: string;
}

export type DeliveryWorkflowStep =
  | 'HEADING_TO_RESTAURANT'
  | 'ARRIVED_AT_RESTAURANT'
  | 'PICKED_UP'
  | 'HEADING_TO_CUSTOMER'
  | 'ARRIVED_AT_CUSTOMER'
  | 'DELIVERED';

export interface DriverProfileDto {
  id: string;
  userId: string;
  vehicleType: VehicleType;
  licensePlate?: string | null;
  isOnline: boolean;
  isVerified: boolean;
  currentLatitude?: number | null;
  currentLongitude?: number | null;
  ratingAverage: number;
  ratingCount: number;
  totalDeliveries: number;
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    avatarUrl?: string | null;
  };
}

export interface DeliveryJobRequestDto {
  orderId: string;
  orderNumber: string;
  restaurant: {
    id: string;
    name: string;
    street: string;
    city: string;
    latitude: number;
    longitude: number;
    phone: string;
  };
  deliveryAddress: {
    street: string;
    apartment?: string | null;
    city: string;
    latitude: number;
    longitude: number;
    deliveryInstructions?: string | null;
  };
  itemsCount: number;
  estimatedEarnings: number;
  customerTip: number;
  distanceToRestaurantKm: number;
  distanceToCustomerKm: number;
  placedAt: string;
}

export interface ActiveDeliveryDto {
  assignmentId: string;
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  currentStep: DeliveryWorkflowStep;
  restaurant: {
    id: string;
    name: string;
    street: string;
    city: string;
    latitude: number;
    longitude: number;
    phone: string;
  };
  customer: {
    name: string;
    phone?: string | null;
  };
  deliveryAddress: {
    street: string;
    apartment?: string | null;
    city: string;
    latitude: number;
    longitude: number;
    deliveryInstructions?: string | null;
  };
  items: Array<{
    id: string;
    quantity: number;
    name: string;
    addons?: string[];
    specialNotes?: string | null;
  }>;
  totalAmount: number;
  driverPayout: number;
  customerTip: number;
  paymentMethod: PaymentMethod;
  acceptedAt?: string | null;
  pickedUpAt?: string | null;
}

export interface DriverEarningsSummaryDto {
  todayEarnings: number;
  weekEarnings: number;
  totalEarnings: number;
  todayDeliveries: number;
  totalDeliveries: number;
  recentDeliveries: Array<{
    id: string;
    orderNumber: string;
    restaurantName: string;
    deliveredAt: string;
    payout: number;
    tip: number;
    total: number;
  }>;
}
export interface SocketDriverLocationPayload {
  orderId?: string;
  driverId?: string;
  latitude: number;
  longitude: number;
  bearing?: number;
  speed?: number;
  accuracy?: number;
}

export interface NotificationDto {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
}

export interface RegisterPushTokenInput {
  token: string;
  platform?: 'ios' | 'android' | 'web';
}

export interface UnreadNotificationCountDto {
  count: number;
}

export interface ServerToClientEvents {
  'order:status_changed': (data: OrderStatusChangedEvent) => void;
  'order:driver_location': (data: LiveLocationUpdate) => void;
  'order:new': (data: OrderSummary) => void;
  'driver:job_available': (data: DeliveryJobRequestDto) => void;
  'driver:job_assigned': (data: { orderId: string; assignmentId: string }) => void;
  'driver:job_cancelled': (data: { orderId: string; reason?: string }) => void;
  'notification:new': (data: NotificationDto) => void;
}

export interface ClientToServerEvents {
  'join:order': (data: { orderId: string }, callback?: (res: { success: boolean; message?: string }) => void) => void;
  'leave:order': (data: { orderId: string }) => void;
  'join:restaurant': (data: { restaurantId: string }, callback?: (res: { success: boolean; message?: string }) => void) => void;
  'leave:restaurant': (data: { restaurantId: string }) => void;
  'join:driver': (data: { driverId?: string }, callback?: (res: { success: boolean; message?: string }) => void) => void;
  'leave:driver': (data: { driverId?: string }) => void;
  'join:user': (data: { userId: string }, callback?: (res: { success: boolean; message?: string }) => void) => void;
  'leave:user': (data: { userId: string }) => void;
  'driver:update_location': (data: SocketDriverLocationPayload, callback?: (res: { success: boolean }) => void) => void;
}
