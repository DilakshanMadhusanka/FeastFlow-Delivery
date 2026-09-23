import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  registerTokenSchema,
  getNotificationsQuerySchema,
  createNotificationSchema,
} from '../src/validators/notification.validator';
import { pushService } from '../src/services/push.service';
import { notificationService } from '../src/services/notification.service';
import { notificationRepository } from '../src/repositories/notification.repository';
import { NotificationTypeEnum } from '@prisma/client';
import { OrderStatus } from '@food-delivery/shared';

describe('Push Notifications & In-App Alerts Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Validation & Token Schemas', () => {
    it('should validate push token registration payloads', () => {
      const valid = {
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: 'android' as const,
      };
      expect(registerTokenSchema.safeParse(valid).success).toBe(true);

      const webValid = {
        token: 'fcm-browser-token-1234567890',
        platform: 'web' as const,
      };
      expect(registerTokenSchema.safeParse(webValid).success).toBe(true);

      const invalidShort = {
        token: 'abc',
      };
      expect(registerTokenSchema.safeParse(invalidShort).success).toBe(false);
    });

    it('should validate notification query parameters with coercion', () => {
      const validQuery = {
        page: '2',
        limit: '15',
        unreadOnly: 'true',
      };
      const parsed = getNotificationsQuerySchema.safeParse(validQuery);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.page).toBe(2);
        expect(parsed.data.limit).toBe(15);
        expect(parsed.data.unreadOnly).toBe(true);
      }
    });

    it('should validate create notification schema', () => {
      const valid = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Order Delivered!',
        body: 'Your food has arrived.',
        type: NotificationTypeEnum.ORDER_UPDATE,
        data: { orderId: 'ord-123' },
      };
      expect(createNotificationSchema.safeParse(valid).success).toBe(true);

      const missingTitle = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        title: '',
        body: 'Valid body',
      };
      expect(createNotificationSchema.safeParse(missingTitle).success).toBe(false);
    });
  });

  describe('Expo Push Token Evaluator', () => {
    it('should accurately recognize valid Expo push tokens', () => {
      expect(
        pushService.isValidExpoPushToken('ExponentPushToken[7Bq9qV_G1234567890abcdef]')
      ).toBe(true);
      expect(
        pushService.isValidExpoPushToken('ExpoPushToken[abcdef1234567890_ghijkl]')
      ).toBe(true);
      expect(
        pushService.isValidExpoPushToken('abcdef1234567890_ghijklmn_opqrstuvwxyz')
      ).toBe(true);
    });

    it('should reject invalid or malformed push tokens', () => {
      expect(pushService.isValidExpoPushToken('')).toBe(false);
      expect(pushService.isValidExpoPushToken('short-token')).toBe(false);
      expect(pushService.isValidExpoPushToken(null as any)).toBe(false);
    });
  });

  describe('Notification Service Logic', () => {
    it('should create notification, persist in database, and return DTO', async () => {
      const mockCreated = {
        id: 'notif-1',
        userId: 'user-1',
        title: 'Fresh Meal Ready',
        body: 'Your pizza is ready for pickup.',
        type: NotificationTypeEnum.ORDER_UPDATE,
        data: { orderId: 'ord-1' },
        isRead: false,
        createdAt: new Date('2026-09-23T00:00:00.000Z'),
      };

      vi.spyOn(notificationRepository, 'createNotification').mockResolvedValue(mockCreated as any);
      vi.spyOn(notificationRepository, 'findUserDeviceTokens').mockResolvedValue([]);

      const result = await notificationService.sendNotification(
        'user-1',
        'Fresh Meal Ready',
        'Your pizza is ready for pickup.',
        NotificationTypeEnum.ORDER_UPDATE,
        { orderId: 'ord-1' }
      );

      expect(result.id).toBe('notif-1');
      expect(result.userId).toBe('user-1');
      expect(result.title).toBe('Fresh Meal Ready');
      expect(result.isRead).toBe(false);
      expect(result.createdAt).toBe('2026-09-23T00:00:00.000Z');
    });

    it('should handle unread count retrieval', async () => {
      vi.spyOn(notificationRepository, 'countUnread').mockResolvedValue(5);

      const count = await notificationService.getUnreadCount('user-1');
      expect(count).toBe(5);
    });

    it('should mark single notification as read', async () => {
      vi.spyOn(notificationRepository, 'markAsRead').mockResolvedValue({ count: 1 } as any);

      const res = await notificationService.markAsRead('notif-1', 'user-1');
      expect(res.success).toBe(true);
    });

    it('should mark all notifications as read', async () => {
      vi.spyOn(notificationRepository, 'markAllAsRead').mockResolvedValue({ count: 4 } as any);

      const res = await notificationService.markAllAsRead('user-1');
      expect(res.count).toBe(4);
    });

    it('should register and unregister device push tokens', async () => {
      const upsertSpy = vi
        .spyOn(notificationRepository, 'upsertDeviceToken')
        .mockResolvedValue({} as any);
      const removeSpy = vi
        .spyOn(notificationRepository, 'removeDeviceToken')
        .mockResolvedValue({} as any);

      await notificationService.registerDeviceToken('user-1', 'ExpoPushToken[xyz]', 'ios');
      expect(upsertSpy).toHaveBeenCalledWith('user-1', 'ExpoPushToken[xyz]', 'ios');

      await notificationService.unregisterDeviceToken('ExpoPushToken[xyz]');
      expect(removeSpy).toHaveBeenCalledWith('ExpoPushToken[xyz]');
    });
  });

  describe('Order Lifecycle Trigger Formatting', () => {
    it('should construct correct notifications for order creation', async () => {
      const sendSpy = vi.spyOn(notificationService, 'sendNotification').mockResolvedValue({} as any);

      await notificationService.notifyOrderCreated({
        id: 'ord-99',
        orderNumber: 'FF-9999',
        customerId: 'cust-1',
        restaurant: { name: 'Burger Hub', ownerId: 'owner-1' },
        totalAmount: 24.5,
      });

      // Customer notification
      expect(sendSpy).toHaveBeenCalledWith(
        'cust-1',
        'Order Placed! 🍽️',
        expect.stringContaining('Burger Hub'),
        NotificationTypeEnum.ORDER_UPDATE,
        expect.objectContaining({ orderId: 'ord-99' })
      );

      // Restaurant owner notification
      expect(sendSpy).toHaveBeenCalledWith(
        'owner-1',
        'New Incoming Order! 🔔',
        expect.stringContaining('FF-9999'),
        NotificationTypeEnum.ORDER_UPDATE,
        expect.objectContaining({ orderId: 'ord-99' })
      );
    });

    it('should format appropriate notifications for all delivery lifecycle status changes', async () => {
      const sendSpy = vi.spyOn(notificationService, 'sendNotification').mockResolvedValue({} as any);

      const statusesToTest = [
        { status: OrderStatus.RESTAURANT_ACCEPTED, expectedSnippet: 'accepted your order' },
        { status: OrderStatus.PREPARING, expectedSnippet: 'started preparing' },
        { status: OrderStatus.READY_FOR_PICKUP, expectedSnippet: 'boxed and waiting' },
        { status: OrderStatus.DRIVER_ASSIGNED, expectedSnippet: 'courier has been assigned' },
        { status: OrderStatus.PICKED_UP, expectedSnippet: 'picked up your order' },
        { status: OrderStatus.DELIVERED, expectedSnippet: 'Enjoy your meal' },
        { status: OrderStatus.CANCELLED, expectedSnippet: 'cancelled' },
      ];

      for (const item of statusesToTest) {
        sendSpy.mockClear();
        await notificationService.notifyOrderStatusChanged(
          'cust-1',
          'owner-1',
          { id: 'ord-1', orderNumber: 'FF-001', restaurantName: 'Taco Haven' },
          item.status
        );

        expect(sendSpy).toHaveBeenCalledWith(
          'cust-1',
          expect.any(String),
          expect.stringContaining(item.expectedSnippet),
          NotificationTypeEnum.ORDER_UPDATE,
          expect.objectContaining({ orderId: 'ord-1' })
        );
      }
    });
  });
});
