import { api } from '@/lib/api';
import type { Payment, PaginatedResponse, PaginationParams } from '@/types';

/**
 * Payments Service
 *
 * Best Practices:
 * - Payment recording
 * - Payment method tracking
 * - Transaction history
 */

export interface CreatePaymentDto {
  invoiceId: string;
  amount: number;
  paidAt: string; // Backend uses paidAt timestamp
  method: 'CASH' | 'BANK' | 'MOBILE' | 'CARD' | 'OTHER';
  reference?: string;
  notes?: string;
  metadata?: any;
}

export interface PaymentFilters extends PaginationParams {
  search?: string;
  method?: string; // Backend uses 'method' not 'paymentMethod'
  dateFrom?: string;
  dateTo?: string;
  invoiceId?: string;
}

export const paymentsService = {
  /**
   * Get all payments with pagination and filters
   */
  getAll: (params?: PaymentFilters) => {
    return api.get<PaginatedResponse<Payment>>('/payments', { params });
  },

  /**
   * Get payment by ID
   */
  getById: (id: string) => {
    return api.get<{ data: Payment }>(`/payments/${id}`);
  },

  /**
   * Record new payment
   */
  create: (data: CreatePaymentDto) => {
    return api.post<{ data: Payment }>('/payments', data);
  },

  /**
   * Get payments for specific invoice
   */
  getByInvoice: (invoiceId: string) => {
    return api.get<{ data: Payment[] }>(`/invoices/${invoiceId}/payments`);
  },

  /**
   * Get payment statistics
   */
  getStats: (params?: { dateFrom?: string; dateTo?: string }) => {
    return api.get<{
      totalAmount: number;
      totalCount: number;
      byMethod: Record<string, { count: number; amount: number }>;
      averageAmount: number;
      largestPayment: number;
    }>('/payments/stats', { params });
  },

  /**
   * Get payments by date range
   */
  getByDateRange: (params: { dateFrom: string; dateTo: string }) => {
    return api.get<{ data: Payment[] }>('/payments/date-range', { params });
  },
};
