import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Escalation Level Configuration
 */
export interface EscalationLevel {
  daysAfterDue: number;
  sendTime: string; // 24h format "HH:mm"
  templateType: 'gentle' | 'firm' | 'urgent';
  enabled: boolean;
}

/**
 * Due Soon Reminder Configuration
 */
export interface DueSoonConfig {
  enabled: boolean;
  daysBeforeDue: number;
  sendTime: string; // 24h format "HH:mm"
  skipWeekends: boolean;
}

/**
 * Overdue Reminder Configuration
 */
export interface OverdueConfig {
  enabled: boolean;
  escalationLevels: EscalationLevel[];
  maxEscalations: number;
  stopIfPaid: boolean;
}

/**
 * Welcome Message Configuration
 */
export interface WelcomeConfig {
  enabled: boolean;
  sendOn: 'move_in_date' | 'lease_start' | 'immediate';
  sendTime: string; // 24h format "HH:mm"
}

/**
 * Payment Receipt Configuration
 */
export interface ReceiptConfig {
  enabled: boolean;
  sendImmediately: boolean;
  includeInvoiceDetails: boolean;
}

/**
 * Email Settings Configuration
 */
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

/**
 * Queue & Performance Settings
 */
export interface QueueSettings {
  enabled: boolean;
  maxEmailsPerHour: number;
  maxEmailsPerDay: number;
  batchSize: number;
  delayBetweenBatches: number; // seconds
  alertOnQueueBacklog: boolean;
  backlogThreshold: number;
}

/**
 * Business Rules Configuration
 */
export interface BusinessRules {
  gracePeriodDays: number;
  skipIfPaid: boolean;
  skipIfPartiallyPaid: boolean;
  pauseOnWeekends: boolean;
}

/**
 * Reminder Settings Entity
 *
 * Stores configurable settings for the reminder system per company.
 * Allows admins to customize when and how reminders are sent.
 *
 * Author: george1806
 */
@Entity('reminder_settings')
@Index(['companyId'], { unique: true })
export class ReminderSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  companyId: string;

  // Due Soon Reminder Configuration
  @Column({
    type: 'json',
    default: {
      enabled: true,
      daysBeforeDue: 3,
      sendTime: '09:00',
      skipWeekends: true,
    },
  })
  dueSoonConfig: DueSoonConfig;

  // Overdue Reminder Configuration
  @Column({
    type: 'json',
    default: {
      enabled: true,
      escalationLevels: [
        {
          daysAfterDue: 1,
          sendTime: '10:00',
          templateType: 'gentle',
          enabled: true,
        },
        {
          daysAfterDue: 3,
          sendTime: '10:00',
          templateType: 'firm',
          enabled: true,
        },
        {
          daysAfterDue: 7,
          sendTime: '10:00',
          templateType: 'urgent',
          enabled: true,
        },
      ],
      maxEscalations: 3,
      stopIfPaid: true,
    },
  })
  overdueConfig: OverdueConfig;

  // Welcome Message Configuration
  @Column({
    type: 'json',
    default: {
      enabled: true,
      sendOn: 'lease_start',
      sendTime: '09:00',
    },
  })
  welcomeConfig: WelcomeConfig;

  // Payment Receipt Configuration
  @Column({
    type: 'json',
    default: {
      enabled: true,
      sendImmediately: true,
      includeInvoiceDetails: true,
    },
  })
  receiptConfig: ReceiptConfig;

  // Email Settings
  @Column({
    type: 'json',
    default: {
      fromName: 'Apartment Management',
      fromEmail: 'noreply@apartment.app',
      replyToEmail: 'support@apartment.app',
      bccAllReminders: [],
      signature: '',
      notifyAdminOnFailure: true,
      maxRetriesOnFailure: 3,
      retryDelayMinutes: 30,
    },
  })
  emailSettings: EmailSettings;

  // Queue & Performance Settings
  @Column({
    type: 'json',
    default: {
      enabled: true,
      maxEmailsPerHour: 50,
      maxEmailsPerDay: 250,
      batchSize: 10,
      delayBetweenBatches: 60,
      alertOnQueueBacklog: true,
      backlogThreshold: 100,
    },
  })
  queueSettings: QueueSettings;

  // Business Rules
  @Column({
    type: 'json',
    default: {
      gracePeriodDays: 2,
      skipIfPaid: true,
      skipIfPartiallyPaid: false,
      pauseOnWeekends: true,
    },
  })
  businessRules: BusinessRules;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Get cron expression for due soon reminders
   */
  getDueSoonCronExpression(): string | null {
    if (!this.dueSoonConfig.enabled) {
      return null;
    }

    const [hour, minute] = this.dueSoonConfig.sendTime.split(':');
    // Run daily at specified time
    return `${minute} ${hour} * * *`;
  }

  /**
   * Get cron expression for overdue reminders
   */
  getOverdueCronExpression(): string | null {
    if (!this.overdueConfig.enabled) {
      return null;
    }

    // Use the first escalation level's send time
    const firstLevel = this.overdueConfig.escalationLevels.find(l => l.enabled);
    if (!firstLevel) {
      return null;
    }

    const [hour, minute] = firstLevel.sendTime.split(':');
    // Run daily at specified time
    return `${minute} ${hour} * * *`;
  }

  /**
   * Check if a specific day should be skipped
   */
  shouldSkipDate(date: Date): boolean {
    // Skip weekends if configured
    if (this.businessRules.pauseOnWeekends) {
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get enabled escalation levels for overdue reminders
   */
  getEnabledEscalationLevels(): EscalationLevel[] {
    return this.overdueConfig.escalationLevels.filter(level => level.enabled);
  }

  /**
   * Get escalation level for specific days overdue
   */
  getEscalationLevel(daysOverdue: number): EscalationLevel | null {
    return (
      this.overdueConfig.escalationLevels.find(
        level => level.enabled && level.daysAfterDue === daysOverdue
      ) || null
    );
  }
}
