import { api } from '@/lib/api';
import type { Apartment, PaginatedResponse, PaginationParams } from '@/types';

/**
 * Apartments Service
 *
 * Manages apartment/unit operations within compounds
 * Key relationship: Compound -> Apartments -> Occupancies
 */

export interface CreateApartmentDto {
  compoundId: string;
  unitNumber: string;
  floor?: number;
  bedrooms: number;
  bathrooms: number;
  areaSqm?: number;
  monthlyRent: number;
  status?: 'available' | 'occupied' | 'maintenance' | 'reserved';
  amenities?: string[];
  notes?: string;
}

export interface UpdateApartmentDto extends Partial<CreateApartmentDto> {}

export interface ApartmentFilters extends PaginationParams {
  search?: string;
  compoundId?: string;
  status?: 'available' | 'occupied' | 'maintenance' | 'reserved';
  minRent?: number;
  maxRent?: number;
  bedrooms?: number;
}

export const apartmentsService = {
  /**
   * Get all apartments with pagination and filters
   */
  getAll: (params?: ApartmentFilters) => {
    return api.get<PaginatedResponse<Apartment>>('/apartments', { params });
  },

  /**
   * Get apartment by ID
   */
  getById: (id: string) => {
    return api.get<{ data: Apartment }>(`/apartments/${id}`);
  },

  /**
   * Create new apartment
   */
  create: (data: CreateApartmentDto) => {
    return api.post<{ data: Apartment }>('/apartments', data);
  },

  /**
   * Update apartment
   */
  update: (id: string, data: UpdateApartmentDto) => {
    return api.patch<{ data: Apartment }>(`/apartments/${id}`, data);
  },

  /**
   * Delete apartment
   */
  delete: (id: string) => {
    return api.delete(`/apartments/${id}`);
  },

  /**
   * Get apartments by compound
   */
  getByCompound: (compoundId: string, params?: PaginationParams) => {
    return api.get<PaginatedResponse<Apartment>>(`/compounds/${compoundId}/apartments`, { params });
  },

  /**
   * Get available apartments
   */
  getAvailable: (params?: ApartmentFilters) => {
    return api.get<PaginatedResponse<Apartment>>('/apartments', {
      params: { ...params, status: 'available' },
    });
  },

  /**
   * Get apartment statistics
   */
  getStats: (params?: { compoundId?: string }) => {
    return api.get<{
      total: number;
      available: number;
      occupied: number;
      maintenance: number;
      reserved: number;
      occupancyRate: number;
    }>('/apartments/stats', { params });
  },

  /**
   * Get apartment count with filters
   */
  getCount: (params?: ApartmentFilters) => {
    return api.get<{ count: number }>('/apartments/count', { params });
  },
};
