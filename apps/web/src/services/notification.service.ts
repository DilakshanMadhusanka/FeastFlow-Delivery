import { apiClient } from './api';
import { ApiResponse, NotificationDto, PaginatedResult } from '@food-delivery/shared';

class WebNotificationService {
  /**
   * Fetches paginated inbox notifications.
   */
  async getNotifications(
    page = 1,
    limit = 20,
    unreadOnly = false
  ): Promise<PaginatedResult<NotificationDto>> {
    const res = await apiClient.get<ApiResponse<PaginatedResult<NotificationDto>>>(
      '/notifications',
      {
        params: { page, limit, unreadOnly: unreadOnly ? 'true' : undefined },
      }
    );
    return res.data.data!;
  }

  /**
   * Retrieves count of unread notifications.
   */
  async getUnreadCount(): Promise<number> {
    const res = await apiClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
    return res.data.data?.count ?? 0;
  }

  /**
   * Marks a specific notification as read.
   */
  async markAsRead(id: string): Promise<void> {
    await apiClient.patch(`/notifications/${id}/read`);
  }

  /**
   * Marks all notifications as read.
   */
  async markAllAsRead(): Promise<void> {
    await apiClient.patch('/notifications/read-all');
  }

  /**
   * Deletes a notification.
   */
  async deleteNotification(id: string): Promise<void> {
    await apiClient.delete(`/notifications/${id}`);
  }

  /**
   * Requests HTML5 browser notification permission.
   */
  async requestBrowserPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  /**
   * Displays an immediate native browser desktop notification.
   */
  showBrowserNotification(title: string, body: string, data?: any): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: '/favicon.ico',
          data,
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (err) {
        console.warn('⚠️ Native desktop notification notice:', err);
      }
    }
  }

  /**
   * Registers a web push device token.
   */
  async registerWebToken(token: string): Promise<void> {
    await apiClient.post('/notifications/tokens', {
      token,
      platform: 'web',
    });
  }
}

export const webNotificationService = new WebNotificationService();
