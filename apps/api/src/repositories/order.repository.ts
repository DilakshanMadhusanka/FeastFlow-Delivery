import { prisma } from '../config/database';
import {
  OrderStatusEnum,
  PaymentMethodEnum,
  PaymentStatusEnum,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';

export interface CreateOrderParams {
  userId: string;
  cartId: string;
  restaurantId: string;
  deliveryAddressId: string;
  paymentMethod: PaymentMethodEnum;
  tipAmount: number;
  specialInstructions?: string;
  couponId?: string;
  pricing: {
    subtotal: number;
    deliveryFee: number;
    serviceFee: number;
    discount: number;
    tax: number;
    total: number;
  };
  cartItems: Array<{
    foodItemId: string;
    quantity: number;
    specialInstructions?: string | null;
    foodItem: {
      name: string;
      price: Prisma.Decimal | number;
    };
    addons: Array<{
      addonId: string;
      addon: {
        name: string;
        price: Prisma.Decimal | number;
      };
    }>;
  }>;
}

function formatOrderResponse<T extends Record<string, any>>(order: T | null): T | null {
  if (!order) return null;
  return {
    ...order,
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.deliveryFee),
    serviceFee: Number(order.serviceFee),
    taxAmount: Number(order.taxAmount),
    discountAmount: Number(order.discountAmount || 0),
    tipAmount: Number(order.tipAmount || 0),
    totalAmount: Number(order.totalAmount),
    items: order.items?.map((item: any) => ({
      ...item,
      priceSnapshot: Number(item.priceSnapshot),
      subtotal: Number(item.subtotal),
      addons: item.addons?.map((addon: any) => ({
        ...addon,
        priceSnapshot: Number(addon.priceSnapshot),
      })),
    })),
  };
}

