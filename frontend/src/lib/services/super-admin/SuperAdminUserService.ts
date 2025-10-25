/**
 * Super Admin User Service
 * Singleton service for managing platform users
 * Follows OOP principles with encapsulation and single responsibility
 *
 * Author: george1806
 */

import { api } from '@/lib/api';
import type {
  User,
  UserListResponse,
  UserStatsResponse,
  CreateUserDto,
  UpdateUserDto,
  UserFilters,
  ResetPasswordDto,
} from '../../../types/super-admin/user.types';

export class SuperAdminUserService {
  private static instance: SuperAdminUserService;
  private readonly basePath = '/super-admin/users';

  // Private constructor to enforce Singleton pattern
  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): SuperAdminUserService {
    if (!SuperAdminUserService.instance) {
      SuperAdminUserService.instance = new SuperAdminUserService();
    }
    return SuperAdminUserService.instance;
  }

  /**
   * List all platform users with filters and pagination
   */
  async listUsers(filters?: UserFilters): Promise<UserListResponse> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.companyId) params.append('companyId', filters.companyId);
      if (filters.role) params.append('role', filters.role);
      if (filters.status) params.append('status', filters.status);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    }

    const queryString = params.toString();
    const url = queryString ? `${this.basePath}?${queryString}` : this.basePath;

    const response = await api.get<UserListResponse>(url);
    return response.data;
  }

  /**
   * Get platform-wide user statistics
   */
  async getUserStats(): Promise<UserStatsResponse> {
    const response = await api.get<UserStatsResponse>(
      `${this.basePath}/stats`
    );
    return response.data;
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User> {
    const response = await api.get<User>(`${this.basePath}/${id}`);
    return response.data;
  }

  /**
   * Create a new user
   */
  async createUser(data: CreateUserDto): Promise<User> {
    const response = await api.post<User>(this.basePath, data);
    return response.data;
  }

  /**
   * Update user
   */
  async updateUser(id: string, data: UpdateUserDto): Promise<User> {
    const response = await api.patch<User>(`${this.basePath}/${id}`, data);
    return response.data;
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(id: string): Promise<void> {
    await api.delete(`${this.basePath}/${id}`);
  }

  /**
   * Activate user
   */
  async activateUser(id: string): Promise<User> {
    const response = await api.patch<User>(
      `${this.basePath}/${id}/activate`
    );
    return response.data;
  }

  /**
   * Suspend user
   */
  async suspendUser(id: string): Promise<User> {
    const response = await api.patch<User>(
      `${this.basePath}/${id}/suspend`
    );
    return response.data;
  }

  /**
   * Reset user password
   */
  async resetPassword(id: string, newPassword: string): Promise<void> {
    await api.patch(`${this.basePath}/${id}/reset-password`, {
      newPassword,
    });
  }

  /**
   * Get full name from user
   */
  getFullName(user: User): string {
    return `${user.firstName} ${user.lastName}`.trim();
  }

  /**
   * Get user role display name
   */
  getRoleDisplay(role: string): string {
    const roleMap: Record<string, string> = {
      OWNER: 'Owner',
      ADMIN: 'Admin',
      STAFF: 'Staff',
      AUDITOR: 'Auditor',
      SUPER_ADMIN: 'Super Admin',
    };
    return roleMap[role] || role;
  }

  /**
   * Get user status display name
   */
  getStatusDisplay(status: string): string {
    const statusMap: Record<string, string> = {
      ACTIVE: 'Active',
      SUSPENDED: 'Suspended',
      INACTIVE: 'Inactive',
    };
    return statusMap[status] || status;
  }

  /**
   * Get status badge color
   */
  getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      ACTIVE: 'green',
      SUSPENDED: 'red',
      INACTIVE: 'gray',
    };
    return colorMap[status] || 'gray';
  }

  /**
   * Get role badge color
   */
  getRoleColor(role: string): string {
    const colorMap: Record<string, string> = {
      OWNER: 'purple',
      ADMIN: 'blue',
      STAFF: 'cyan',
      AUDITOR: 'orange',
      SUPER_ADMIN: 'red',
    };
    return colorMap[role] || 'gray';
  }

  /**
   * Format date
   */
  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Format date and time
   */
  formatDateTime(date: string | Date): string {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

// Export singleton instance
export const superAdminUserService = SuperAdminUserService.getInstance();
