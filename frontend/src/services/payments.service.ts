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
  paymentDate: string;
  paymentMethod: 'mpesa' | 'bank_transfer' | 'cash' | 'cheque' | 'other';
  reference: string;
  notes?: string;
}

export interface PaymentFilters extends PaginationParams {
  search?: string;
  paymentMethod?: string;
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
};
