import { notificationRepository } from '../repositories/notification.repository';
import { pushService } from './push.service';
import { emitNotification } from '../sockets';
import { NotificationTypeEnum } from '@prisma/client';
import { NotificationDto, NotificationType, OrderStatus } from '@food-delivery/shared';
import { NotFoundError } from '../utils/errors';

export class NotificationService {
  /**
   * Persists a notification, emits real-time in-app socket message, and sends Expo push notification.
   */
  async sendNotification(
    userId: string,
    title: string,
    body: string,
    type: NotificationTypeEnum = NotificationTypeEnum.ORDER_UPDATE,
    data?: Record<string, any>
  ): Promise<NotificationDto> {
    // 1. Persist notification to database inbox
    const notification = await notificationRepository.createNotification({
      userId,
      title,
      body,
      type,
      data,
    });

    const dto: NotificationDto = {
      id: notification.id,
      userId: notification.userId,
      title: notification.title,
      body: notification.body,
      type: notification.type as NotificationType,
      data: notification.data as Record<string, any> | null,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
    };

    // 2. Real-time In-App Push via Socket.IO
    emitNotification(userId, dto);

    // 3. Mobile Hardware Push Notification via Expo Push Service
    try {
      const tokens = await notificationRepository.findUserDeviceTokens(userId);
      if (tokens.length > 0) {
        await pushService.sendPushNotification(tokens, title, body, data);
      }
    } catch (err: any) {
      console.warn('⚠️ Push notification dispatch error:', err.message);
    }

    return dto;
  }

  /**
   * Retrieves paginated inbox notifications for user.
   */
  async getUserNotifications(
    userId: string,
    page = 1,
    limit = 20,
    unreadOnly = false
  ) {
    const result = await notificationRepository.findUserNotifications(
      userId,
      page,
      limit,
      unreadOnly
    );

    return {
      items: result.items.map((n) => ({
        id: n.id,
        userId: n.userId,
        title: n.title,
        body: n.body,
        type: n.type as NotificationType,
        data: n.data as Record<string, any> | null,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * Gets unread notification count for badge counter.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return notificationRepository.countUnread(userId);
  }

  /**
   * Marks a specific notification as read.
   */
  async markAsRead(id: string, userId: string): Promise<{ success: boolean }> {
    const result = await notificationRepository.markAsRead(id, userId);
    if (result.count === 0) {
      throw new NotFoundError('Notification not found');
    }
    return { success: true };
  }

  /**
   * Marks all user's notifications as read.
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await notificationRepository.markAllAsRead(userId);
    return { count: result.count };
  }

  /**
   * Deletes a notification from user inbox.
   */
  async deleteNotification(id: string, userId: string): Promise<{ success: boolean }> {
    const result = await notificationRepository.deleteNotification(id, userId);
    if (result.count === 0) {
      throw new NotFoundError('Notification not found');
    }
    return { success: true };
  }

  /**
   * Registers or updates a device push token for a user.
   */
  async registerDeviceToken(
    userId: string,
    token: string,
    platform?: 'ios' | 'android' | 'web'
  ) {
    return notificationRepository.upsertDeviceToken(userId, token, platform);
  }

  /**
   * Deregisters a device push token on logout.
   */
  async unregisterDeviceToken(token: string) {
    return notificationRepository.removeDeviceToken(token);
  }

  // ==========================================
  // Lifecycle Notification Triggers
  // ==========================================

  /**
   * Dispatches alerts when an order is created.
   */
  async notifyOrderCreated(order: {
    id: string;
    orderNumber: string;
    customerId: string;
    restaurant: { name: string; ownerId: string };
    totalAmount: number | string;
  }) {
    // Alert customer
    await this.sendNotification(
      order.customerId,
      'Order Placed! 🍽️',
      `Your order #${order.orderNumber} at ${order.restaurant.name} has been placed and sent to the kitchen.`,
      NotificationTypeEnum.ORDER_UPDATE,
      { orderId: order.id, orderNumber: order.orderNumber }
    );

    // Alert restaurant owner
    await this.sendNotification(
      order.restaurant.ownerId,
      'New Incoming Order! 🔔',
      `Order #${order.orderNumber} for $${Number(order.totalAmount).toFixed(2)} received. Tap to confirm.`,
      NotificationTypeEnum.ORDER_UPDATE,
      { orderId: order.id, orderNumber: order.orderNumber }
    );
  }

  /**
   * Dispatches alerts when order status changes.
   */
  async notifyOrderStatusChanged(
    customerId: string,
    restaurantOwnerId: string,
    order: { id: string; orderNumber: string; restaurantName: string },
    newStatus: OrderStatus,
    notes?: string
  ) {
    let customerTitle = '';
    let customerBody = '';

    switch (newStatus) {
      case OrderStatus.RESTAURANT_ACCEPTED:
        customerTitle = 'Order Confirmed! ✅';
        customerBody = `${order.restaurantName} accepted your order #${order.orderNumber} and queued it for preparation.`;
        break;
      case OrderStatus.PREPARING:
        customerTitle = 'Kitchen is Cooking 🍳';
        customerBody = `The kitchen has started preparing your fresh meal for #${order.orderNumber}.`;
        break;
      case OrderStatus.READY_FOR_PICKUP:
        customerTitle = 'Order Packaged 📦';
        customerBody = `Your food is boxed and waiting for the courier to pick it up!`;
        break;
      case OrderStatus.DRIVER_ASSIGNED:
        customerTitle = 'Courier Assigned 🚴';
        customerBody = `A courier has been assigned and is heading to ${order.restaurantName}.`;
        break;
      case OrderStatus.PICKED_UP:
        customerTitle = 'Food Picked Up! 🛵';
        customerBody = `Your courier picked up your order from ${order.restaurantName} and is en route!`;
        break;
      case OrderStatus.ON_THE_WAY:
        customerTitle = 'Courier Arriving Soon 📍';
        customerBody = `Your order #${order.orderNumber} is right around the corner!`;
        break;
      case OrderStatus.DELIVERED:
        customerTitle = 'Order Delivered! 🎉';
        customerBody = `Your order from ${order.restaurantName} has arrived. Enjoy your meal!`;
        break;
      case OrderStatus.CANCELLED:
        customerTitle = 'Order Cancelled ❌';
        customerBody = `Order #${order.orderNumber} was cancelled. ${notes ? `Reason: ${notes}` : ''}`;
        break;
      case OrderStatus.REJECTED:
        customerTitle = 'Order Declined ❌';
        customerBody = `${order.restaurantName} was unable to accept order #${order.orderNumber}.`;
        break;
      default:
        return;
    }

    if (customerTitle && customerBody) {
      await this.sendNotification(
        customerId,
        customerTitle,
        customerBody,
        NotificationTypeEnum.ORDER_UPDATE,
        { orderId: order.id, orderNumber: order.orderNumber, status: newStatus }
      );
    }
  }

  /**
   * Dispatches alerts to courier when assigned.
   */
  async notifyCourierAssigned(
    courierUserId: string,
    order: { id: string; orderNumber: string; restaurantName: string }
  ) {
    await this.sendNotification(
      courierUserId,
      'Delivery Assigned! 🚀',
      `You have been assigned order #${order.orderNumber} at ${order.restaurantName}. Tap to start route.`,
      NotificationTypeEnum.DELIVERY_ALERT,
      { orderId: order.id, orderNumber: order.orderNumber }
    );
  }
}

export const notificationService = new NotificationService();
