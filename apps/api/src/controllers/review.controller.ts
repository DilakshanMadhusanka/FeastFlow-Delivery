import { Request, Response, NextFunction } from 'express';
import { reviewService } from '../services/review.service';
import { sendSuccess } from '../utils/response';
import { UnauthorizedError } from '../utils/errors';
import { HttpStatus } from '../constants';

export class ReviewController {
  async submitReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const review = await reviewService.submitReview(req.user.id, req.body);
      sendSuccess(res, review, 'Review submitted successfully', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async getRestaurantReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { page, limit } = req.query as { page?: string; limit?: string };
      const reviews = await reviewService.getRestaurantReviews(
        restaurantId,
        page ? parseInt(page, 10) : 1,
        limit ? parseInt(limit, 10) : 50
      );
      sendSuccess(res, reviews, 'Reviews retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getAllReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = req.query as { page?: string; limit?: string };
      const reviews = await reviewService.getRestaurantReviews(
        'all',
        page ? parseInt(page, 10) : 1,
        limit ? parseInt(limit, 10) : 50
      );
      sendSuccess(res, reviews, 'Platform reviews retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async replyToReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params;
      const { reply } = req.body;
      const result = await reviewService.replyToReview(
        id,
        { userId: req.user.id, roles: req.user.roles },
        reply
      );
      sendSuccess(res, result, 'Reply posted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const reviewController = new ReviewController();
