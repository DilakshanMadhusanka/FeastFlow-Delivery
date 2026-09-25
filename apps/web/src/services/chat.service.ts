import { apiClient } from './api';
import { ApiResponse } from '@food-delivery/shared';

export interface ChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderName: string;
  senderRole: 'STORE' | 'COURIER' | 'CUSTOMER';
  text: string;
  timestamp: string;
}

export interface ChatThread {
  orderId: string;
  orderNumber: string;
  status: string;
  restaurantName: string;
  customerName: string;
  customerPhone?: string;
  courierName?: string;
  courierPhone?: string;
  messageCount: number;
  lastMessage: string;
  lastMessageTime: string;
}

export const chatService = {
  async getMessages(orderId: string): Promise<ChatMessage[]> {
    const res = await apiClient.get<ApiResponse<ChatMessage[]>>(`/chat/order/${orderId}`);
    return res.data.data || [];
  },

  async sendMessage(
    orderId: string,
    text: string,
    role: 'STORE' | 'COURIER' | 'CUSTOMER' = 'STORE'
  ): Promise<ChatMessage> {
    const res = await apiClient.post<ApiResponse<ChatMessage>>(`/chat/order/${orderId}`, {
      text,
      role,
    });
    return res.data.data!;
  },

  async getActiveThreads(restaurantId?: string): Promise<ChatThread[]> {
    const res = await apiClient.get<ApiResponse<ChatThread[]>>('/chat/threads', {
      params: restaurantId && restaurantId !== 'all' ? { restaurantId } : undefined,
    });
    return res.data.data || [];
  },
};
