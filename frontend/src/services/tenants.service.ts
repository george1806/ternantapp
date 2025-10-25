import { api } from '@/lib/api';
import type { Tenant, PaginatedResponse, PaginationParams } from '@/types';

/**
 * Tenants Service
 *
 * Best Practices:
 * - CRUD operations for tenants
 * - Pagination and filtering
 * - Type-safe DTOs
 */

export interface CreateTenantDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  idNumber?: string;
  dateOfBirth?: string;
  nationality?: string;
  occupation?: string;
  employer?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  notes?: string;
}

export interface UpdateTenantDto extends Partial<CreateTenantDto> {}

export interface TenantFilters extends PaginationParams {
  search?: string;
  status?: 'active' | 'inactive';
}

export const tenantsService = {
  /**
   * Get all tenants with pagination and filters
   */
  getAll: (params?: TenantFilters) => {
    return api.get<PaginatedResponse<Tenant>>('/tenants', { params });
  },

  /**
   * Get tenant by ID
   */
  getById: (id: string) => {
    return api.get<{ data: Tenant }>(`/tenants/${id}`);
  },

  /**
   * Create new tenant
   */
  create: (data: CreateTenantDto) => {
    return api.post<{ data: Tenant }>('/tenants', data);
  },

  /**
   * Update tenant
   */
  update: (id: string, data: UpdateTenantDto) => {
    return api.patch<{ data: Tenant }>(`/tenants/${id}`, data);
  },

  /**
   * Delete tenant
   */
  delete: (id: string) => {
    return api.delete(`/tenants/${id}`);
  },
};
