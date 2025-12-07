import { api } from '@/lib/api';
import type { User, PaginatedResponse } from '@/types';

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  includeInactive?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  role?: string;
  phone?: string;
}

export const usersService = {
  async getAll(filters?: UserFilters) {
    const params = new URLSearchParams();

    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.role) params.append('role', filters.role);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.includeInactive !== undefined) {
      params.append('includeInactive', filters.includeInactive.toString());
    }
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    const queryString = params.toString();
    const url = `/users${queryString ? `?${queryString}` : ''}`;

    return api.get<PaginatedResponse<User>>(url);
  },

  async getById(id: string) {
    return api.get<User>(`/users/${id}`);
  },

  async create(data: CreateUserData) {
    return api.post<User>('/users', data);
  },

  async update(id: string, data: UpdateUserData) {
    return api.patch<User>(`/users/${id}`, data);
  },

  async delete(id: string) {
    return api.delete(`/users/${id}`);
  },

  async activate(id: string) {
    return api.post<User>(`/users/${id}/activate`);
  },
};
