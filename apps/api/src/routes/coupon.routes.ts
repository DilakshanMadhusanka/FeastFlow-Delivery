import { Router } from 'express';
import { couponController } from '../controllers/coupon.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { createCouponSchema, updateCouponSchema } from '../validators/coupon.validator';
import { UserRoleEnum } from '@prisma/client';

const router = Router();

// Viewing coupons requires authentication
router.use(requireAuth);

router.get('/', couponController.getCoupons.bind(couponController));
router.get('/:id', couponController.getCouponById.bind(couponController));

// Management operations require ADMIN or RESTAURANT_OWNER role
const managerRoles = [UserRoleEnum.ADMIN, UserRoleEnum.RESTAURANT_OWNER];

router.post(
  '/',
  requireRole(managerRoles),
  validateRequest({ body: createCouponSchema }),
  couponController.createCoupon.bind(couponController)
);

router.patch(
  '/:id',
  requireRole(managerRoles),
  validateRequest({ body: updateCouponSchema }),
  couponController.updateCoupon.bind(couponController)
);

router.patch(
  '/:id/toggle',
  requireRole(managerRoles),
  couponController.toggleCoupon.bind(couponController)
);

router.delete(
  '/:id',
  requireRole(managerRoles),
  couponController.deleteCoupon.bind(couponController)
);

export default router;
