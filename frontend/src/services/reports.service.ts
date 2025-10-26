/**
 * Reports Service
 * Handles analytics, KPIs, and report generation
 *
 * @author george1806
 */

import { api } from '@/lib/api';
import type { ApiResponse } from '@/types';

/**
 * KPI Dashboard Data
 */
export interface KPIData {
  totalRevenue: number;
  monthlyRevenue: number;
  occupancyRate: number;
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  totalTenants: number;
  activeLeases: number;
  expiringLeases: number;
  pendingInvoices: number;
  overdueInvoices: number;
  collectionRate: number;
  averageRent: number;
  revenueGrowth: number;
  occupancyTrend: number;
}

/**
 * Occupancy Report Data
 */
export interface OccupancyReport {
  propertyId: string;
  propertyName: string;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  maintenanceUnits: number;
  occupancyRate: number;
  averageRent: number;
  monthlyRevenue: number;
}

/**
 * Revenue Report Data
 */
export interface RevenueReport {
  month: string;
  year: number;
  expectedRevenue: number;
  collectedRevenue: number;
  outstandingRevenue: number;
  collectionRate: number;
  invoicesCount: number;
  paymentsCount: number;
}

/**
 * Report Filters
 */
export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  propertyId?: string;
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

class ReportsService {
  private readonly baseUrl = '/reports';

  /**
   * Get KPI dashboard data
   */
  async getKPIs(): Promise<ApiResponse<KPIData>> {
    return api.get<{ data: KPIData }>(`${this.baseUrl}/kpis`);
  }

  /**
   * Get occupancy report
   */
  async getOccupancyReport(
    filters?: ReportFilters
  ): Promise<ApiResponse<OccupancyReport[]>> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.propertyId) params.append('propertyId', filters.propertyId);

    const queryString = params.toString();
    const url = queryString
      ? `${this.baseUrl}/occupancy?${queryString}`
      : `${this.baseUrl}/occupancy`;

    return api.get<{ data: OccupancyReport[] }>(url);
  }

  /**
   * Get revenue report
   */
  async getRevenueReport(
    filters?: ReportFilters
  ): Promise<ApiResponse<RevenueReport[]>> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.period) params.append('period', filters.period);

    const queryString = params.toString();
    const url = queryString
      ? `${this.baseUrl}/revenue?${queryString}`
      : `${this.baseUrl}/revenue`;

    return api.get<{ data: RevenueReport[] }>(url);
  }

  /**
   * Clear reports cache
   */
  async clearCache(): Promise<ApiResponse<{ message: string }>> {
    return api.delete<{ data: { message: string } }>(`${this.baseUrl}/cache`);
  }

  /**
   * Export report to CSV
   * @param reportType - Type of report (occupancy, revenue, kpis)
   * @param filters - Report filters
   */
  async exportToCSV(
    reportType: 'occupancy' | 'revenue' | 'kpis',
    filters?: ReportFilters
  ): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.propertyId) params.append('propertyId', filters.propertyId);
    if (filters?.period) params.append('period', filters.period);

    const queryString = params.toString();
    const url = queryString
      ? `${this.baseUrl}/${reportType}/export?${queryString}`
      : `${this.baseUrl}/${reportType}/export`;

    const response = await api.get(url, {
      responseType: 'blob',
    });

    return response.data;
  }

  /**
   * Download CSV file
   */
  downloadCSV(data: Blob, filename: string): void {
    const url = window.URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  /**
   * Format percentage
   */
  formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Calculate percentage
   */
  calculatePercentage(part: number, total: number): number {
    if (total === 0) return 0;
    return (part / total) * 100;
  }

  /**
   * Format date for API
   */
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get date range for period
   */
  getDateRange(period: 'today' | 'week' | 'month' | 'quarter' | 'year'): {
    startDate: string;
    endDate: string;
  } {
    const now = new Date();
    const endDate = this.formatDate(now);
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = now;
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'quarter':
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
    }

    return {
      startDate: this.formatDate(startDate),
      endDate,
    };
  }
}

export const reportsService = new ReportsService();
export default reportsService;
