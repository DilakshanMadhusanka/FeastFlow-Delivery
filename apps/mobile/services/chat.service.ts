import { apiClient } from './api';
import { ApiResponse } from '@food-delivery/shared';

export interface MobileChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderName: string;
  senderRole: 'STORE' | 'COURIER' | 'CUSTOMER';
  text: string;
  timestamp: string;
}

export const mobileChatService = {
  async getMessages(orderId: string): Promise<MobileChatMessage[]> {
    const res = await apiClient.get<ApiResponse<MobileChatMessage[]>>(`/chat/order/${orderId}`);
    return res.data.data || [];
  },

  async sendMessage(
    orderId: string,
    text: string,
    role: 'STORE' | 'COURIER' | 'CUSTOMER' = 'CUSTOMER'
  ): Promise<MobileChatMessage> {
    const res = await apiClient.post<ApiResponse<MobileChatMessage>>(`/chat/order/${orderId}`, {
      text,
      role,
    });
    return res.data.data!;
  },
};
