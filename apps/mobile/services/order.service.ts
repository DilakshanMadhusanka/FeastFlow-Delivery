import { apiClient } from './api';
import {
  ApiResponse,
  PaginatedResult,
  OrderSummary,
  CreateOrderInput,
  OrderStatus,
} from '@food-delivery/shared';

export const orderService = {
  /**
   * Places a new order from current active cart.
   */
  async createOrder(data: CreateOrderInput): Promise<OrderSummary> {
    const response = await apiClient.post<ApiResponse<OrderSummary>>('/orders', data);
    if (!response.data.data) {
      throw new Error(response.data.message || 'Failed to place order');
    }
    return response.data.data;
  },

  /**
   * Fetches paginated orders for the logged-in customer.
   */
  async getMyOrders(params?: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
  }): Promise<PaginatedResult<OrderSummary>> {
    const response = await apiClient.get<ApiResponse<PaginatedResult<OrderSummary>>>('/orders', {
      params,
    });
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

  /**
   * Fetches full order details by ID for tracking.
   */
  async getOrderById(orderId: string): Promise<OrderSummary> {
    const response = await apiClient.get<ApiResponse<OrderSummary>>(`/orders/${orderId}`);
    if (!response.data.data) {
      throw new Error(response.data.message || 'Order not found');
    }
    return response.data.data;
  },

  /**
   * Cancels an order with a reason.
   */
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
