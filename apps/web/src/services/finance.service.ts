import { apiClient } from './api';
import { ApiResponse, PaginatedResult } from '@food-delivery/shared';
import { FinancialSummary, FinancialLedgerItem } from '../types';

export const financeService = {
  async getSummary(restaurantId?: string): Promise<FinancialSummary> {
    const response = await apiClient.get<ApiResponse<FinancialSummary>>('/finance/summary', {
      params: restaurantId && restaurantId !== 'all' ? { restaurantId } : undefined,
    });
    return response.data.data!;
  },

  async getLedger(params?: {
    restaurantId?: string;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResult<FinancialLedgerItem>> {
    const response = await apiClient.get<ApiResponse<PaginatedResult<FinancialLedgerItem>>>(
      '/finance/ledger',
      {
        params: {
          ...params,
          restaurantId: params?.restaurantId === 'all' ? undefined : params?.restaurantId,
        },
      }
    );
    return (
      response.data.data || {
        items: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 1,
      }
    );
  },

  async processPayout(input: {
    restaurantId: string;
    amount: number;
    bankAccount?: string;
    notes?: string;
  }): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>('/finance/payouts', input);
    return response.data.data;
  },
};
