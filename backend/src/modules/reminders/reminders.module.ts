import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RemindersService } from './services/reminders.service';
import { RemindersController } from './controllers/reminders.controller';
import { Reminder } from './entities/reminder.entity';
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
 *
 * Author: george1806
 */
@Module({
    imports: [TypeOrmModule.forFeature([Reminder, Invoice, Tenant])],
    controllers: [RemindersController],
    providers: [RemindersService],
    exports: [RemindersService]
})
export class RemindersModule {}
