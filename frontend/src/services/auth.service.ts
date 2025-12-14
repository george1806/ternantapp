import { api } from '@/lib/api';
import type { User } from '@/types';

/**
 * Authentication Service
 *
 * Best Practices:
 * - Centralized auth API calls
 * - Type-safe request/response
 * - Token management handled by interceptors
 */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  data: {
    user: User;
    access_token: string;
    refresh_token: string;
  };
}

export interface Session {
  id: string;
  userId: string;
  deviceInfo: string;
  ipAddress: string;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

export const authService = {
  /**
   * Login with email and password
   */
  login: (data: LoginRequest) => {
    return api.post<LoginResponse>('/auth/login', data);
  },

  /**
   * Logout current user
   */
  logout: () => {
    return api.post('/auth/logout');
  },

  /**
   * Logout from all devices
   */
  logoutAll: () => {
    return api.post('/auth/logout-all');
  },

  /**
   * Get current user profile
   */
  getProfile: () => {
    return api.get<{ data: User }>('/auth/profile');
  },

  /**
   * Refresh access token
   */
  refreshToken: (refreshToken: string) => {
    return api.post<{ data: { access_token: string } }>('/auth/refresh', {
      refresh_token: refreshToken,
    });
  },

  /**
   * Get all active sessions for current user
   */
  getSessions: () => {
    return api.get<Session[]>('/auth/sessions');
  },

  /**
   * Get current authenticated user details
   */
  getMe: () => {
    return api.get<User>('/auth/me');
  },
};
