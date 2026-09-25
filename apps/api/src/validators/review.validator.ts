import { z } from 'zod';

export const createReviewSchema = z.object({
  orderId: z.string().uuid('Valid order ID is required'),
  rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
  comment: z.string().trim().max(1000).optional(),
  foodItemId: z.string().uuid().optional(),
});

export const replyReviewSchema = z.object({
  reply: z.string().trim().min(1, 'Reply message cannot be empty').max(1000),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type ReplyReviewInput = z.infer<typeof replyReviewSchema>;
