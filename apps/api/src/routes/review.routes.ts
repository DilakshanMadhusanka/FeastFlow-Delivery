import { Router } from 'express';
import { reviewController } from '../controllers/review.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { createReviewSchema, replyReviewSchema } from '../validators/review.validator';
import { UserRoleEnum } from '@prisma/client';

const router = Router();

// Public / auth endpoints
router.get('/restaurant/:restaurantId', reviewController.getRestaurantReviews.bind(reviewController));

// Protected operations
router.use(requireAuth);

router.post(
  '/',
  validateRequest({ body: createReviewSchema }),
  reviewController.submitReview.bind(reviewController)
);

router.get('/', reviewController.getAllReviews.bind(reviewController));

router.post(
  '/:id/reply',
  requireRole([UserRoleEnum.ADMIN, UserRoleEnum.RESTAURANT_OWNER]),
  validateRequest({ body: replyReviewSchema }),
  reviewController.replyToReview.bind(reviewController)
);

export default router;
