import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReminderSettings } from '../entities/reminder-settings.entity';
import { UpdateReminderSettingsDto } from '../dto/update-reminder-settings.dto';

/**
 * Reminder Settings Service
 *
 * Manages configurable settings for the reminder system.
 * Provides CRUD operations and helper methods for accessing settings.
 *
 * Author: george1806
 */
@Injectable()
export class ReminderSettingsService {
  private readonly logger = new Logger(ReminderSettingsService.name);

  constructor(
    @InjectRepository(ReminderSettings)
    private readonly settingsRepository: Repository<ReminderSettings>,
  ) {}

  /**
   * Get settings for a company
   * Creates default settings if none exist
   */
  async getSettings(companyId: string): Promise<ReminderSettings> {
    let settings = await this.settingsRepository.findOne({
      where: { companyId },
    });

    if (!settings) {
      this.logger.log(`Creating default reminder settings for company ${companyId}`);
      settings = await this.createDefaultSettings(companyId);
    }

    return settings;
  }

  /**
   * Update settings for a company
   */
  async updateSettings(
    companyId: string,
    updateDto: UpdateReminderSettingsDto,
  ): Promise<ReminderSettings> {
    let settings = await this.settingsRepository.findOne({
      where: { companyId },
    });

    if (!settings) {
      // Create with provided settings
      settings = this.settingsRepository.create({
        companyId,
        ...this.getDefaultConfig(),
        ...updateDto,
      });
    } else {
      // Update existing settings
      if (updateDto.dueSoonConfig) {
        settings.dueSoonConfig = { ...settings.dueSoonConfig, ...updateDto.dueSoonConfig };
      }
      if (updateDto.overdueConfig) {
        settings.overdueConfig = { ...settings.overdueConfig, ...updateDto.overdueConfig };
      }
      if (updateDto.welcomeConfig) {
        settings.welcomeConfig = { ...settings.welcomeConfig, ...updateDto.welcomeConfig };
      }
      if (updateDto.receiptConfig) {
        settings.receiptConfig = { ...settings.receiptConfig, ...updateDto.receiptConfig };
      }
      if (updateDto.emailSettings) {
        settings.emailSettings = { ...settings.emailSettings, ...updateDto.emailSettings };
      }
      if (updateDto.queueSettings) {
        settings.queueSettings = { ...settings.queueSettings, ...updateDto.queueSettings };
      }
      if (updateDto.businessRules) {
        settings.businessRules = { ...settings.businessRules, ...updateDto.businessRules };
      }
    }

    const saved = await this.settingsRepository.save(settings);

    this.logger.log(`Updated reminder settings for company ${companyId}`);

    return saved;
  }

  /**
   * Reset settings to defaults for a company
   */
  async resetToDefaults(companyId: string): Promise<ReminderSettings> {
    const settings = await this.settingsRepository.findOne({
      where: { companyId },
    });

    if (settings) {
      await this.settingsRepository.remove(settings);
    }

    return this.createDefaultSettings(companyId);
  }

  /**
   * Create default settings for a company
   */
  private async createDefaultSettings(companyId: string): Promise<ReminderSettings> {
    const settings = this.settingsRepository.create({
      companyId,
      ...this.getDefaultConfig(),
    });

    return this.settingsRepository.save(settings);
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig() {
    return {
      dueSoonConfig: {
        enabled: true,
        daysBeforeDue: 3,
        sendTime: '09:00',
        skipWeekends: true,
      },
      overdueConfig: {
        enabled: true,
        escalationLevels: [
          {
            daysAfterDue: 1,
            sendTime: '10:00',
            templateType: 'gentle' as const,
            enabled: true,
          },
          {
            daysAfterDue: 3,
            sendTime: '10:00',
            templateType: 'firm' as const,
            enabled: true,
          },
          {
            daysAfterDue: 7,
            sendTime: '10:00',
            templateType: 'urgent' as const,
            enabled: true,
          },
        ],
        maxEscalations: 3,
        stopIfPaid: true,
      },
      welcomeConfig: {
        enabled: true,
        sendOn: 'lease_start' as const,
        sendTime: '09:00',
      },
      receiptConfig: {
        enabled: true,
        sendImmediately: true,
        includeInvoiceDetails: true,
      },
      emailSettings: {
        fromName: 'Apartment Management',
        fromEmail: 'noreply@apartment.app',
        replyToEmail: 'support@apartment.app',
        bccAllReminders: [],
        signature: '',
        notifyAdminOnFailure: true,
        maxRetriesOnFailure: 3,
        retryDelayMinutes: 30,
      },
      queueSettings: {
        enabled: true,
        maxEmailsPerHour: 50,
        maxEmailsPerDay: 250,
        batchSize: 10,
        delayBetweenBatches: 60,
        alertOnQueueBacklog: true,
        backlogThreshold: 100,
      },
      businessRules: {
        gracePeriodDays: 2,
        skipIfPaid: true,
        skipIfPartiallyPaid: false,
        pauseOnWeekends: true,
      },
    };
  }

  /**
   * Check if due soon reminders are enabled
   */
  async isDueSoonEnabled(companyId: string): Promise<boolean> {
    const settings = await this.getSettings(companyId);
    return settings.dueSoonConfig.enabled;
  }

  /**
   * Check if overdue reminders are enabled
   */
  async isOverdueEnabled(companyId: string): Promise<boolean> {
    const settings = await this.getSettings(companyId);
    return settings.overdueConfig.enabled;
  }

  /**
   * Get enabled escalation levels for a company
   */
  async getEnabledEscalationLevels(companyId: string) {
    const settings = await this.getSettings(companyId);
    return settings.getEnabledEscalationLevels();
  }

  /**
   * Check if a date should be skipped (weekends)
   */
  async shouldSkipDate(companyId: string, date: Date): Promise<boolean> {
    const settings = await this.getSettings(companyId);
    return settings.shouldSkipDate(date);
  }

  /**
   * Get cron expression for due soon reminders
   */
  async getDueSoonCronExpression(companyId: string): Promise<string | null> {
    const settings = await this.getSettings(companyId);
    return settings.getDueSoonCronExpression();
  }

  /**
   * Get cron expression for overdue reminders
   */
  async getOverdueCronExpression(companyId: string): Promise<string | null> {
    const settings = await this.getSettings(companyId);
    return settings.getOverdueCronExpression();
  }
}
