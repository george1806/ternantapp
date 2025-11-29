import { api } from '@/lib/api';
import type { User, Company } from '@/types';
import type { Currency } from '@/lib/currency';

/**
 * User Service
 *
 * Handles user and company profile updates, password changes, etc.
 */

export interface UpdateUserProfileDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface UpdateCompanyProfileDto {
  name: string;
  email: string;
  phone?: string;
  currency: Currency;
  timezone: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  website?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateNotificationSettingsDto {
  emailNotifications?: boolean;
  invoiceReminders?: boolean;
  paymentConfirmations?: boolean;
  leaseExpiry?: boolean;
  maintenanceAlerts?: boolean;
}

export const userService = {
  /**
   * Get current user profile
   */
  getProfile: () => {
    return api.get<{ data: User }>('/users/profile');
  },

  /**
   * Update user profile
   */
  updateProfile: (data: UpdateUserProfileDto) => {
    return api.patch<{ data: User }>('/users/profile', data);
  },

  /**
   * Change user password
   */
  changePassword: (data: ChangePasswordDto) => {
    return api.post<{ data: { message: string } }>('/users/change-password', data);
  },

  /**
   * Get company profile
   */
  getCompanyProfile: () => {
    return api.get<{ data: Company }>('/companies/profile');
  },

  /**
   * Update company profile
   */
  updateCompanyProfile: (data: UpdateCompanyProfileDto) => {
    return api.patch<{ data: Company }>('/companies/profile', data);
  },

  /**
   * Update notification settings
   */
  updateNotificationSettings: (data: UpdateNotificationSettingsDto) => {
    return api.patch<{ data: { message: string } }>('/users/notification-settings', data);
  },

  /**
   * Get notification settings
   */
  getNotificationSettings: () => {
    return api.get<{ data: UpdateNotificationSettingsDto }>('/users/notification-settings');
  },
};
