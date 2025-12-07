import { api } from '@/lib/api';

/**
 * Analytics Service
 *
 * Best Practices:
 * - Fetch platform-wide analytics
 * - Revenue trends and metrics
 * - Payment collection analytics
 */

export interface AnalyticsFilters {
  period?: '7d' | '30d' | '90d' | 'ytd' | 'all';
  startDate?: string;
  endDate?: string;
}

export interface RevenueTrendData {
  date: string;
  amount: number;
  invoices: number;
}

export interface InvoiceDistribution {
  status: string;
  count: number;
  amount: number;
}

export interface PaymentCollectionMetrics {
  collectionRate: number;
  totalInvoiced: number;
  totalCollected: number;
  outstanding: number;
  overdue: number;
}

export interface TopCompany {
  id: string;
  name: string;
  revenue: number;
  invoices: number;
  collectionRate: number;
}

export interface AnalyticsData {
  revenueTrends: RevenueTrendData[];
  invoiceDistribution: InvoiceDistribution[];
  paymentCollection: PaymentCollectionMetrics;
  topCompanies: TopCompany[];
}

export const analyticsService = {
  /**
   * Get revenue trends
   */
  getRevenueTrends: (filters?: AnalyticsFilters) => {
    return api.get<{ data: RevenueTrendData[] }>('/super-admin/analytics/revenue-trends', { params: filters });
  },

  /**
   * Get invoice distribution
   */
  getInvoiceDistribution: (filters?: AnalyticsFilters) => {
    return api.get<{ data: InvoiceDistribution[] }>('/super-admin/analytics/invoice-distribution', { params: filters });
  },

  /**
   * Get payment collection metrics
   */
  getPaymentCollection: (filters?: AnalyticsFilters) => {
    return api.get<{ data: PaymentCollectionMetrics }>('/super-admin/analytics/payment-collection', { params: filters });
  },

  /**
   * Get top companies by revenue
   */
  getTopCompanies: (filters?: AnalyticsFilters & { limit?: number }) => {
    return api.get<{ data: TopCompany[] }>('/super-admin/analytics/top-companies', { params: filters });
  },

  /**
   * Get all analytics data at once
   */
  getAnalyticsDashboard: (filters?: AnalyticsFilters) => {
    return api.get<{ data: AnalyticsData }>('/super-admin/analytics/dashboard', { params: filters });
  },
};
