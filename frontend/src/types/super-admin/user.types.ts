/**
 * Super Admin User Types
 * TypeScript interfaces for user management
 *
 * Author: george1806
 */

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  AUDITOR = 'AUDITOR',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE',
}

export interface User {
  id: string;
  companyId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  isSuperAdmin: boolean;
  profile?: {
    phone?: string;
    avatar?: string;
  };
  company?: {
    id: string;
    name: string;
    slug: string;
  };
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UserListResponse {
  data: User[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UserStatsResponse {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  usersByRole: {
    owners: number;
    admins: number;
    staff: number;
  };
  recentUsers: User[];
}

export interface CreateUserDto {
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  status?: UserStatus;
  phone?: string;
}

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  companyId?: string;
  role?: UserRole;
  status?: UserStatus;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface ResetPasswordDto {
  newPassword: string;
}
