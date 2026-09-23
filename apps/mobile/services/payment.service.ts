import { apiClient } from './api';
import { ApiResponse, PaymentMethod } from '@food-delivery/shared';

export interface PaymentIntentResponse {
  transactionId: string;
  clientSecret: string | null;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  publishableKey: string | null;
}

export const paymentService = {
  async createIntent(data: {
    amount: number;
    currency?: string;
    paymentMethod: PaymentMethod;
    orderId?: string;
  }) {
    const response = await apiClient.post<ApiResponse<PaymentIntentResponse>>(
      '/payments/intent',
      data
    );
    return response.data.data;
  },

  async confirmPayment(paymentIntentId: string, orderId?: string) {
    const response = await apiClient.post<ApiResponse<{ id: string; paymentStatus: string }>>(
      '/payments/confirm',
      { paymentIntentId, orderId }
    );
    return response.data.data;
  },
};
