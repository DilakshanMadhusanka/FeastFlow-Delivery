import { z } from 'zod';

export const operatingHourItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'openTime must be HH:MM format (24-hour)'),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'closeTime must be HH:MM format (24-hour)'),
  isClosed: z.boolean().default(false),
});

export const createRestaurantSchema = z.object({
  name: z.string().trim().min(2, 'Restaurant name must be at least 2 characters').max(100),
  description: z.string().trim().max(500).optional(),
  phone: z.string().trim().regex(/^\+?[1-9]\d{1,14}$/, 'Phone number must follow E.164 international format'),
  email: z.string().trim().email().optional(),
  street: z.string().trim().min(3, 'Street address is required'),
  city: z.string().trim().min(2, 'City is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  deliveryRadiusKm: z.number().positive().max(50).default(10.0),
  minimumOrderAmount: z.number().nonnegative().default(0.0),
  deliveryFeeBase: z.number().nonnegative().default(2.5),
  estimatedDeliveryMin: z.number().int().min(5).max(120).default(25),
  estimatedDeliveryMax: z.number().int().min(10).max(180).default(45),
  categoryIds: z.array(z.string().uuid()).optional(),
  operatingHours: z.array(operatingHourItemSchema).length(7).optional(),
});

export const updateRestaurantSchema = createRestaurantSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const updateOperatingHoursSchema = z.object({
  hours: z.array(operatingHourItemSchema).length(7, 'Must provide operating hours for all 7 days of the week'),
});

export const restaurantSearchQuerySchema = z.object({
  query: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  maxDeliveryFee: z.coerce.number().nonnegative().optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  isOpen: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  sortBy: z.enum(['distance', 'rating', 'deliveryTime', 'deliveryFee', 'name']).default('rating'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
export type UpdateOperatingHoursInput = z.infer<typeof updateOperatingHoursSchema>;
export type RestaurantSearchQueryParams = z.infer<typeof restaurantSearchQuerySchema>;
