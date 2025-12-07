import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { EmailProcessor } from './processors/email.processor';
import { InvoiceProcessor } from './processors/invoice.processor';
import { ReminderProcessor } from './processors/reminder.processor';
import { InvoicesModule } from '../../modules/invoices/invoices.module';

/**
 * Queue Module
 * Global module for BullMQ queue management
 *
 * Provides job queues for:
 * - Email sending
 * - Invoice generation
 * - Reminder notifications
 *
 * Author: george1806
 */
@Global()
@Module({
  imports: [
    // Configure BullMQ with Redis connection
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get<number>('REDIS_DB', 0) + 1, // Use different DB for queues
        },
      }),
      inject: [ConfigService],
    }),

    // Register job queues
    BullModule.registerQueue(
      { name: 'emails' },
      { name: 'invoices' },
      { name: 'reminders' },
    ),

    // Import modules needed by processors
    InvoicesModule,
  ],
  providers: [EmailProcessor, InvoiceProcessor, ReminderProcessor],
  exports: [BullModule],
})
export class QueueModule {}
