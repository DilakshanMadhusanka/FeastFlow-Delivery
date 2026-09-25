import { couponRepository } from '../repositories/coupon.repository';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { CreateCouponInput, UpdateCouponInput } from '../validators/coupon.validator';

export class CouponService {
  async getAllCoupons(options?: { activeOnly?: boolean; search?: string }) {
    const coupons = await couponRepository.findAll(options);
    return coupons.map((c) => ({
      id: c.id,
      code: c.code,
      description: c.description,
      discountType: c.discountType,
      discountValue: Number(c.discountValue),
      minimumAmount: Number(c.minimumAmount),
      maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : null,
      usageLimit: c.usageLimit,
      perUserLimit: c.perUserLimit,
      usedCount: c.usedCount,
      usageCount: c._count?.usages || c.usedCount,
      orderCount: c._count?.orders || 0,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate.toISOString(),
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  async getCouponById(id: string) {
    const c = await couponRepository.findById(id);
    if (!c) throw new NotFoundError('Coupon not found');

    return {
      id: c.id,
      code: c.code,
      description: c.description,
      discountType: c.discountType,
      discountValue: Number(c.discountValue),
      minimumAmount: Number(c.minimumAmount),
      maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : null,
      usageLimit: c.usageLimit,
      perUserLimit: c.perUserLimit,
      usedCount: c.usedCount,
      usageCount: c._count?.usages || c.usedCount,
      orderCount: c._count?.orders || 0,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate.toISOString(),
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }

  async createCoupon(input: CreateCouponInput) {
    const existing = await couponRepository.findByCode(input.code);
    if (existing) {
      throw new BadRequestError(`Coupon code '${input.code}' already exists`);
    }

    const start = input.startDate ? new Date(input.startDate) : new Date();
    const end = new Date(input.endDate);
    if (end <= start) {
      throw new BadRequestError('Expiration date must be later than start date');
    }

    const c = await couponRepository.create(input);
    return {
      id: c.id,
      code: c.code,
      description: c.description,
      discountType: c.discountType,
      discountValue: Number(c.discountValue),
      minimumAmount: Number(c.minimumAmount),
      maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : null,
      usageLimit: c.usageLimit,
      perUserLimit: c.perUserLimit,
      usedCount: c.usedCount,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate.toISOString(),
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
    };
  }

  async updateCoupon(id: string, input: UpdateCouponInput) {
    const existing = await couponRepository.findById(id);
    if (!existing) throw new NotFoundError('Coupon not found');

    if (input.code && input.code !== existing.code) {
      const duplicate = await couponRepository.findByCode(input.code);
      if (duplicate) {
        throw new BadRequestError(`Coupon code '${input.code}' is already in use`);
      }
    }

    const updated = await couponRepository.update(id, input);
    return {
      id: updated.id,
      code: updated.code,
      description: updated.description,
      discountType: updated.discountType,
      discountValue: Number(updated.discountValue),
      minimumAmount: Number(updated.minimumAmount),
      maxDiscount: updated.maxDiscount ? Number(updated.maxDiscount) : null,
      usageLimit: updated.usageLimit,
      perUserLimit: updated.perUserLimit,
      usedCount: updated.usedCount,
      startDate: updated.startDate.toISOString(),
      endDate: updated.endDate.toISOString(),
      isActive: updated.isActive,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async toggleCoupon(id: string) {
    const updated = await couponRepository.toggleActive(id);
    if (!updated) throw new NotFoundError('Coupon not found');

    return {
      id: updated.id,
      code: updated.code,
      isActive: updated.isActive,
    };
  }

  async deleteCoupon(id: string) {
    const existing = await couponRepository.findById(id);
    if (!existing) throw new NotFoundError('Coupon not found');

    await couponRepository.delete(id);
    return { success: true, message: `Coupon '${existing.code}' removed successfully` };
  }
}

export const couponService = new CouponService();
