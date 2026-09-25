import { Request, Response, NextFunction } from 'express';
import { couponService } from '../services/coupon.service';
import { sendSuccess } from '../utils/response';
import { HttpStatus } from '../constants';

export class CouponController {
  async getCoupons(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { activeOnly, search } = req.query as { activeOnly?: string; search?: string };
      const coupons = await couponService.getAllCoupons({
        activeOnly: activeOnly === 'true',
        search,
      });
      sendSuccess(res, coupons, 'Coupons retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getCouponById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const coupon = await couponService.getCouponById(id);
      sendSuccess(res, coupon, 'Coupon retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const coupon = await couponService.createCoupon(req.body);
      sendSuccess(res, coupon, 'Coupon created successfully', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async updateCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const coupon = await couponService.updateCoupon(id, req.body);
      sendSuccess(res, coupon, 'Coupon updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async toggleCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await couponService.toggleCoupon(id);
      sendSuccess(res, result, 'Coupon status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await couponService.deleteCoupon(id);
      sendSuccess(res, result, 'Coupon deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const couponController = new CouponController();
