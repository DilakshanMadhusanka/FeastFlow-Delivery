import { reviewRepository } from '../repositories/review.repository';
import { prisma } from '../config/database';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { CreateReviewInput } from '../validators/review.validator';
import { notificationService } from './notification.service';
import { OrderStatusEnum, UserRoleEnum, NotificationTypeEnum } from '@prisma/client';

export class ReviewService {
  async submitReview(userId: string, input: CreateReviewInput) {
    // 1. Fetch order
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: {
        restaurant: { select: { id: true, name: true, ownerId: true } },
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.customerId !== userId) {
      throw new ForbiddenError('You can only review your own orders');
    }

    if (order.status !== OrderStatusEnum.DELIVERED) {
      throw new BadRequestError('Only delivered orders can be reviewed');
    }

    // 2. Check duplicate review
    const existing = await reviewRepository.findExistingOrderReview(userId, input.orderId);
    if (existing) {
      throw new BadRequestError('You have already submitted a review for this order');
    }

    // 3. Persist review
    const review = await reviewRepository.create(userId, order.restaurantId, input);

    // 4. Send notification to restaurant owner
    try {
      await notificationService.sendNotification(
        order.restaurant.ownerId,
        `New ${input.rating}★ Review Received!`,
        `A customer rated their experience with ${order.restaurant.name}. Check your reviews board.`,
        NotificationTypeEnum.ORDER_UPDATE,
        { reviewId: review.id, orderId: order.id, rating: input.rating }
      );
    } catch (err: any) {
      console.warn('⚠️ Review notification error:', err.message);
    }

    return {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      restaurantName: order.restaurant.name,
      orderNumber: order.orderNumber,
    };
  }

  async getRestaurantReviews(restaurantId: string, page = 1, limit = 50) {
    const result = await reviewRepository.findByRestaurant(restaurantId, page, limit);

    return {
      items: result.items.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        reply: r.reply,
        repliedAt: r.repliedAt?.toISOString() || null,
        createdAt: r.createdAt.toISOString(),
        user: {
          id: r.user.id,
          name: r.user.name,
          avatarUrl: r.user.avatarUrl,
        },
        restaurant: {
          id: r.restaurant.id,
          name: r.restaurant.name,
          city: r.restaurant.city,
        },
        order: {
          id: r.order.id,
          orderNumber: r.order.orderNumber,
          placedAt: r.order.placedAt.toISOString(),
        },
        foodItem: r.foodItem ? { id: r.foodItem.id, name: r.foodItem.name } : null,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  async replyToReview(
    reviewId: string,
    requestingUser: { userId: string; roles: UserRoleEnum[] },
    replyText: string
  ) {
    const review = await reviewRepository.findById(reviewId);
    if (!review) {
      throw new NotFoundError('Review not found');
    }

    const isAdmin = requestingUser.roles.includes(UserRoleEnum.ADMIN);
    if (!isAdmin && review.restaurant.ownerId !== requestingUser.userId) {
      throw new ForbiddenError('Only restaurant owners or administrators can reply to reviews');
    }

    const updated = await reviewRepository.reply(reviewId, replyText);

    // Notify customer that merchant responded
    try {
      await notificationService.sendNotification(
        review.userId,
        `${review.restaurant.name} replied to your review!`,
        `"${replyText.length > 80 ? replyText.slice(0, 80) + '...' : replyText}"`,
        NotificationTypeEnum.ORDER_UPDATE,
        { reviewId: review.id, orderId: review.order.id }
      );
    } catch (err: any) {
      console.warn('⚠️ Review reply notification error:', err.message);
    }

    return {
      id: updated.id,
      reply: updated.reply,
      repliedAt: updated.repliedAt?.toISOString() || null,
    };
  }
}

export const reviewService = new ReviewService();
