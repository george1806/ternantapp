import { api } from '@/lib/api';

/**
 * Settings Service
 *
 * Best Practices:
 * - Platform settings management
 * - Configuration updates
 * - Email settings
 * - Feature flags
 */

export interface PlatformSettings {
  id?: string;
  appName: string;
  supportEmail: string;
  currency: string;
  timezone: string;
  emailConfig?: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromAddress: string;
    fromName: string;
    useTLS: boolean;
  };
  security?: {
    rateLimitPerMinute: number;
    sessionTimeoutMinutes: number;
    enforce2FA: boolean;
    passwordMinLength: number;
  };
  featureFlags?: {
    tenantPortal: boolean;
    fileUpload: boolean;
    auditLog: boolean;
    mobileApp: boolean;
    paymentGateway: boolean;
  };
}

export interface UpdateSettingsDto extends Partial<PlatformSettings> {}

export const settingsService = {
  /**
   * Get platform settings
   */
  getSettings: () => {
    return api.get<{ data: PlatformSettings }>('/super-admin/settings');
  },

  /**
   * Update platform settings
   */
  updateSettings: (data: UpdateSettingsDto) => {
    return api.put<{ data: PlatformSettings }>('/super-admin/settings', data);
  },

  /**
   * Test email configuration
   */
  testEmailConfig: () => {
    return api.post<{ success: boolean; message: string }>('/super-admin/settings/test-email');
  },

  /**
   * Get feature flags
   */
  getFeatureFlags: () => {
    return api.get<{ data: Record<string, boolean> }>('/super-admin/settings/feature-flags');
  },

  /**
   * Update feature flags
   */
  updateFeatureFlags: (flags: Record<string, boolean>) => {
    return api.put<{ data: Record<string, boolean> }>('/super-admin/settings/feature-flags', { flags });
  },
};
