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
   * @param compoundId - Optional compound/property ID for property-specific stats
   */
  getStats: (compoundId?: string) => {
    return api.get<{ data: DashboardStats }>('/dashboard/stats', {
      params: compoundId ? { compoundId } : undefined,
    });
  },

  /**
   * Get recent invoices
   * @param limit - Number of invoices to fetch (default: 5)
   * @param compoundId - Optional compound/property ID for property-specific invoices
   */
  getRecentInvoices: (limit = 5, compoundId?: string) => {
    return api.get<{ data: Invoice[] }>('/invoices', {
      params: {
        limit,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
        ...(compoundId && { compoundId }),
      },
    });
  },

  /**
   * Get recent payments
   * @param limit - Number of payments to fetch (default: 5)
   * @param compoundId - Optional compound/property ID for property-specific payments
   */
  getRecentPayments: (limit = 5, compoundId?: string) => {
    return api.get<{ data: Payment[] }>('/payments', {
      params: {
        limit,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
        ...(compoundId && { compoundId }),
      },
    });
  },
};
