import { apiClient } from './api';
import { ApiResponse, PaginatedResult, OrderStatus, OrderSummary } from '@food-delivery/shared';

export const orderService = {
  async getRestaurantOrders(
    restaurantId: string,
    params?: {
      page?: number;
      limit?: number;
      status?: OrderStatus;
    }
  ): Promise<PaginatedResult<OrderSummary>> {
    const endpoint =
      restaurantId === 'all'
        ? '/orders/admin/all'
        : `/orders/restaurant/${restaurantId}`;
    const response = await apiClient.get<ApiResponse<PaginatedResult<OrderSummary>>>(
      endpoint,
      { params }
    );
    return (
      response.data.data || {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      }
    );
  },

  async getAllOrders(params?: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
  }): Promise<PaginatedResult<OrderSummary>> {
    const response = await apiClient.get<ApiResponse<PaginatedResult<OrderSummary>>>(
      '/orders/admin/all',
      { params }
    );
    return (
      response.data.data || {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      }
    );
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    notes?: string
  ): Promise<OrderSummary> {
    const response = await apiClient.patch<ApiResponse<OrderSummary>>(
      `/orders/${orderId}/status`,
      { status, notes }
    );
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to update order status');
    }
    return response.data.data;
  },

  async cancelOrder(orderId: string, reason: string): Promise<OrderSummary> {
    const response = await apiClient.post<ApiResponse<OrderSummary>>(`/orders/${orderId}/cancel`, {
      reason,
    });
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to cancel order');
    }
    return response.data.data;
  },
};
