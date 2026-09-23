import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { sendSuccess } from '../utils/response';
import { UnauthorizedError } from '../utils/errors';

export class PaymentController {
  async createIntent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const result = await paymentService.createPaymentIntent({
        userId: req.user.id,
        ...req.body,
      });
      sendSuccess(res, result, 'Payment intent created successfully');
    } catch (error) {
      next(error);
    }
  }

  async confirmPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { paymentIntentId, orderId } = req.body;
      const result = await paymentService.confirmPayment(paymentIntentId, orderId);
      sendSuccess(res, result, 'Payment verified and confirmed');
    } catch (error) {
      next(error);
    }
  }

  async webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await paymentService.handleWebhook(req.body);
      sendSuccess(res, result, 'Webhook processed successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();
