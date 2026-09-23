import { OrderStatusEnum, UserRoleEnum } from '@prisma/client';

export const VALID_ORDER_TRANSITIONS: Record<OrderStatusEnum, OrderStatusEnum[]> = {
  [OrderStatusEnum.PENDING]: [
    OrderStatusEnum.RESTAURANT_ACCEPTED,
    OrderStatusEnum.REJECTED,
    OrderStatusEnum.CANCELLED,
  ],
  [OrderStatusEnum.RESTAURANT_ACCEPTED]: [
    OrderStatusEnum.PREPARING,
    OrderStatusEnum.DRIVER_ASSIGNED,
    OrderStatusEnum.CANCELLED,
  ],
  [OrderStatusEnum.PREPARING]: [
    OrderStatusEnum.READY_FOR_PICKUP,
    OrderStatusEnum.DRIVER_ASSIGNED,
    OrderStatusEnum.CANCELLED,
  ],
  [OrderStatusEnum.READY_FOR_PICKUP]: [
    OrderStatusEnum.DRIVER_ASSIGNED,
    OrderStatusEnum.PICKED_UP,
    OrderStatusEnum.CANCELLED,
  ],
  [OrderStatusEnum.DRIVER_ASSIGNED]: [
    OrderStatusEnum.READY_FOR_PICKUP,
    OrderStatusEnum.PICKED_UP,
    OrderStatusEnum.CANCELLED,
  ],
  [OrderStatusEnum.PICKED_UP]: [
    OrderStatusEnum.ON_THE_WAY,
    OrderStatusEnum.DELIVERED,
  ],
  [OrderStatusEnum.ON_THE_WAY]: [
    OrderStatusEnum.DELIVERED,
  ],
  [OrderStatusEnum.DELIVERED]: [],
  [OrderStatusEnum.REJECTED]: [],
  [OrderStatusEnum.CANCELLED]: [],
};

export const TERMINAL_ORDER_STATUSES: OrderStatusEnum[] = [
  OrderStatusEnum.DELIVERED,
  OrderStatusEnum.REJECTED,
  OrderStatusEnum.CANCELLED,
];

/**
 * Checks if a transition between two order states is topologically valid.
 */
export function isValidOrderStatusTransition(
  currentStatus: OrderStatusEnum,
  targetStatus: OrderStatusEnum
): boolean {
  if (currentStatus === targetStatus) {
    return false;
  }
  const allowed = VALID_ORDER_TRANSITIONS[currentStatus];
  return Boolean(allowed && allowed.includes(targetStatus));
}

/**
 * Checks if an order status is terminal (no further transitions possible).
 */
export function isTerminalOrderStatus(status: OrderStatusEnum): boolean {
  return TERMINAL_ORDER_STATUSES.includes(status);
}

const RESTAURANT_CANCELLABLE_STATUSES: OrderStatusEnum[] = [
  OrderStatusEnum.PENDING,
  OrderStatusEnum.RESTAURANT_ACCEPTED,
  OrderStatusEnum.PREPARING,
  OrderStatusEnum.READY_FOR_PICKUP,
];

/**
 * Validates whether a user with given roles is authorized to trigger a specific transition.
 */
export function isRoleAuthorizedForTransition(
  roles: UserRoleEnum[],
  fromStatus: OrderStatusEnum,
  toStatus: OrderStatusEnum
): boolean {
  if (roles.includes(UserRoleEnum.ADMIN)) {
    return true;
  }

  // Customer permissions
  if (roles.includes(UserRoleEnum.CUSTOMER)) {
    // Customers can only cancel orders in PENDING or RESTAURANT_ACCEPTED states
    if (
      toStatus === OrderStatusEnum.CANCELLED &&
      (fromStatus === OrderStatusEnum.PENDING || fromStatus === OrderStatusEnum.RESTAURANT_ACCEPTED)
    ) {
      return true;
    }
  }

  // Restaurant owner / staff permissions
  if (roles.includes(UserRoleEnum.RESTAURANT_OWNER)) {
    if (
      (fromStatus === OrderStatusEnum.PENDING && toStatus === OrderStatusEnum.RESTAURANT_ACCEPTED) ||
      (fromStatus === OrderStatusEnum.PENDING && toStatus === OrderStatusEnum.REJECTED) ||
      (fromStatus === OrderStatusEnum.RESTAURANT_ACCEPTED && toStatus === OrderStatusEnum.PREPARING) ||
      (fromStatus === OrderStatusEnum.PREPARING && toStatus === OrderStatusEnum.READY_FOR_PICKUP) ||
      (toStatus === OrderStatusEnum.CANCELLED && RESTAURANT_CANCELLABLE_STATUSES.includes(fromStatus))
    ) {
      return true;
    }
  }

  // Delivery driver permissions
  if (roles.includes(UserRoleEnum.DELIVERY_DRIVER)) {
    if (
      (fromStatus === OrderStatusEnum.READY_FOR_PICKUP && toStatus === OrderStatusEnum.PICKED_UP) ||
      (fromStatus === OrderStatusEnum.DRIVER_ASSIGNED && toStatus === OrderStatusEnum.PICKED_UP) ||
      (fromStatus === OrderStatusEnum.PICKED_UP && toStatus === OrderStatusEnum.ON_THE_WAY) ||
      (fromStatus === OrderStatusEnum.PICKED_UP && toStatus === OrderStatusEnum.DELIVERED) ||
      (fromStatus === OrderStatusEnum.ON_THE_WAY && toStatus === OrderStatusEnum.DELIVERED)
    ) {
      return true;
    }
  }

  return false;
}
