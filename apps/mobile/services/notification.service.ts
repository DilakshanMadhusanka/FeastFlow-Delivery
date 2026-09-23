import { apiClient } from './api';
import { ApiResponse, NotificationDto, PaginatedResult } from '@food-delivery/shared';
import { Platform } from 'react-native';
import { getItem, setItem, removeItem } from './storage';

const PUSH_TOKEN_STORAGE_KEY = 'feastflow_device_push_token';

class MobileNotificationService {
  /**
   * Fetches paginated inbox notifications for current user.
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
   * Retrieves unread notifications count for badge display.
   */
  async getUnreadCount(): Promise<number> {
    const res = await apiClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
    return res.data.data?.count ?? 0;
  }

  /**
   * Marks a single notification as read.
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
   * Deletes a notification from inbox.
   */
  async deleteNotification(id: string): Promise<void> {
    await apiClient.delete(`/notifications/${id}`);
  }

  /**
   * Registers a hardware device push token with backend.
   */
  async registerPushToken(token: string): Promise<void> {
    const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
    await apiClient.post('/notifications/tokens', {
      token,
      platform,
    });
    await setItem(PUSH_TOKEN_STORAGE_KEY, token);
  }

  /**
   * Unregisters device push token upon user sign out.
   */
  async unregisterCurrentPushToken(): Promise<void> {
    const token = await getItem(PUSH_TOKEN_STORAGE_KEY);
    if (token) {
      try {
        await apiClient.delete(`/notifications/tokens/${encodeURIComponent(token)}`);
      } catch {
        // Ignore network failure on token deregistration
      }
      await removeItem(PUSH_TOKEN_STORAGE_KEY);
    }
  }

  /**
   * Initializes device push token (or simulated native token for dev environments).
   */
  async initializePushNotifications(): Promise<string | null> {
    try {
      let token = await getItem(PUSH_TOKEN_STORAGE_KEY);
      if (!token) {
        // Generate a deterministic or device-specific push token
        token = `ExponentPushToken[mobile-${Platform.OS}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}]`;
      }
      await this.registerPushToken(token);
      return token;
    } catch (err: any) {
      console.warn('⚠️ Push notifications registration notice:', err?.message || err);
      return null;
    }
  }
}

export const mobileNotificationService = new MobileNotificationService();
