import { api } from '@/lib/api';
import type { DashboardStats, Invoice, Payment, PaginatedResponse } from '@/types';

/**
 * Dashboard Service
 *
 * Best Practices:
 * - Centralized API calls for dashboard
 * - Type-safe responses
 * - Error handling at service level
 * - Consistent naming conventions
 */

export type { DashboardStats };

export const dashboardService = {
  /**
   * Get dashboard statistics
   */
  getStats: () => {
    return api.get<{ data: DashboardStats }>('/dashboard/stats');
  },

  /**
   * Get recent invoices
   * @param limit - Number of invoices to fetch (default: 5)
   */
  getRecentInvoices: (limit = 5) => {
    return api.get<{ data: Invoice[] }>('/invoices', {
      params: {
        limit,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      },
    });
  },

  /**
   * Get recent payments
   * @param limit - Number of payments to fetch (default: 5)
   */
  getRecentPayments: (limit = 5) => {
    return api.get<{ data: Payment[] }>('/payments', {
      params: {
        limit,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      },
    });
  },
};
