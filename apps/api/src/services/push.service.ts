import { notificationRepository } from '../repositories/notification.repository';

export interface ExpoPushMessage {
  to: string | string[];
  sound?: 'default' | null;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
  badge?: number;
}

export interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?: 'DeviceNotRegistered' | 'MessageTooBig' | 'MessageRateExceeded' | 'InvalidCredentials';
  };
}

export class PushService {
  private expoApiUrl = 'https://exp.host/--/api/v2/push/send';

  /**
   * Checks whether a string resembles an Expo push token.
   */
  isValidExpoPushToken(token: string): boolean {
    return (
      typeof token === 'string' &&
      (((token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')) &&
        token.endsWith(']')) ||
        /^[a-zA-Z0-9_-]{20,}$/.test(token))
    );
  }

  /**
   * Dispatches push notifications to one or more Expo Push Tokens.
   */
  async sendPushNotification(
    tokens: string | string[],
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> {
    const tokenList = Array.isArray(tokens) ? tokens : [tokens];
    const validTokens = tokenList.filter((t) => this.isValidExpoPushToken(t));

    if (validTokens.length === 0) {
      return;
    }

    const messages: ExpoPushMessage[] = validTokens.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: data || {},
      priority: 'high',
      channelId: 'orders',
    }));

    try {
      const response = await fetch(this.expoApiUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        console.warn(`⚠️ Expo Push API returned HTTP status: ${response.status}`);
        return;
      }

      const result = (await response.json()) as { data?: ExpoPushTicket[] };

      // Inspect receipts for DeviceNotRegistered and prune dead tokens
      if (result?.data && Array.isArray(result.data)) {
        for (let i = 0; i < result.data.length; i++) {
          const ticket = result.data[i];
          if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
            const staleToken = validTokens[i];
            if (staleToken) {
              console.log(`🧹 Removing deregistered device token from database: ${staleToken}`);
              await notificationRepository.removeDeviceToken(staleToken);
            }
          }
        }
      }
    } catch (err: any) {
      // Never crash the primary transaction if push notification service is unreachable
      console.warn('⚠️ Push notification dispatch notice:', err.message || err);
    }
  }
}

export const pushService = new PushService();
