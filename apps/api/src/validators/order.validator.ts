import { z } from 'zod';
import { OrderStatusEnum, PaymentMethodEnum } from '@prisma/client';

export const createOrderSchema = z.object({
  deliveryAddressId: z.string().uuid('Valid delivery address ID is required'),
  paymentMethod: z.nativeEnum(PaymentMethodEnum).default(PaymentMethodEnum.COD),
  tipAmount: z.coerce.number().min(0, 'Tip amount cannot be negative').default(0),
  couponCode: z.string().trim().max(50).optional(),
  specialInstructions: z.string().trim().max(500).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatusEnum),
  notes: z.string().trim().max(300).optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(3, 'Cancellation reason must be at least 3 characters').max(300),
});

export const orderQuerySchema = z.object({
  status: z.nativeEnum(OrderStatusEnum).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  restaurantId: z.string().uuid().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type OrderQueryInput = z.infer<typeof orderQuerySchema>;
