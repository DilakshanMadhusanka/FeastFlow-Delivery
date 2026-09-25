import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
  orderQuerySchema,
} from '../validators/order.validator';
import { UserRoleEnum } from '@prisma/client';

const router = Router();

// All order operations require authenticated user
router.use(requireAuth);

router.post(
  '/',
  validateRequest({ body: createOrderSchema }),
  orderController.createOrder.bind(orderController)
);

router.get(
  '/',
  validateRequest({ query: orderQuerySchema }),
  orderController.getMyOrders.bind(orderController)
);

router.get(
  '/admin/all',
  requireRole(UserRoleEnum.ADMIN),
  validateRequest({ query: orderQuerySchema }),
  orderController.getAllOrders.bind(orderController)
);

router.get(
  '/restaurant/:restaurantId',
  requireRole(UserRoleEnum.RESTAURANT_OWNER, UserRoleEnum.ADMIN),
  validateRequest({ query: orderQuerySchema }),
  orderController.getRestaurantOrders.bind(orderController)
);

router.get(
  '/:id',
  orderController.getOrderById.bind(orderController)
);

router.patch(
  '/:id/status',
  validateRequest({ body: updateOrderStatusSchema }),
  orderController.updateStatus.bind(orderController)
);

router.post(
  '/:id/cancel',
  validateRequest({ body: cancelOrderSchema }),
  orderController.cancelOrder.bind(orderController)
);

export default router;
