import { Request, Response, NextFunction } from 'express';
import { orderService } from '../services/order.service';
import { sendSuccess } from '../utils/response';
import { UnauthorizedError } from '../utils/errors';
import { HttpStatus } from '../constants';
import { OrderStatusEnum } from '@prisma/client';

export class OrderController {
  async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const order = await orderService.createOrder(req.user.id, req.body);
      sendSuccess(res, order, 'Order placed successfully', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  }

  async getMyOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { page, limit, status } = req.query as {
        page?: string;
        limit?: string;
        status?: OrderStatusEnum;
      };

      const result = await orderService.getCustomerOrders(req.user.id, {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
        status,
      });

      sendSuccess(res, result, 'Orders retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const order = await orderService.getOrderById(req.params.id, {
        userId: req.user.id,
        roles: req.user.roles,
      });
      sendSuccess(res, order, 'Order details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getRestaurantOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { page, limit, status } = req.query as {
        page?: string;
        limit?: string;
        status?: OrderStatusEnum;
      };

      const result = await orderService.getRestaurantOrders(
        req.params.restaurantId,
        {
          userId: req.user.id,
          roles: req.user.roles,
        },
        {
          page: page ? parseInt(page, 10) : 1,
          limit: limit ? parseInt(limit, 10) : 10,
          status,
        }
      );

      sendSuccess(res, result, 'Restaurant orders retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { status, notes } = req.body;
      const order = await orderService.updateOrderStatus(
        req.params.id,
        {
          userId: req.user.id,
          roles: req.user.roles,
        },
        status,
        notes
      );
      sendSuccess(res, order, 'Order status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async cancelOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { reason } = req.body;
      const order = await orderService.cancelOrder(
        req.params.id,
        {
          userId: req.user.id,
          roles: req.user.roles,
        },
        reason
      );
      sendSuccess(res, order, 'Order cancelled successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const orderController = new OrderController();
