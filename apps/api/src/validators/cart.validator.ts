import { z } from 'zod';

export const addToCartSchema = z.object({
  foodItemId: z.string().uuid('Valid food item UUID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
  addonIds: z.array(z.string().uuid()).default([]),
  specialInstructions: z.string().trim().max(250).optional(),
  clearExistingIfDifferentRestaurant: z.boolean().default(false),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0, 'Quantity must be non-negative'),
  specialInstructions: z.string().trim().max(250).optional(),
});

export const applyCouponSchema = z.object({
  code: z.string().trim().min(1, 'Coupon code is required').toUpperCase(),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;
