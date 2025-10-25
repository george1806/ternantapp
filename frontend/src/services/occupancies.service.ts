import { api } from '@/lib/api';
import type { Occupancy, PaginatedResponse, PaginationParams } from '@/types';

/**
 * Occupancies Service
 *
 * Manages tenant-apartment relationships (leases)
 * Core business logic: Assigning tenants to apartments
 */

export interface CreateOccupancyDto {
  apartmentId: string;
  tenantId: string;
  leaseStartDate: string;
  leaseEndDate: string;
  monthlyRent: number;
  securityDeposit?: number;
  depositPaid?: number;
  moveInDate?: string;
  status?: 'pending' | 'active' | 'ended' | 'cancelled';
  notes?: string;
}

export interface UpdateOccupancyDto extends Partial<CreateOccupancyDto> {
  moveOutDate?: string;
}

export interface OccupancyFilters extends PaginationParams {
  search?: string;
  apartmentId?: string;
  tenantId?: string;
  compoundId?: string;
  status?: 'pending' | 'active' | 'ended' | 'cancelled';
  leaseEndingBefore?: string;
  leaseEndingAfter?: string;
}

export const occupanciesService = {
  /**
   * Get all occupancies with pagination and filters
   */
  getAll: (params?: OccupancyFilters) => {
    return api.get<PaginatedResponse<Occupancy>>('/occupancies', { params });
  },

  /**
   * Get occupancy by ID
   */
  getById: (id: string) => {
    return api.get<{ data: Occupancy }>(`/occupancies/${id}`);
  },

  /**
   * Create new occupancy (assign tenant to apartment)
   */
  create: (data: CreateOccupancyDto) => {
    return api.post<{ data: Occupancy }>('/occupancies', data);
  },

  /**
   * Update occupancy
   */
  update: (id: string, data: UpdateOccupancyDto) => {
    return api.patch<{ data: Occupancy }>(`/occupancies/${id}`, data);
  },

  /**
   * End occupancy (tenant move-out)
   */
  end: (id: string, moveOutDate: string) => {
    return api.patch<{ data: Occupancy }>(`/occupancies/${id}/end`, { moveOutDate });
  },

  /**
   * Delete occupancy
   */
  delete: (id: string) => {
    return api.delete(`/occupancies/${id}`);
  },

  /**
   * Get active occupancies
   */
  getActive: (params?: Omit<OccupancyFilters, 'status'>) => {
    return api.get<PaginatedResponse<Occupancy>>('/occupancies', {
      params: { ...params, status: 'active' },
    });
  },

  /**
   * Get occupancies by apartment
   */
  getByApartment: (apartmentId: string, params?: PaginationParams) => {
    return api.get<PaginatedResponse<Occupancy>>(`/apartments/${apartmentId}/occupancies`, {
      params,
    });
  },

  /**
   * Get occupancies by tenant
   */
  getByTenant: (tenantId: string, params?: PaginationParams) => {
    return api.get<PaginatedResponse<Occupancy>>(`/tenants/${tenantId}/occupancies`, { params });
  },

  /**
   * Get expiring leases (ending within specified days)
   */
  getExpiring: (days: number = 30) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return api.get<PaginatedResponse<Occupancy>>('/occupancies', {
      params: {
        status: 'active',
        leaseEndingBefore: date.toISOString().split('T')[0],
      },
    });
  },
};
