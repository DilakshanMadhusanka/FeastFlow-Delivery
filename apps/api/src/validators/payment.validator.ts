import { z } from 'zod';
import { PaymentMethodEnum } from '@prisma/client';

export const createPaymentIntentSchema = z.object({
  amount: z.number().positive('Payment amount must be greater than zero'),
  currency: z.string().trim().default('usd'),
  paymentMethod: z.nativeEnum(PaymentMethodEnum).default(PaymentMethodEnum.CARD),
  orderId: z.string().uuid().optional(),
});

export const confirmPaymentSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
  orderId: z.string().uuid().optional(),
});

export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;
