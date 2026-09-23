import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { createPaymentIntentSchema, confirmPaymentSchema } from '../validators/payment.validator';

const router = Router();

// Webhook endpoint (open to payment gateway)
router.post('/webhook', paymentController.webhook.bind(paymentController));

// Protected payment actions
router.post(
  '/intent',
  requireAuth,
  validateRequest({ body: createPaymentIntentSchema }),
  paymentController.createIntent.bind(paymentController)
);

router.post(
  '/confirm',
  requireAuth,
  validateRequest({ body: confirmPaymentSchema }),
  paymentController.confirmPayment.bind(paymentController)
);

export default router;
