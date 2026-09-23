import { Request, Response, NextFunction } from 'express';
import { cartService } from '../services/cart.service';
import { sendSuccess } from '../utils/response';
import { UnauthorizedError } from '../utils/errors';

export class CartController {
  async getCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const couponCode = req.query.couponCode as string | undefined;
      const cart = await cartService.getCart(req.user.id, couponCode);
      sendSuccess(res, cart, 'Cart retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async addItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const couponCode = req.query.couponCode as string | undefined;
      const cart = await cartService.addItem(req.user.id, req.body, couponCode);
      sendSuccess(res, cart, 'Item added to cart successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params;
      const couponCode = req.query.couponCode as string | undefined;
      const cart = await cartService.updateItem(req.user.id, id, req.body, couponCode);
      sendSuccess(res, cart, 'Cart updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async removeItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params;
      const couponCode = req.query.couponCode as string | undefined;
      const cart = await cartService.removeItem(req.user.id, id, couponCode);
      sendSuccess(res, cart, 'Item removed from cart');
    } catch (error) {
      next(error);
    }
  }

  async clearCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const cart = await cartService.clearCart(req.user.id);
      sendSuccess(res, cart, 'Cart cleared successfully');
    } catch (error) {
      next(error);
    }
  }

  async applyCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { code } = req.body;
      const cart = await cartService.applyCoupon(req.user.id, code);
      sendSuccess(res, cart, `Coupon "${code}" applied successfully`);
    } catch (error) {
      next(error);
    }
  }
}

export const cartController = new CartController();
