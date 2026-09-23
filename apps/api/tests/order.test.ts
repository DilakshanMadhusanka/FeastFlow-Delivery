import { describe, it, expect } from 'vitest';
import {
  isValidOrderStatusTransition,
  isTerminalOrderStatus,
  isRoleAuthorizedForTransition,
  VALID_ORDER_TRANSITIONS,
  TERMINAL_ORDER_STATUSES,
} from '../src/utils/orderStateMachine';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
  orderQuerySchema,
} from '../src/validators/order.validator';
import { OrderStatusEnum, PaymentMethodEnum } from '@prisma/client';
import { UserRole } from '@food-delivery/shared';

describe('Order Lifecycle State Machine', () => {
  it('should validate all standard forward fulfillment steps', () => {
    expect(isValidOrderStatusTransition(OrderStatusEnum.PENDING, OrderStatusEnum.RESTAURANT_ACCEPTED)).toBe(true);
    expect(isValidOrderStatusTransition(OrderStatusEnum.RESTAURANT_ACCEPTED, OrderStatusEnum.PREPARING)).toBe(true);
    expect(isValidOrderStatusTransition(OrderStatusEnum.PREPARING, OrderStatusEnum.READY_FOR_PICKUP)).toBe(true);
    expect(isValidOrderStatusTransition(OrderStatusEnum.READY_FOR_PICKUP, OrderStatusEnum.PICKED_UP)).toBe(true);
    expect(isValidOrderStatusTransition(OrderStatusEnum.PICKED_UP, OrderStatusEnum.ON_THE_WAY)).toBe(true);
    expect(isValidOrderStatusTransition(OrderStatusEnum.ON_THE_WAY, OrderStatusEnum.DELIVERED)).toBe(true);
  });

  it('should allow driver assignment before or after food preparation is complete', () => {
    expect(isValidOrderStatusTransition(OrderStatusEnum.RESTAURANT_ACCEPTED, OrderStatusEnum.DRIVER_ASSIGNED)).toBe(true);
    expect(isValidOrderStatusTransition(OrderStatusEnum.PREPARING, OrderStatusEnum.DRIVER_ASSIGNED)).toBe(true);
    expect(isValidOrderStatusTransition(OrderStatusEnum.READY_FOR_PICKUP, OrderStatusEnum.DRIVER_ASSIGNED)).toBe(true);
    expect(isValidOrderStatusTransition(OrderStatusEnum.DRIVER_ASSIGNED, OrderStatusEnum.PICKED_UP)).toBe(true);
  });

  it('should allow cancellation from early stages but forbid backward/skipping transitions', () => {
    // Early cancellation allowed
    expect(isValidOrderStatusTransition(OrderStatusEnum.PENDING, OrderStatusEnum.CANCELLED)).toBe(true);
    expect(isValidOrderStatusTransition(OrderStatusEnum.RESTAURANT_ACCEPTED, OrderStatusEnum.CANCELLED)).toBe(true);
    expect(isValidOrderStatusTransition(OrderStatusEnum.PREPARING, OrderStatusEnum.CANCELLED)).toBe(true);

    // Skipping stages or moving backwards must be rejected
    expect(isValidOrderStatusTransition(OrderStatusEnum.PENDING, OrderStatusEnum.DELIVERED)).toBe(false);
    expect(isValidOrderStatusTransition(OrderStatusEnum.DELIVERED, OrderStatusEnum.PREPARING)).toBe(false);
    expect(isValidOrderStatusTransition(OrderStatusEnum.CANCELLED, OrderStatusEnum.PENDING)).toBe(false);
    expect(isValidOrderStatusTransition(OrderStatusEnum.PENDING, OrderStatusEnum.PENDING)).toBe(false);
  });

  it('should correctly identify terminal order statuses', () => {
    expect(isTerminalOrderStatus(OrderStatusEnum.DELIVERED)).toBe(true);
    expect(isTerminalOrderStatus(OrderStatusEnum.CANCELLED)).toBe(true);
    expect(isTerminalOrderStatus(OrderStatusEnum.REJECTED)).toBe(true);

    expect(isTerminalOrderStatus(OrderStatusEnum.PENDING)).toBe(false);
    expect(isTerminalOrderStatus(OrderStatusEnum.PREPARING)).toBe(false);
    expect(isTerminalOrderStatus(OrderStatusEnum.ON_THE_WAY)).toBe(false);
  });

  it('should verify terminal statuses have no outgoing transitions', () => {
    for (const term of TERMINAL_ORDER_STATUSES) {
      expect(VALID_ORDER_TRANSITIONS[term]).toHaveLength(0);
    }
  });
});

