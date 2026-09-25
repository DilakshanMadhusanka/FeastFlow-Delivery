import { prisma } from '../config/database';
import { couponService } from './coupon.service';
import { notificationService } from './notification.service';
import { NotificationTypeEnum } from '@prisma/client';
import { NotFoundError } from '../utils/errors';

export class CustomerCrmService {
  async getCustomers(restaurantId?: string) {
    const orders = await prisma.order.findMany({
      where: {
        ...(restaurantId && restaurantId !== 'all' ? { restaurantId } : {}),
      },
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
        items: {
          select: { nameSnapshot: true, quantity: true },
        },
      },
      orderBy: { placedAt: 'desc' },
    });

    // Group orders by customerId
    const customerMap = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        avatarUrl: string | null;
        totalOrders: number;
        lifetimeSpend: number;
        lastOrderAt: string;
        itemCounts: Map<string, number>;
      }
    >();

    for (const o of orders) {
      if (!o.customer) continue;
      const cid = o.customer.id;
      const existing = customerMap.get(cid) || {
        id: cid,
        name: o.customer.name,
        email: o.customer.email,
        phone: o.customer.phone,
        avatarUrl: o.customer.avatarUrl,
        totalOrders: 0,
        lifetimeSpend: 0,
        lastOrderAt: o.placedAt.toISOString(),
        itemCounts: new Map<string, number>(),
      };

      existing.totalOrders += 1;
      existing.lifetimeSpend += Number(o.totalAmount || 0);
      if (new Date(o.placedAt) > new Date(existing.lastOrderAt)) {
        existing.lastOrderAt = o.placedAt.toISOString();
      }

      for (const item of o.items) {
        const count = existing.itemCounts.get(item.nameSnapshot) || 0;
        existing.itemCounts.set(item.nameSnapshot, count + item.quantity);
      }

      customerMap.set(cid, existing);
    }

    // Transform into CRM profiles
    return Array.from(customerMap.values()).map((c) => {
      const aov = c.totalOrders > 0 ? c.lifetimeSpend / c.totalOrders : 0;
      let loyaltyTier = 'NEW';
      if (c.lifetimeSpend >= 100 || c.totalOrders >= 5) {
        loyaltyTier = 'VIP';
      } else if (c.lifetimeSpend >= 40 || c.totalOrders >= 2) {
        loyaltyTier = 'REGULAR';
      }

      // Top 2 favorite items
      const sortedItems = Array.from(c.itemCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([name]) => name);

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        avatarUrl: c.avatarUrl,
        totalOrders: c.totalOrders,
        lifetimeSpend: Math.round(c.lifetimeSpend * 100) / 100,
        averageOrderValue: Math.round(aov * 100) / 100,
        lastOrderAt: c.lastOrderAt,
        loyaltyTier,
        favoriteItems: sortedItems,
      };
    });
  }

  async issueCourtesyCredit(
    customerId: string,
    input: { amount: number; reason: string; restaurantName?: string }
  ) {
    const user = await prisma.user.findUnique({
      where: { id: customerId },
      select: { id: true, name: true, email: true },
    });
    if (!user) throw new NotFoundError('Customer not found');

    const promoCode = `CARE${Math.floor(1000 + Math.random() * 9000)}`;

    // Create personalized coupon for customer
    const coupon = await couponService.createCoupon({
      code: promoCode,
      description: `Courtesy credit: ${input.reason}`,
      discountType: 'FIXED',
      discountValue: input.amount,
      minimumAmount: 0,
      usageLimit: 1,
      perUserLimit: 1,
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
      isActive: true,
    });

    // Send push notification to customer
    try {
      await notificationService.sendNotification(
        customerId,
        `🎁 $${input.amount.toFixed(2)} Courtesy Credit Added!`,
        `We've added coupon code ${promoCode} to your account. ${input.reason}`,
        NotificationTypeEnum.PROMOTION,
        { couponCode: promoCode, discount: input.amount }
      );
    } catch (err: any) {
      console.warn('⚠️ Courtesy notification error:', err.message);
    }

    return {
      success: true,
      promoCode,
      amount: input.amount,
      customerName: user.name,
      validUntil: coupon.endDate,
    };
  }
}

export const customerCrmService = new CustomerCrmService();
