import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import {
  getNotificationsQuerySchema,
  registerTokenSchema,
} from '../validators/notification.validator';

export class NotificationController {
  /**
   * Retrieves paginated inbox notifications for the authenticated user.
   */
  async getUserNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = getNotificationsQuerySchema.parse(req.query);
      const result = await notificationService.getUserNotifications(
        req.user!.id,
        query.page,
        query.limit,
        query.unreadOnly
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Returns unread notifications count for badge display.
   */
  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await notificationService.getUnreadCount(req.user!.id);
      res.status(200).json({
        success: true,
        data: { count },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Marks a single notification as read.
   */
  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await notificationService.markAsRead(req.params.id, req.user!.id);
      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Marks all notifications as read for current user.
   */
  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await notificationService.markAllAsRead(req.user!.id);
      res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Deletes a notification from user's inbox.
   */
  async deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await notificationService.deleteNotification(req.params.id, req.user!.id);
      res.status(200).json({
        success: true,
        message: 'Notification deleted',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Registers or updates an Expo / Web push device token.
   */
  async registerDeviceToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = registerTokenSchema.parse(req.body);
      await notificationService.registerDeviceToken(
        req.user!.id,
        input.token,
        input.platform
      );

      res.status(200).json({
        success: true,
        message: 'Device push token registered successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Deregisters a device push token upon logout.
   */
  async unregisterDeviceToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await notificationService.unregisterDeviceToken(req.params.token);
      res.status(200).json({
        success: true,
        message: 'Device push token deregistered',
      });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationController = new NotificationController();
