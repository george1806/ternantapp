/**
 * Super Admin Company Service
 *
 * Follows OOP principles:
 * - Singleton Pattern for service instance
 * - Encapsulation of business logic
 * - Separation of concerns
 * - Single Responsibility Principle
 *
 * @author george1806
 */

import { api } from '@/lib/api';
import type {
  Company,
  CompanyStats,
  PlatformStats,
  CompanyListResponse,
  CreateCompanyDto,
  UpdateCompanyDto,
  CompanyFilters,
} from '@/types/super-admin/company.types';

export class SuperAdminCompanyService {
  private static instance: SuperAdminCompanyService;
  private readonly baseUrl = '/super-admin/companies';

  /**
   * Private constructor to enforce Singleton pattern
   */
  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): SuperAdminCompanyService {
    if (!SuperAdminCompanyService.instance) {
      SuperAdminCompanyService.instance = new SuperAdminCompanyService();
    }
    return SuperAdminCompanyService.instance;
  }

  /**
   * Get all companies with pagination and filters
   */
  public async getCompanies(
    filters: CompanyFilters = {}
  ): Promise<CompanyListResponse> {
    const params = new URLSearchParams();

    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.status) {
      params.append('status', filters.status === 'active' ? 'true' : 'false');
    }

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl;

    const response = await api.get<CompanyListResponse>(url);
    return response.data;
  }

  /**
   * Get company by ID
   */
  public async getCompanyById(id: string): Promise<Company> {
    const response = await api.get<Company>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  /**
   * Get company statistics
   */
  public async getCompanyStats(id: string): Promise<CompanyStats> {
    const response = await api.get<CompanyStats>(`${this.baseUrl}/${id}/stats`);
    return response.data;
  }

  /**
   * Get platform-wide statistics
   */
  public async getPlatformStats(): Promise<PlatformStats> {
    const response = await api.get<PlatformStats>(`${this.baseUrl}/platform/stats`);
    return response.data;
  }

  /**
   * Create new company with owner
   */
  public async createCompany(
    data: CreateCompanyDto
  ): Promise<{ company: Company; owner: any }> {
    const response = await api.post<{ company: Company; owner: any }>(this.baseUrl, data);
    return response.data;
  }

  /**
   * Update company details
   */
  public async updateCompany(
    id: string,
    data: UpdateCompanyDto
  ): Promise<Company> {
    const response = await api.patch<Company>(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  /**
   * Suspend a company
   */
  public async suspendCompany(id: string): Promise<Company> {
    const response = await api.patch<Company>(`${this.baseUrl}/${id}/suspend`, {});
    return response.data;
  }

  /**
   * Activate a company
   */
  public async activateCompany(id: string): Promise<Company> {
    const response = await api.patch<Company>(`${this.baseUrl}/${id}/activate`, {});
    return response.data;
  }

  /**
   * Delete a company (soft delete)
   */
  public async deleteCompany(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Toggle company active status
   */
  public async toggleCompanyStatus(
    id: string,
    isActive: boolean
  ): Promise<Company> {
    return isActive
      ? this.activateCompany(id)
      : this.suspendCompany(id);
  }

  /**
   * Format currency amount
   */
  public formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  /**
   * Calculate percentage
   */
  public calculatePercentage(part: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((part / total) * 100);
  }

  /**
   * Format date
   */
  public formatDate(date: string | null): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Format date and time
   */
  public formatDateTime(date: string | null): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Get status badge color
   */
  public getStatusColor(isActive: boolean): 'success' | 'destructive' {
    return isActive ? 'success' : 'destructive';
  }

  /**
   * Get status label
   */
  public getStatusLabel(isActive: boolean): string {
    return isActive ? 'Active' : 'Suspended';
  }

  /**
   * Generate slug from company name
   */
  public generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Validate email
   */
  public isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate slug
   */
  public isValidSlug(slug: string): boolean {
    const slugRegex = /^[a-z0-9-]+$/;
    return slugRegex.test(slug);
  }
}

// Export singleton instance
export const superAdminCompanyService = SuperAdminCompanyService.getInstance();