describe('Role-Based Order Transition Authorization', () => {
  it('should allow admin to trigger any valid transition', () => {
    expect(
      isRoleAuthorizedForTransition(
        [UserRole.ADMIN],
        OrderStatusEnum.PENDING,
        OrderStatusEnum.RESTAURANT_ACCEPTED
      )
    ).toBe(true);

    expect(
      isRoleAuthorizedForTransition(
        [UserRole.ADMIN],
        OrderStatusEnum.ON_THE_WAY,
        OrderStatusEnum.DELIVERED
      )
    ).toBe(true);
  });

  it('should allow customers to cancel in pending/accepted state but forbid advancing orders', () => {
    // Can cancel pending
    expect(
      isRoleAuthorizedForTransition(
        [UserRole.CUSTOMER],
        OrderStatusEnum.PENDING,
        OrderStatusEnum.CANCELLED
      )
    ).toBe(true);

    // Can cancel accepted
    expect(
      isRoleAuthorizedForTransition(
        [UserRole.CUSTOMER],
        OrderStatusEnum.RESTAURANT_ACCEPTED,
        OrderStatusEnum.CANCELLED
      )
    ).toBe(true);

    // Cannot cancel after preparation starts or during delivery
    expect(
      isRoleAuthorizedForTransition(
        [UserRole.CUSTOMER],
        OrderStatusEnum.PICKED_UP,
        OrderStatusEnum.CANCELLED
      )
    ).toBe(false);

    // Cannot advance order statuses
    expect(
      isRoleAuthorizedForTransition(
        [UserRole.CUSTOMER],
        OrderStatusEnum.PENDING,
        OrderStatusEnum.RESTAURANT_ACCEPTED
      )
    ).toBe(false);

    expect(
      isRoleAuthorizedForTransition(
        [UserRole.CUSTOMER],
        OrderStatusEnum.ON_THE_WAY,
        OrderStatusEnum.DELIVERED
      )
    ).toBe(false);
  });

  it('should authorize restaurant owners for kitchen and acceptance lifecycle', () => {
    expect(
      isRoleAuthorizedForTransition(
        [UserRole.RESTAURANT_OWNER],
        OrderStatusEnum.PENDING,
        OrderStatusEnum.RESTAURANT_ACCEPTED
      )
    ).toBe(true);

    expect(
      isRoleAuthorizedForTransition(
        [UserRole.RESTAURANT_OWNER],
        OrderStatusEnum.PENDING,
        OrderStatusEnum.REJECTED
      )
    ).toBe(true);

    expect(
      isRoleAuthorizedForTransition(
        [UserRole.RESTAURANT_OWNER],
        OrderStatusEnum.RESTAURANT_ACCEPTED,
        OrderStatusEnum.PREPARING
      )
    ).toBe(true);

    expect(
      isRoleAuthorizedForTransition(
        [UserRole.RESTAURANT_OWNER],
        OrderStatusEnum.PREPARING,
        OrderStatusEnum.READY_FOR_PICKUP
      )
    ).toBe(true);

    // Restaurant cannot deliver the order directly
    expect(
      isRoleAuthorizedForTransition(
        [UserRole.RESTAURANT_OWNER],
        OrderStatusEnum.ON_THE_WAY,
        OrderStatusEnum.DELIVERED
      )
    ).toBe(false);
  });

  it('should authorize couriers for delivery lifecycle only', () => {
    expect(
      isRoleAuthorizedForTransition(
        [UserRole.DELIVERY_DRIVER],
        OrderStatusEnum.READY_FOR_PICKUP,
        OrderStatusEnum.PICKED_UP
      )
    ).toBe(true);

    expect(
      isRoleAuthorizedForTransition(
        [UserRole.DELIVERY_DRIVER],
        OrderStatusEnum.PICKED_UP,
        OrderStatusEnum.ON_THE_WAY
      )
    ).toBe(true);

    expect(
      isRoleAuthorizedForTransition(
        [UserRole.DELIVERY_DRIVER],
        OrderStatusEnum.ON_THE_WAY,
        OrderStatusEnum.DELIVERED
      )
    ).toBe(true);

    // Driver cannot accept an order on behalf of restaurant
    expect(
      isRoleAuthorizedForTransition(
        [UserRole.DELIVERY_DRIVER],
        OrderStatusEnum.PENDING,
        OrderStatusEnum.RESTAURANT_ACCEPTED
      )
    ).toBe(false);
  });
});

describe('Order Validator Schemas', () => {
  it('should accept valid order creation payload', () => {
    const valid = {
      deliveryAddressId: 'c1234567-89ab-cdef-0123-456789abcdef',
      paymentMethod: PaymentMethodEnum.CARD,
      tipAmount: 3.5,
      couponCode: 'FEAST20',
      specialInstructions: 'Please leave outside door',
    };
    const parsed = createOrderSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('should reject invalid UUID or negative tip amount', () => {
    const invalidUuid = {
      deliveryAddressId: 'not-a-uuid',
      paymentMethod: PaymentMethodEnum.COD,
    };
    expect(createOrderSchema.safeParse(invalidUuid).success).toBe(false);

    const negativeTip = {
      deliveryAddressId: 'c1234567-89ab-cdef-0123-456789abcdef',
      tipAmount: -5,
    };
    expect(createOrderSchema.safeParse(negativeTip).success).toBe(false);
  });

  it('should validate status transition payload', () => {
    expect(
      updateOrderStatusSchema.safeParse({
        status: OrderStatusEnum.PREPARING,
        notes: 'Chef started pizza in wood-fired oven',
      }).success
    ).toBe(true);

    expect(
      updateOrderStatusSchema.safeParse({
        status: 'NON_EXISTENT_STATUS',
      }).success
    ).toBe(false);
  });

  it('should validate cancellation payload requiring minimum reason length', () => {
    expect(
      cancelOrderSchema.safeParse({
        reason: 'Ordered by accident',
      }).success
    ).toBe(true);

    // Reject too short reason
    expect(
      cancelOrderSchema.safeParse({
        reason: 'no',
      }).success
    ).toBe(false);

    expect(
      cancelOrderSchema.safeParse({}).success
    ).toBe(false);
  });

  it('should coerce query parameters properly', () => {
    const parsed = orderQuerySchema.parse({
      page: '2',
      limit: '25',
      status: OrderStatusEnum.DELIVERED,
    });

    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(25);
    expect(parsed.status).toBe(OrderStatusEnum.DELIVERED);
  });
});
