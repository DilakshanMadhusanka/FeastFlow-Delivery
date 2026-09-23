import { z } from 'zod';
import { NotificationTypeEnum } from '@prisma/client';

export const registerTokenSchema = z.object({
  token: z.string().min(5, 'Push token must be at least 5 characters'),
  platform: z.enum(['ios', 'android', 'web']).optional(),
});

export const getNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  unreadOnly: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

export const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1).max(150),
  body: z.string().min(1).max(500),
  type: z.nativeEnum(NotificationTypeEnum).default(NotificationTypeEnum.ORDER_UPDATE),
  data: z.record(z.any()).optional(),
});

export type RegisterTokenInput = z.infer<typeof registerTokenSchema>;
export type GetNotificationsQuery = z.infer<typeof getNotificationsQuerySchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
