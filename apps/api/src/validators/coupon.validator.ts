import { z } from 'zod';
import { CouponDiscountTypeEnum } from '@prisma/client';

export const createCouponSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, 'Code must be at least 3 characters')
    .max(30)
    .toUpperCase(),
  description: z.string().trim().max(255).optional(),
  discountType: z.nativeEnum(CouponDiscountTypeEnum).default(CouponDiscountTypeEnum.PERCENTAGE),
  discountValue: z.number().positive('Discount value must be greater than 0'),
  minimumAmount: z.number().min(0, 'Minimum spend cannot be negative').default(0),
  maxDiscount: z.number().positive().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  perUserLimit: z.number().int().positive().default(1),
  startDate: z.string().datetime().or(z.date()).optional(),
  endDate: z.string().datetime().or(z.date()),
  isActive: z.boolean().default(true),
});

export const updateCouponSchema = createCouponSchema.partial();

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
