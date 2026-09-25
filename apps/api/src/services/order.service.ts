import { prisma } from '../config/database';
import { orderRepository } from '../repositories/order.repository';
import { cartRepository } from '../repositories/cart.repository';
import { addressRepository } from '../repositories/address.repository';
import { pricingService } from './pricing.service';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../utils/errors';
import {
  isValidOrderStatusTransition,
  isTerminalOrderStatus,
  isRoleAuthorizedForTransition,
} from '../utils/orderStateMachine';
import { OrderStatusEnum, PaymentMethodEnum, UserRoleEnum } from '@prisma/client';
import { CreateOrderInput } from '../validators/order.validator';
import {
  emitNewOrder,
  emitOrderStatusChanged,
  emitJobAvailable,
  emitJobCancelled,
} from '../sockets';
import { notificationService } from './notification.service';

export class OrderService {
  /**
   * Places an order from the user's active cart.
   */
  async createOrder(userId: string, input: CreateOrderInput) {
    // 1. Verify delivery address belongs to user
    const address = await addressRepository.findAddressById(input.deliveryAddressId);
    if (!address || address.userId !== userId || address.deletedAt) {
      throw new NotFoundError('Selected delivery address not found');
    }

    // 2. Fetch active cart
    const cart = await cartRepository.findCartByUserId(userId);
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new BadRequestError('Cannot place order with an empty basket');
    }

    if (!cart.restaurantId) {
      throw new BadRequestError('Cart is not associated with any restaurant');
    }

