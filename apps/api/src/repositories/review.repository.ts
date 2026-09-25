import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';
import { CreateReviewInput } from '../validators/review.validator';

export class ReviewRepository {
  async findExistingOrderReview(userId: string, orderId: string) {
    return prisma.review.findFirst({
      where: { userId, orderId },
    });
  }

  async findById(id: string) {
    return prisma.review.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        restaurant: { select: { id: true, name: true, ownerId: true } },
        order: { select: { id: true, orderNumber: true, placedAt: true } },
      },
    });
  }

  async create(userId: string, restaurantId: string, input: CreateReviewInput) {
    return prisma.$transaction(async (tx) => {
      // 1. Create review
      const review = await tx.review.create({
        data: {
          userId,
          restaurantId,
          orderId: input.orderId,
          foodItemId: input.foodItemId || null,
          rating: input.rating,
          comment: input.comment || null,
        },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
          restaurant: { select: { id: true, name: true } },
          order: { select: { id: true, orderNumber: true } },
        },
      });

      // 2. Re-calculate restaurant rating average and count
      const aggregations = await tx.review.aggregate({
        where: { restaurantId, deletedAt: null },
        _avg: { rating: true },
        _count: { rating: true },
      });

      const avg = aggregations._avg.rating || 0;
      const count = aggregations._count.rating || 0;

      await tx.restaurant.update({
        where: { id: restaurantId },
        data: {
          ratingAverage: new Prisma.Decimal(avg.toFixed(2)),
          ratingCount: count,
        },
      });

      return review;
    });
  }

  async findByRestaurant(restaurantId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where: Prisma.ReviewWhereInput = {
      deletedAt: null,
      ...(restaurantId !== 'all' ? { restaurantId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
          restaurant: { select: { id: true, name: true, city: true } },
          order: { select: { id: true, orderNumber: true, placedAt: true } },
          foodItem: { select: { id: true, name: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async reply(reviewId: string, replyText: string) {
    return prisma.review.update({
      where: { id: reviewId },
      data: {
        reply: replyText,
        repliedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true } },
        restaurant: { select: { id: true, name: true } },
      },
    });
  }
}

export const reviewRepository = new ReviewRepository();
