import { api } from '@/lib/api';

/**
 * Reminder Settings Service
 *
 * Manages configurable settings for the reminder system
 */

export interface EscalationLevel {
  daysAfterDue: number;
  sendTime: string;
  templateType: 'gentle' | 'firm' | 'urgent';
  enabled: boolean;
}

export interface DueSoonConfig {
  enabled: boolean;
  daysBeforeDue: number;
  sendTime: string;
  skipWeekends: boolean;
}

export interface OverdueConfig {
  enabled: boolean;
  escalationLevels: EscalationLevel[];
  maxEscalations: number;
  stopIfPaid: boolean;
}

export interface WelcomeConfig {
  enabled: boolean;
  sendOn: 'move_in_date' | 'lease_start' | 'immediate';
  sendTime: string;
}

export interface ReceiptConfig {
  enabled: boolean;
  sendImmediately: boolean;
  includeInvoiceDetails: boolean;
}

export interface EmailSettings {
  fromName: string;
  fromEmail: string;
  replyToEmail: string;
  bccAllReminders: string[];
  signature: string;
  notifyAdminOnFailure: boolean;
  maxRetriesOnFailure: number;
  retryDelayMinutes: number;
}

export interface QueueSettings {
  enabled: boolean;
  maxEmailsPerHour: number;
  maxEmailsPerDay: number;
  batchSize: number;
  delayBetweenBatches: number;
  alertOnQueueBacklog: boolean;
  backlogThreshold: number;
}

export interface BusinessRules {
  gracePeriodDays: number;
  skipIfPaid: boolean;
  skipIfPartiallyPaid: boolean;
  pauseOnWeekends: boolean;
}

export interface ReminderSettings {
  id: string;
  companyId: string;
  dueSoonConfig: DueSoonConfig;
  overdueConfig: OverdueConfig;
  welcomeConfig: WelcomeConfig;
  receiptConfig: ReceiptConfig;
  emailSettings: EmailSettings;
  queueSettings: QueueSettings;
  businessRules: BusinessRules;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateReminderSettingsDto {
  dueSoonConfig?: Partial<DueSoonConfig>;
  overdueConfig?: Partial<OverdueConfig>;
  welcomeConfig?: Partial<WelcomeConfig>;
  receiptConfig?: Partial<ReceiptConfig>;
  emailSettings?: Partial<EmailSettings>;
  queueSettings?: Partial<QueueSettings>;
  businessRules?: Partial<BusinessRules>;
}

export const reminderSettingsService = {
  /**
   * Get reminder settings for current company
   */
  getSettings: () => {
    return api.get<ReminderSettings>('/settings/reminders');
  },

  /**
   * Update reminder settings
   */
  updateSettings: (data: UpdateReminderSettingsDto) => {
    return api.put<ReminderSettings>('/settings/reminders', data);
  },

  /**
   * Reset settings to defaults
   */
  resetToDefaults: () => {
    return api.post<ReminderSettings>('/settings/reminders/reset');
  },
};
