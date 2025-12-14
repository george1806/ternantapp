import { api } from '@/lib/api';
import type { User } from '@/types';

/**
 * Companies Service
 *
 * Handles company registration, profile, and settings management
 */

export interface Company {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region?: string;
  country: string;
  postalCode?: string;
  currency: string;
  timezone: string;
  logo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySettings {
  invoicePrefix?: string;
  dateFormat?: string;
  language?: string;
  notificationsEnabled?: boolean;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface RegisterCompanyRequest {
  company: {
    name: string;
    slug: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    region?: string;
    country: string;
    postalCode?: string;
    currency: string;
    timezone: string;
  };
  owner: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone: string;
  };
}

export interface RegisterCompanyResponse {
  company: Company;
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface UpdateCompanyRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  currency?: string;
  timezone?: string;
}

export const companiesService = {
  /**
   * Register a new company with owner account
   */
  register: (data: RegisterCompanyRequest) => {
    return api.post<RegisterCompanyResponse>('/companies/register', data);
  },

  /**
   * Get list of supported currencies
   */
  getCurrencies: () => {
    return api.get<Currency[]>('/companies/currencies');
  },

  /**
   * Get company by ID
   */
  getById: (id: string) => {
    return api.get<Company>(`/companies/${id}`);
  },

  /**
   * Get company by slug
   */
  getBySlug: (slug: string) => {
    return api.get<Company>(`/companies/slug/${slug}`);
  },

  /**
   * Update company details
   */
  update: (id: string, data: UpdateCompanyRequest) => {
    return api.patch<Company>(`/companies/${id}`, data);
  },

  /**
   * Delete company (soft delete)
   */
  delete: (id: string) => {
    return api.delete(`/companies/${id}`);
  },

  /**
   * Get company settings
   */
  getSettings: (id: string) => {
    return api.get<CompanySettings>(`/companies/${id}/settings`);
  },

  /**
   * Update company settings
   */
  updateSettings: (id: string, data: Partial<CompanySettings>) => {
    return api.patch<CompanySettings>(`/companies/${id}/settings`, data);
  },
};
