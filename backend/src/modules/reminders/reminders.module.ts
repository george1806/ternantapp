import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RemindersService } from './services/reminders.service';
import { ReminderSettingsService } from './services/reminder-settings.service';
import { ReminderLogService } from './services/reminder-log.service';
import { RemindersController } from './controllers/reminders.controller';
import { ReminderSettingsController } from './controllers/reminder-settings.controller';
import { ReminderAnalyticsController } from './controllers/reminder-analytics.controller';
import { Reminder } from './entities/reminder.entity';
import { ReminderSettings } from './entities/reminder-settings.entity';
import { ReminderLog } from './entities/reminder-log.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

/**
 * Reminders Module
 * Manages reminder notifications for tenants
 *
 * Features:
 * - Manual reminder creation
 * - Automated due/overdue invoice reminders
 * - Welcome messages for new tenants
 * - Payment receipt notifications
 * - BullMQ queue integration
 * - Scheduled cron jobs
 * - Configurable settings per company
 * - Audit logging for all sent reminders
 *
 * Author: george1806
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([
            Reminder,
            ReminderSettings,
            ReminderLog,
            Invoice,
            Tenant,
        ]),
    ],
    controllers: [RemindersController, ReminderSettingsController, ReminderAnalyticsController],
    providers: [RemindersService, ReminderSettingsService, ReminderLogService],
    exports: [RemindersService, ReminderSettingsService, ReminderLogService],
})
export class RemindersModule {}
