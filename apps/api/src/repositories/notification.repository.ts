import { prisma } from '../config/database';
import { NotificationTypeEnum } from '@prisma/client';

export class NotificationRepository {
  /**
   * Persists a notification to the user's inbox in the database.
   */
  async createNotification(data: {
    userId: string;
    title: string;
    body: string;
    type?: NotificationTypeEnum;
    data?: any;
  }) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        body: data.body,
        type: data.type || NotificationTypeEnum.ORDER_UPDATE,
        data: data.data || undefined,
        isRead: false,
      },
    });
  }

  /**
   * Retrieves paginated inbox notifications for a specific user.
   */
  async findUserNotifications(
    userId: string,
    page = 1,
    limit = 20,
    unreadOnly = false
  ) {
    const skip = (page - 1) * limit;
    const where: any = { userId };

    if (unreadOnly) {
      where.isRead = false;
    }

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Counts unread notifications for a user.
   */
  async countUnread(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Marks a specific notification as read.
   */
  async markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  /**
   * Marks all unread notifications for a user as read.
   */
  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Deletes a notification from user's inbox.
   */
  async deleteNotification(id: string, userId: string) {
    return prisma.notification.deleteMany({
      where: { id, userId },
    });
  }

  /**
   * Registers or updates an Expo / Web push device token for a user.
   */
  async upsertDeviceToken(userId: string, token: string, platform?: string) {
    return prisma.deviceToken.upsert({
      where: { token },
      create: {
        userId,
        token,
        platform,
      },
      update: {
        userId,
        platform,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Removes an invalidated or logged-out device token.
   */
  async removeDeviceToken(token: string) {
    return prisma.deviceToken.deleteMany({
      where: { token },
    });
  }

  /**
   * Retrieves all registered device push tokens for a user.
   */
  async findUserDeviceTokens(userId: string): Promise<string[]> {
    const records = await prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true },
    });
    return records.map((r) => r.token);
  }
}

export const notificationRepository = new NotificationRepository();
