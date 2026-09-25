import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';
import { CreateCouponInput, UpdateCouponInput } from '../validators/coupon.validator';

export class CouponRepository {
  async findAll(options?: { activeOnly?: boolean; search?: string }) {
    const where: Prisma.CouponWhereInput = {};

    if (options?.activeOnly) {
      where.isActive = true;
      where.endDate = { gte: new Date() };
    }

    if (options?.search) {
      where.OR = [
        { code: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    return prisma.coupon.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { usages: true, orders: true },
        },
      },
    });
  }

  async findById(id: string) {
    return prisma.coupon.findUnique({
      where: { id },
      include: {
        _count: {
          select: { usages: true, orders: true },
        },
      },
    });
  }

  async findByCode(code: string) {
    return prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        _count: {
          select: { usages: true },
        },
      },
    });
  }

  async create(input: CreateCouponInput) {
    return prisma.coupon.create({
      data: {
        code: input.code.toUpperCase(),
        description: input.description,
        discountType: input.discountType,
        discountValue: new Prisma.Decimal(input.discountValue.toFixed(2)),
        minimumAmount: new Prisma.Decimal((input.minimumAmount || 0).toFixed(2)),
        maxDiscount: input.maxDiscount
          ? new Prisma.Decimal(input.maxDiscount.toFixed(2))
          : null,
        usageLimit: input.usageLimit || null,
        perUserLimit: input.perUserLimit || 1,
        startDate: input.startDate ? new Date(input.startDate) : new Date(),
        endDate: new Date(input.endDate),
        isActive: input.isActive ?? true,
      },
    });
  }

  async update(id: string, input: UpdateCouponInput) {
    const data: Prisma.CouponUpdateInput = {};

    if (input.code) data.code = input.code.toUpperCase();
    if (input.description !== undefined) data.description = input.description;
    if (input.discountType) data.discountType = input.discountType;
    if (input.discountValue !== undefined)
      data.discountValue = new Prisma.Decimal(input.discountValue.toFixed(2));
    if (input.minimumAmount !== undefined)
      data.minimumAmount = new Prisma.Decimal(input.minimumAmount.toFixed(2));
    if (input.maxDiscount !== undefined)
      data.maxDiscount = input.maxDiscount
        ? new Prisma.Decimal(input.maxDiscount.toFixed(2))
        : null;
    if (input.usageLimit !== undefined) data.usageLimit = input.usageLimit;
    if (input.perUserLimit !== undefined) data.perUserLimit = input.perUserLimit;
    if (input.startDate) data.startDate = new Date(input.startDate);
    if (input.endDate) data.endDate = new Date(input.endDate);
    if (input.isActive !== undefined) data.isActive = input.isActive;

    return prisma.coupon.update({
      where: { id },
      data,
    });
  }

  async toggleActive(id: string) {
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) return null;

    return prisma.coupon.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
  }

  async delete(id: string) {
    return prisma.coupon.delete({
      where: { id },
    });
  }
}

export const couponRepository = new CouponRepository();
