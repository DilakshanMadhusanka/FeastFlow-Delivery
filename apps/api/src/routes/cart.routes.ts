import { Router } from 'express';
import { cartController } from '../controllers/cart.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  addToCartSchema,
  updateCartItemSchema,
  applyCouponSchema,
} from '../validators/cart.validator';

const router = Router();

// All cart endpoints require user authentication
router.use(requireAuth);

router.get('/', cartController.getCart.bind(cartController));
router.post('/items', validateRequest({ body: addToCartSchema }), cartController.addItem.bind(cartController));
router.put('/items/:id', validateRequest({ body: updateCartItemSchema }), cartController.updateItem.bind(cartController));
router.delete('/items/:id', cartController.removeItem.bind(cartController));
router.delete('/', cartController.clearCart.bind(cartController));
router.post('/coupon', validateRequest({ body: applyCouponSchema }), cartController.applyCoupon.bind(cartController));

export default router;