    // 3. Verify restaurant is active and approved
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: cart.restaurantId },
    });

    if (!restaurant || !restaurant.isActive || !restaurant.isApproved || restaurant.deletedAt) {
      throw new BadRequestError('Restaurant is currently unavailable to accept orders');
    }

    // 4. Validate coupon if provided
    let coupon = null;
    if (input.couponCode) {
      coupon = await cartRepository.findCouponByCode(input.couponCode);
      if (!coupon) {
        throw new BadRequestError(`Coupon '${input.couponCode}' is invalid`);
      }
      const now = new Date();
      if (!coupon.isActive || now < coupon.startDate || now > coupon.endDate) {
        throw new BadRequestError(`Coupon '${input.couponCode}' is expired or inactive`);
      }
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        throw new BadRequestError(`Coupon '${input.couponCode}' usage limit has been reached`);
      }
    }

    // 5. Calculate verified pricing
    const itemsForPricing = cart.items.map((i) => ({
      basePrice: Number(i.foodItem.price),
      addons: i.addons.map((a) => ({ price: Number(a.addon.price) })),
      quantity: i.quantity,
    }));

    const pricing = pricingService.calculateCart({
      items: itemsForPricing,
      deliveryFeeBase: Number(restaurant.deliveryFeeBase),
      coupon,
    });

    if (coupon && coupon.minimumAmount && pricing.subtotal < Number(coupon.minimumAmount)) {
      throw new BadRequestError(
        `Coupon '${coupon.code}' requires a minimum order subtotal of $${Number(coupon.minimumAmount).toFixed(2)}`
      );
    }

    // 6. Create order atomically
    const order = await orderRepository.createOrderFromCart({
      userId,
      cartId: cart.id,
      restaurantId: restaurant.id,
      deliveryAddressId: address.id,
      paymentMethod: input.paymentMethod || PaymentMethodEnum.COD,
      tipAmount: input.tipAmount || 0,
      specialInstructions: input.specialInstructions,
      couponId: coupon?.id,
      pricing,
      cartItems: cart.items,
    });

    const created = await orderRepository.findById(order.id);
    if (created) {
      emitNewOrder(created.restaurantId, {
        id: created.id,
        orderNumber: created.orderNumber,
        customerId: created.customerId,
        restaurantId: created.restaurantId,
        deliveryAddressId: created.deliveryAddressId,
        status: created.status as any,
        subtotal: Number(created.subtotal),
        deliveryFee: Number(created.deliveryFee),
        serviceFee: Number(created.serviceFee),
        discountAmount: Number(created.discountAmount),
        tipAmount: Number(created.tipAmount),
        totalAmount: Number(created.totalAmount),
        couponId: created.couponId,
        specialInstructions: created.specialInstructions,
        placedAt: created.createdAt.toISOString(),
        estimatedDeliveryAt: created.estimatedDeliveryAt?.toISOString(),
        items: created.items?.map((i) => ({
          id: i.id,
          orderId: i.orderId,
          foodItemId: i.foodItemId,
          nameSnapshot: i.nameSnapshot,
          priceSnapshot: Number(i.priceSnapshot),
          quantity: i.quantity,
          subtotal: Number(i.subtotal),
          specialNotes: i.specialNotes,
        })),
      }, created.restaurant.ownerId);

      notificationService
        .notifyOrderCreated({
          id: created.id,
          orderNumber: created.orderNumber,
          customerId: created.customerId,
          restaurant: {
            name: created.restaurant.name,
            ownerId: created.restaurant.ownerId,
          },
          totalAmount: Number(created.totalAmount),
        })
        .catch((err) => console.warn('Order creation notification notice:', err.message));
    }

    return created;
  }

  /**
   * Retrieves an order with authorization verification.
   */
  async getOrderById(
    orderId: string,
    requestingUser: { userId: string; roles: UserRoleEnum[] }
  ) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    const { userId, roles } = requestingUser;
    const isAdmin = roles.includes(UserRoleEnum.ADMIN);
    const isCustomer = order.customerId === userId;
    const isRestaurantOwner = order.restaurant.ownerId === userId;
    const isAssignedDriver = order.deliveryAssignment?.driver?.userId === userId;

    if (!isAdmin && !isCustomer && !isRestaurantOwner && !isAssignedDriver) {
      throw new ForbiddenError('You do not have permission to view this order');
    }

    return order;
  }

  /**
   * Retrieves paginated orders for a customer.
   */
  async getCustomerOrders(
    userId: string,
    query: { page?: number; limit?: number; status?: OrderStatusEnum }
  ) {
    return orderRepository.findUserOrders(
      userId,
      query.page || 1,
      query.limit || 10,
      query.status
    );
  }

  /**
   * Retrieves all orders across all restaurants for platform admin.
   */
  async getAllOrders(
    requestingUser: { userId: string; roles: UserRoleEnum[] },
    query: { page?: number; limit?: number; status?: OrderStatusEnum }
  ) {
    const isAdmin = requestingUser.roles.includes(UserRoleEnum.ADMIN);
    if (!isAdmin) {
      throw new ForbiddenError('You do not have permission to view all restaurant orders');
    }

    return orderRepository.findAllOrders(
      query.page || 1,
      query.limit || 100,
      query.status
    );
  }

  /**
   * Retrieves paginated orders for a restaurant owner or platform administrator.
   */
  async getRestaurantOrders(
    restaurantId: string,
    requestingUser: { userId: string; roles: UserRoleEnum[] },
    query: { page?: number; limit?: number; status?: OrderStatusEnum }
  ) {
    if (restaurantId === 'all') {
      return this.getAllOrders(requestingUser, query);
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, ownerId: true },
    });

    if (!restaurant) {
      throw new NotFoundError('Restaurant not found');
    }

    const isAdmin = requestingUser.roles.includes(UserRoleEnum.ADMIN);
    if (!isAdmin && restaurant.ownerId !== requestingUser.userId) {
      throw new ForbiddenError('You do not have permission to view this restaurant orders');
    }

    return orderRepository.findRestaurantOrders(
      restaurantId,
      query.page || 1,
      query.limit || 100,
      query.status
    );
  }

  /**
   * Handles status updates through the Order State Machine.
   */
  async updateOrderStatus(
    orderId: string,
    requestingUser: { userId: string; roles: UserRoleEnum[] },
    newStatus: OrderStatusEnum,
    notes?: string
  ) {
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (isTerminalOrderStatus(order.status)) {
      throw new BadRequestError(`Cannot update order in terminal status '${order.status}'`);
    }

    if (!isValidOrderStatusTransition(order.status, newStatus)) {
      throw new BadRequestError(
        `Invalid order status transition from '${order.status}' to '${newStatus}'`
      );
    }

    const { userId, roles } = requestingUser;
    const isAdmin = roles.includes(UserRoleEnum.ADMIN);

    if (!isAdmin) {
      // Customer can only cancel prior to food preparation
      if (roles.includes(UserRoleEnum.CUSTOMER) && order.customerId === userId) {
        if (newStatus !== OrderStatusEnum.CANCELLED) {
          throw new ForbiddenError('Customers are only permitted to cancel orders');
        }
        if (
          order.status !== OrderStatusEnum.PENDING &&
          order.status !== OrderStatusEnum.RESTAURANT_ACCEPTED
        ) {
          throw new BadRequestError(
            'Order cannot be cancelled once food preparation has started'
          );
        }
      } else if (
        roles.includes(UserRoleEnum.RESTAURANT_OWNER) &&
        order.restaurant.ownerId === userId
      ) {
        if (!isRoleAuthorizedForTransition([UserRoleEnum.RESTAURANT_OWNER], order.status, newStatus)) {
          throw new ForbiddenError(
            `Restaurant owners cannot transition orders from '${order.status}' to '${newStatus}'`
          );
        }
      } else if (
        roles.includes(UserRoleEnum.DELIVERY_DRIVER) &&
        order.deliveryAssignment?.driver?.userId === userId
      ) {
        if (!isRoleAuthorizedForTransition([UserRoleEnum.DELIVERY_DRIVER], order.status, newStatus)) {
          throw new ForbiddenError(
            `Courier is not permitted to transition order from '${order.status}' to '${newStatus}'`
          );
        }
      } else {
        throw new ForbiddenError('You do not have authorization to update this order');
      }
    }

    await orderRepository.updateStatus(orderId, newStatus, userId, notes);
    const updated = await orderRepository.findById(orderId);

    if (updated) {
      emitOrderStatusChanged(
        orderId,
        {
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          previousStatus: order.status as any,
          newStatus: updated.status as any,
          updatedAt: new Date().toISOString(),
          notes: notes,
        },
        updated.restaurantId,
        updated.restaurant.ownerId
      );

      // When order becomes ready for pickup, broadcast job to available driver fleet
      if (newStatus === OrderStatusEnum.READY_FOR_PICKUP) {
        emitJobAvailable({
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          restaurant: {
            id: updated.restaurant.id,
            name: updated.restaurant.name,
            street: updated.restaurant.street,
            city: updated.restaurant.city,
            latitude: updated.restaurant.latitude,
            longitude: updated.restaurant.longitude,
            phone: updated.restaurant.phone,
          },
          deliveryAddress: {
            street: updated.deliveryAddress.street,
            apartment: updated.deliveryAddress.apartment,
            city: updated.deliveryAddress.city,
            latitude: updated.deliveryAddress.latitude,
            longitude: updated.deliveryAddress.longitude,
            deliveryInstructions: updated.deliveryAddress.deliveryInstructions,
          },
          itemsCount: updated.items.reduce((acc, i) => acc + i.quantity, 0),
          estimatedEarnings: 4.0 + 1.2 * 2.5 + Number(updated.tipAmount || 0),
          customerTip: Number(updated.tipAmount || 0),
          distanceToRestaurantKm: 1.5,
          distanceToCustomerKm: 2.5,
          placedAt: updated.createdAt.toISOString(),
        });
      }

      // If order cancelled, notify assigned courier if any
      if (newStatus === OrderStatusEnum.CANCELLED && updated.deliveryAssignment?.driverId) {
        emitJobCancelled(updated.deliveryAssignment.driverId, {
          orderId: updated.id,
          reason: notes,
        });
      }

      notificationService
        .notifyOrderStatusChanged(
          updated.customerId,
          updated.restaurant.ownerId,
          {
            id: updated.id,
            orderNumber: updated.orderNumber,
            restaurantName: updated.restaurant.name,
          },
          newStatus as any,
          notes
        )
        .catch((err) => console.warn('Order status notification notice:', err.message));
    }

    return updated;
  }

  /**
   * Cancels an order with reason tracking.
   */
  async cancelOrder(
    orderId: string,
    requestingUser: { userId: string; roles: UserRoleEnum[] },
    reason: string
  ) {
    return this.updateOrderStatus(
      orderId,
      requestingUser,
      OrderStatusEnum.CANCELLED,
      reason
    );
  }
}

export const orderService = new OrderService();