export class OrderRepository {
  /**
   * Generates a unique, readable order reference number.
   * e.g. ORD-M8Z2-4821
   */
  private generateOrderNumber(): string {
    const timestampCode = Date.now().toString(36).slice(-4).toUpperCase();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${timestampCode}-${randomSuffix}`;
  }

  /**
   * Atomically creates Order, OrderItems, Snapshots, OrderStatusHistory,
   * Payment record, and empties the Cart.
   */
  async createOrderFromCart(params: CreateOrderParams) {
    const {
      userId,
      cartId,
      restaurantId,
      deliveryAddressId,
      paymentMethod,
      tipAmount,
      specialInstructions,
      couponId,
      pricing,
      cartItems,
    } = params;

    const orderNumber = this.generateOrderNumber();

    return prisma.$transaction(async (tx) => {
      // 1. Fetch restaurant delivery estimate
      const restaurant = await tx.restaurant.findUnique({
        where: { id: restaurantId },
        select: { estimatedDeliveryMax: true },
      });

      const estMinutes = restaurant?.estimatedDeliveryMax || 35;
      const estimatedDeliveryAt = new Date(Date.now() + estMinutes * 60 * 1000);

      // 2. Create Order
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: userId,
          restaurantId,
          deliveryAddressId,
          status: OrderStatusEnum.PENDING,
          subtotal: new Prisma.Decimal(pricing.subtotal.toFixed(2)),
          deliveryFee: new Prisma.Decimal(pricing.deliveryFee.toFixed(2)),
          serviceFee: new Prisma.Decimal(pricing.serviceFee.toFixed(2)),
          discountAmount: new Prisma.Decimal(pricing.discount.toFixed(2)),
          tipAmount: new Prisma.Decimal(tipAmount.toFixed(2)),
          totalAmount: new Prisma.Decimal((pricing.total + tipAmount).toFixed(2)),
          couponId: couponId || null,
          specialInstructions: specialInstructions || null,
          placedAt: new Date(),
          estimatedDeliveryAt,
        },
      });

      // 3. Create Order Items with frozen snapshots
      for (const item of cartItems) {
        const itemPrice = Number(item.foodItem.price);
        const addonsTotal = item.addons.reduce(
          (sum, a) => sum + Number(a.addon.price),
          0
        );
        const itemSubtotal = (itemPrice + addonsTotal) * item.quantity;

        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            foodItemId: item.foodItemId,
            nameSnapshot: item.foodItem.name,
            priceSnapshot: new Prisma.Decimal(itemPrice.toFixed(2)),
            quantity: item.quantity,
            subtotal: new Prisma.Decimal(itemSubtotal.toFixed(2)),
            specialNotes: item.specialInstructions || null,
          },
        });

        // 4. Create Order Item Addons with frozen snapshots
        if (item.addons && item.addons.length > 0) {
          await tx.orderItemAddon.createMany({
            data: item.addons.map((a) => ({
              orderItemId: orderItem.id,
              addonId: a.addonId,
              nameSnapshot: a.addon.name,
              priceSnapshot: new Prisma.Decimal(Number(a.addon.price).toFixed(2)),
            })),
          });
        }
      }

      // 5. Create Initial Order Status History
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: OrderStatusEnum.PENDING,
          notes: 'Order placed by customer',
          changedById: userId,
        },
      });

      // 6. Create Initial Payment Record
      const isCod = paymentMethod === PaymentMethodEnum.COD;
      const transactionId = isCod ? `cod_${randomUUID()}` : `pi_${randomUUID()}`;

      await tx.payment.create({
        data: {
          orderId: order.id,
          userId,
          amount: new Prisma.Decimal((pricing.total + tipAmount).toFixed(2)),
          paymentMethod,
          paymentStatus: isCod ? PaymentStatusEnum.PENDING : PaymentStatusEnum.COMPLETED,
          paymentGateway: isCod ? 'CASH' : 'STRIPE',
          transactionId,
        },
      });

      // 7. Increment coupon usage if applied
      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      // 8. Clear user's cart
      await tx.cartItem.deleteMany({
        where: { cartId },
      });
      await tx.cart.update({
        where: { id: cartId },
        data: { restaurantId: null },
      });

      return formatOrderResponse(order)!;
    });
  }

  /**
   * Retrieves an order with complete relational tree.
   */
  async findById(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
        restaurant: {
          select: {
            id: true,
            ownerId: true,
            name: true,
            slug: true,
            phone: true,
            street: true,
            city: true,
            logoUrl: true,
            bannerUrl: true,
            latitude: true,
            longitude: true,
          },
        },
        deliveryAddress: true,
        items: {
          include: {
            addons: true,
            foodItem: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: {
            changedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        payment: true,
        deliveryAssignment: {
          include: {
            driver: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return formatOrderResponse(order);
  }

  /**
   * Finds customer orders with pagination and optional status filter.
   */
  async findUserOrders(
    userId: string,
    page: number = 1,
    limit: number = 10,
    status?: OrderStatusEnum
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = {
      customerId: userId,
      ...(status ? { status } : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { placedAt: 'desc' },
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              bannerUrl: true,
              phone: true,
              street: true,
              city: true,
            },
          },
          items: {
            include: {
              addons: true,
            },
          },
          payment: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      items: orders.map((o) => formatOrderResponse(o)!),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Finds restaurant orders with pagination and optional status filter.
   */
  async findRestaurantOrders(
    restaurantId: string,
    page: number = 1,
    limit: number = 10,
    status?: OrderStatusEnum
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = {
      restaurantId,
      ...(status ? { status } : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { placedAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          deliveryAddress: true,
          items: {
            include: {
              addons: true,
            },
          },
          payment: true,
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      items: orders.map((o) => formatOrderResponse(o)!),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Transitions an order's status, records history, and handles completion/cancellation side-effects.
   */
  async updateStatus(
    orderId: string,
    status: OrderStatusEnum,
    changedById?: string,
    notes?: string
  ) {
    return prisma.$transaction(async (tx) => {
      const updateData: Prisma.OrderUpdateInput = {
        status,
      };

      if (status === OrderStatusEnum.DELIVERED) {
        updateData.completedAt = new Date();
      } else if (status === OrderStatusEnum.CANCELLED) {
        updateData.cancelledAt = new Date();
        updateData.cancellationReason = notes || 'Cancelled by user or system';
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: updateData,
        include: {
          payment: true,
        },
      });

      // Record status transition in history
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status,
          notes: notes || null,
          changedById: changedById || null,
        },
      });

      // If delivered and payment was COD pending, mark payment completed
      if (
        status === OrderStatusEnum.DELIVERED &&
        updatedOrder.payment &&
        updatedOrder.payment.paymentMethod === PaymentMethodEnum.COD &&
        updatedOrder.payment.paymentStatus === PaymentStatusEnum.PENDING
      ) {
        await tx.payment.update({
          where: { id: updatedOrder.payment.id },
          data: { paymentStatus: PaymentStatusEnum.COMPLETED },
        });
      }

      return formatOrderResponse(updatedOrder)!;
    });
  }
}

export const orderRepository = new OrderRepository();
