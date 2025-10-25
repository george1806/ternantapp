import { api } from '@/lib/api';
import type { Compound, PaginatedResponse, PaginationParams } from '@/types';

/**
 * Compounds (Properties) Service
 *
 * Best Practices:
 * - CRUD operations for compounds
 * - Pagination support
 * - Type-safe DTOs
 * - Filtering and sorting
 */

export interface CreateCompoundDto {
  name: string;
  address: string;
  city: string;
  region?: string;
  country: string;
  postalCode?: string;
  totalUnits: number;
  description?: string;
  amenities?: string[];
}

export interface UpdateCompoundDto extends Partial<CreateCompoundDto> {}

export interface CompoundFilters extends PaginationParams {
  search?: string;
  city?: string;
  region?: string;
}

export const compoundsService = {
  /**
   * Get all compounds with pagination and filters
   */
  getAll: (params?: CompoundFilters) => {
    return api.get<PaginatedResponse<Compound>>('/compounds', { params });
  },

  /**
   * Get compound by ID
   */
  getById: (id: string) => {
    return api.get<{ data: Compound }>(`/compounds/${id}`);
  },

  /**
   * Create new compound
   */
  create: (data: CreateCompoundDto) => {
    return api.post<{ data: Compound }>('/compounds', data);
  },

  /**
   * Update compound
   */
  update: (id: string, data: UpdateCompoundDto) => {
    return api.patch<{ data: Compound }>(`/compounds/${id}`, data);
  },

  /**
   * Delete compound
   */
  delete: (id: string) => {
    return api.delete(`/compounds/${id}`);
  },

  /**
   * Get compound statistics
   */
  getStats: (id: string) => {
    return api.get<{ data: { totalUnits: number; occupiedUnits: number; vacantUnits: number } }>(
      `/compounds/${id}/stats`
    );
  },
};
