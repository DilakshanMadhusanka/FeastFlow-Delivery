import { Router } from 'express';
import { restaurantController } from '../controllers/restaurant.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { uploadSingleImage } from '../middleware/upload.middleware';
import { UserRoleEnum } from '@prisma/client';
import {
  createRestaurantSchema,
  updateRestaurantSchema,
  updateOperatingHoursSchema,
  restaurantSearchQuerySchema,
} from '../validators/restaurant.validator';

const router = Router();

// ==========================================
// PUBLIC DISCOVERY ROUTES
// ==========================================

router.get(
  '/',
  validateRequest({ query: restaurantSearchQuerySchema }),
  restaurantController.searchRestaurants.bind(restaurantController)
);

router.get('/slug/:slug', restaurantController.getRestaurantBySlug.bind(restaurantController));
router.get('/:id', restaurantController.getRestaurantById.bind(restaurantController));

// ==========================================
// PROTECTED MERCHANT ROUTES (RESTAURANT OWNER & ADMIN)
// ==========================================

router.get(
  '/owner/my-restaurants',
  requireAuth,
  requireRole(UserRoleEnum.RESTAURANT_OWNER, UserRoleEnum.ADMIN),
  restaurantController.getMyRestaurants.bind(restaurantController)
);

router.post(
  '/',
  requireAuth,
  requireRole(UserRoleEnum.RESTAURANT_OWNER, UserRoleEnum.ADMIN),
  validateRequest({ body: createRestaurantSchema }),
  restaurantController.createRestaurant.bind(restaurantController)
);

router.put(
  '/:id',
  requireAuth,
  requireRole(UserRoleEnum.RESTAURANT_OWNER, UserRoleEnum.ADMIN),
  validateRequest({ body: updateRestaurantSchema }),
  restaurantController.updateRestaurant.bind(restaurantController)
);

router.put(
  '/:id/hours',
  requireAuth,
  requireRole(UserRoleEnum.RESTAURANT_OWNER, UserRoleEnum.ADMIN),
  validateRequest({ body: updateOperatingHoursSchema }),
  restaurantController.updateHours.bind(restaurantController)
);

router.post(
  '/:id/logo',
  requireAuth,
  requireRole(UserRoleEnum.RESTAURANT_OWNER, UserRoleEnum.ADMIN),
  uploadSingleImage,
  restaurantController.uploadLogo.bind(restaurantController)
);

router.post(
  '/:id/banner',
  requireAuth,
  requireRole(UserRoleEnum.RESTAURANT_OWNER, UserRoleEnum.ADMIN),
  uploadSingleImage,
  restaurantController.uploadBanner.bind(restaurantController)
);

export default router;
