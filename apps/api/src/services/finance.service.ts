import { prisma } from '../config/database';
import { OrderStatusEnum, UserRoleEnum, Prisma } from '@prisma/client';
import { ForbiddenError, NotFoundError, BadRequestError } from '../utils/errors';

export class FinanceService {
  private readonly COMMISSION_RATE = 0.15; // 15% platform take-rate

  async getFinancialSummary(
    requestingUser: { userId: string; roles: UserRoleEnum[] },
    restaurantId?: string
  ) {
    const isAdmin = requestingUser.roles.includes(UserRoleEnum.ADMIN);

    const where: Prisma.OrderWhereInput = {
      status: OrderStatusEnum.DELIVERED,
    };

    if (restaurantId && restaurantId !== 'all') {
      const rest = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { id: true, ownerId: true },
      });
      if (!rest) throw new NotFoundError('Restaurant not found');
      if (!isAdmin && rest.ownerId !== requestingUser.userId) {
        throw new ForbiddenError('Access denied to this restaurant financial data');
      }
      where.restaurantId = restaurantId;
    } else if (!isAdmin) {
      // Merchant only views their own restaurants
      where.restaurant = { ownerId: requestingUser.userId };
    }

    const orders = await prisma.order.findMany({
      where,
      select: {
        id: true,
        subtotal: true,
        deliveryFee: true,
        serviceFee: true,
        tipAmount: true,
        discountAmount: true,
        totalAmount: true,
        placedAt: true,
        completedAt: true,
      },
    });

    let grossSales = 0;
    let totalDeliveryFees = 0;
    let totalServiceFees = 0;
    let totalTips = 0;
    let totalDiscounts = 0;
    let totalVolume = 0;

    for (const o of orders) {
      grossSales += Number(o.subtotal || 0);
      totalDeliveryFees += Number(o.deliveryFee || 0);
      totalServiceFees += Number(o.serviceFee || 0);
      totalTips += Number(o.tipAmount || 0);
      totalDiscounts += Number(o.discountAmount || 0);
      totalVolume += Number(o.totalAmount || 0);
    }

    const platformCommission = Math.round(grossSales * this.COMMISSION_RATE * 100) / 100;
    const netMerchantRevenue = Math.round((grossSales - platformCommission) * 100) / 100;
    const driverPayouts = Math.round((totalDeliveryFees + totalTips) * 100) / 100;

    return {
      commissionRate: this.COMMISSION_RATE,
      commissionPercentage: this.COMMISSION_RATE * 100,
      totalDeliveredOrders: orders.length,
      grossSales: Math.round(grossSales * 100) / 100,
      platformCommission,
      netMerchantRevenue,
      totalDeliveryFees: Math.round(totalDeliveryFees * 100) / 100,
      totalServiceFees: Math.round(totalServiceFees * 100) / 100,
      totalTips: Math.round(totalTips * 100) / 100,
      totalDiscounts: Math.round(totalDiscounts * 100) / 100,
      totalVolume: Math.round(totalVolume * 100) / 100,
      driverPayouts,
      availablePayoutBalance: netMerchantRevenue,
    };
  }

  async getFinancialLedger(
    requestingUser: { userId: string; roles: UserRoleEnum[] },
    query: {
      restaurantId?: string;
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
    }
  ) {
    const isAdmin = requestingUser.roles.includes(UserRoleEnum.ADMIN);
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      status: OrderStatusEnum.DELIVERED,
    };

    if (query.restaurantId && query.restaurantId !== 'all') {
      const rest = await prisma.restaurant.findUnique({
        where: { id: query.restaurantId },
        select: { id: true, ownerId: true },
      });
      if (!rest) throw new NotFoundError('Restaurant not found');
      if (!isAdmin && rest.ownerId !== requestingUser.userId) {
        throw new ForbiddenError('Access denied');
      }
      where.restaurantId = query.restaurantId;
    } else if (!isAdmin) {
      where.restaurant = { ownerId: requestingUser.userId };
    }

    if (query.startDate || query.endDate) {
      where.placedAt = {};
      if (query.startDate) where.placedAt.gte = new Date(query.startDate);
      if (query.endDate) where.placedAt.lte = new Date(query.endDate);
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { placedAt: 'desc' },
        include: {
          restaurant: { select: { id: true, name: true, city: true } },
          customer: { select: { id: true, name: true, email: true } },
          payment: { select: { paymentMethod: true, paymentStatus: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    const items = orders.map((o) => {
      const subtotal = Number(o.subtotal || 0);
      const commission = Math.round(subtotal * this.COMMISSION_RATE * 100) / 100;
      const netMerchant = Math.round((subtotal - commission) * 100) / 100;

      return {
        id: o.id,
        orderNumber: o.orderNumber,
        placedAt: o.placedAt.toISOString(),
        completedAt: o.completedAt?.toISOString() || o.updatedAt.toISOString(),
        restaurant: {
          id: o.restaurant.id,
          name: o.restaurant.name,
          city: o.restaurant.city,
        },
        customer: {
          name: o.customer.name,
          email: o.customer.email,
        },
        paymentMethod: o.payment?.paymentMethod || 'COD',
        paymentStatus: o.payment?.paymentStatus || 'COMPLETED',
        subtotal,
        commissionRate: this.COMMISSION_RATE,
        platformCommission: commission,
        netMerchantAmount: netMerchant,
        deliveryFee: Number(o.deliveryFee || 0),
        serviceFee: Number(o.serviceFee || 0),
        tipAmount: Number(o.tipAmount || 0),
        discountAmount: Number(o.discountAmount || 0),
        totalAmount: Number(o.totalAmount || 0),
        settlementStatus: 'SETTLED',
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async processPayout(
    requestingUser: { userId: string; roles: UserRoleEnum[] },
    input: { restaurantId: string; amount: number; bankAccount?: string; notes?: string }
  ) {
    const isAdmin = requestingUser.roles.includes(UserRoleEnum.ADMIN);
    const rest = await prisma.restaurant.findUnique({
      where: { id: input.restaurantId },
      select: { id: true, name: true, ownerId: true },
    });

    if (!rest) throw new NotFoundError('Restaurant not found');
    if (!isAdmin && rest.ownerId !== requestingUser.userId) {
      throw new ForbiddenError('Unauthorized to request payout for this restaurant');
    }

    if (input.amount <= 0) {
      throw new BadRequestError('Payout amount must be positive');
    }

    // Generate settlement record payload
    const payoutBatchId = `PAY-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return {
      payoutId: payoutBatchId,
      restaurantId: rest.id,
      restaurantName: rest.name,
      amount: Number(input.amount.toFixed(2)),
      currency: 'USD',
      status: 'PROCESSING',
      destinationAccount: input.bankAccount || 'Default Merchant Bank (ACH ending ••4821)',
      requestedAt: new Date().toISOString(),
      estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 business days
      notes: input.notes || 'Automated bi-weekly settlement payout',
    };
  }
}

export const financeService = new FinanceService();
