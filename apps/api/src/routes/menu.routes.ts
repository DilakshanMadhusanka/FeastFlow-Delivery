import { Router } from 'express';
import { menuController } from '../controllers/menu.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { uploadSingleImage } from '../middleware/upload.middleware';
import { UserRoleEnum } from '@prisma/client';
import {
  createCategorySchema,
  updateCategorySchema,
  createFoodItemSchema,
  updateFoodItemSchema,
  toggleAvailabilitySchema,
  foodSearchQuerySchema,
} from '../validators/menu.validator';

const router = Router();

// ==========================================
// PUBLIC MENU & DISCOVERY ROUTES
// ==========================================

router.get('/restaurant/:restaurantId', menuController.getRestaurantMenu.bind(menuController));
router.get('/items/:id', menuController.getFoodItemDetails.bind(menuController));
router.get('/categories', menuController.getCategories.bind(menuController));
router.get(
  '/search',
  validateRequest({ query: foodSearchQuerySchema }),
  menuController.searchFood.bind(menuController)
);

// ==========================================
// PROTECTED MERCHANT ROUTES (RESTAURANT OWNER & ADMIN)
// ==========================================

router.get(
  '/admin/all',
  requireAuth,
  requireRole(UserRoleEnum.ADMIN),
  menuController.getAllRestaurantsMenu.bind(menuController)
);

router.post(
  '/categories',
  requireAuth,
  requireRole(UserRoleEnum.RESTAURANT_OWNER, UserRoleEnum.ADMIN),
  validateRequest({ body: createCategorySchema }),
  menuController.createCategory.bind(menuController)
);

router.put(
  '/categories/:id',
  requireAuth,
  requireRole(UserRoleEnum.RESTAURANT_OWNER, UserRoleEnum.ADMIN),
  validateRequest({ body: updateCategorySchema }),
  menuController.updateCategory.bind(menuController)
);

router.delete(
  '/categories/:id',
  requireAuth,
  requireRole(UserRoleEnum.RESTAURANT_OWNER, UserRoleEnum.ADMIN),
  menuController.deleteCategory.bind(menuController)
);

router.post(
  '/items',
  requireAuth,
  requireRole(UserRoleEnum.RESTAURANT_OWNER, UserRoleEnum.ADMIN),
  validateRequest({ body: createFoodItemSchema }),
  menuController.createFoodItem.bind(menuController)
);

router.put(
  '/items/:id',
  requireAuth,
  requireRole(UserRoleEnum.RESTAURANT_OWNER, UserRoleEnum.ADMIN),
  validateRequest({ body: updateFoodItemSchema }),
  menuController.updateFoodItem.bind(menuController)
);

router.patch(
  '/items/:id/availability',
  requireAuth,
  requireRole(UserRoleEnum.RESTAURANT_OWNER, UserRoleEnum.ADMIN),
  validateRequest({ body: toggleAvailabilitySchema }),
  menuController.toggleAvailability.bind(menuController)
);

router.delete(
  '/items/:id',
  requireAuth,
  requireRole(UserRoleEnum.RESTAURANT_OWNER, UserRoleEnum.ADMIN),
  menuController.deleteFoodItem.bind(menuController)
);

router.post(
  '/items/:id/image',
  requireAuth,
  requireRole(UserRoleEnum.RESTAURANT_OWNER, UserRoleEnum.ADMIN),
  uploadSingleImage,
  menuController.uploadFoodImage.bind(menuController)
);

export default router;
