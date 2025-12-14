import { api } from '@/lib/api';
import type { Invoice, PaginatedResponse, PaginationParams } from '@/types';

/**
 * Invoices Service
 *
 * Best Practices:
 * - CRUD operations for invoices
 * - Status management
 * - Payment recording
 * - PDF generation
 */

export interface CreateInvoiceDto {
  occupancyId: string;
  invoiceDate: string;
  dueDate: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    itemType: 'rent' | 'utility' | 'maintenance' | 'other';
  }[];
  notes?: string;
}

export interface UpdateInvoiceDto extends Partial<CreateInvoiceDto> {}

export interface InvoiceFilters extends PaginationParams {
  search?: string;
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dateFrom?: string;
  dateTo?: string;
}

export const invoicesService = {
  /**
   * Get all invoices with pagination and filters
   */
  getAll: (params?: InvoiceFilters) => {
    return api.get<PaginatedResponse<Invoice>>('/invoices', { params });
  },

  /**
   * Get invoice by ID
   */
  getById: (id: string) => {
    return api.get<{ data: Invoice }>(`/invoices/${id}`);
  },

  /**
   * Create new invoice
   */
  create: (data: CreateInvoiceDto) => {
    return api.post<{ data: Invoice }>('/invoices', data);
  },

  /**
   * Update invoice
   */
  update: (id: string, data: UpdateInvoiceDto) => {
    return api.patch<{ data: Invoice }>(`/invoices/${id}`, data);
  },

  /**
   * Delete invoice
   */
  delete: (id: string) => {
    return api.delete(`/invoices/${id}`);
  },

  /**
   * Mark invoice as sent
   */
  markAsSent: (id: string) => {
    return api.patch<{ data: Invoice }>(`/invoices/${id}/send`);
  },

  /**
   * Cancel invoice
   */
  cancel: (id: string) => {
    return api.patch<{ data: Invoice }>(`/invoices/${id}/cancel`);
  },

  /**
   * Download invoice PDF
   */
  downloadPdf: (id: string) => {
    return api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
  },

  /**
   * Bulk generate rent invoices for multiple occupancies
   */
  bulkGenerate: (data: {
    occupancyIds: string[];
    dueDate: string;
    issueDate?: string;
  }) => {
    return api.post<{
      generated: Invoice[];
      failed: Array<{ occupancyId: string; reason: string }>;
    }>('/invoices/bulk-generate', data);
  },

  /**
   * Send invoice to tenant
   */
  send: (id: string, data?: { message?: string }) => {
    return api.post<{ success: boolean; sentAt: string }>(`/invoices/${id}/send`, data || {});
  },

  /**
   * Get payments for a specific invoice
   */
  getPayments: (id: string) => {
    return api.get(`/invoices/${id}/payments`);
  },

  /**
   * Get invoices due soon (within specified days)
   */
  getDueSoon: (days: number = 7) => {
    return api.get<{ data: Invoice[]; count: number }>('/invoices/due-soon', {
      params: { days },
    });
  },
};
