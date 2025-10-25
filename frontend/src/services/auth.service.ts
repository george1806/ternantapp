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
};
