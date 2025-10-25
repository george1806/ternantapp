import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailService } from '../../email/services/email.service';

/**
 * Reminder Queue Processor
 * Processes reminder sending jobs asynchronously
 *
 * Author: george1806
 */
@Processor('reminders')
export class ReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(ReminderProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<any>): Promise<void> {
    this.logger.log(`Processing reminder job ${job.id}: ${job.data.type}`);

    try {
      const { type, companyId, invoiceId, tenantId } = job.data;

      switch (type) {
        case 'due-soon':
          await this.sendDueSoonReminder(companyId, invoiceId);
          break;
        case 'overdue':
          await this.sendOverdueReminder(companyId, invoiceId);
          break;
        case 'welcome':
          await this.sendWelcomeMessage(companyId, tenantId);
          break;
        case 'receipt':
          await this.sendPaymentReceipt(job.data);
          break;
        default:
          this.logger.warn(`Unknown reminder job type: ${type}`);
      }

      this.logger.log(`Reminder job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(`Reminder job ${job.id} failed:`, error);
      throw error;
    }
  }

  private async sendDueSoonReminder(companyId: string, invoiceId: string): Promise<void> {
    this.logger.log(`Sending due soon reminder for invoice ${invoiceId}`);

    const { recipient, subject, message, metadata } = this.extractJobData();

    await this.emailService.sendMail({
      to: recipient,
      subject,
      html: message,
      context: metadata,
    });
  }

  private async sendOverdueReminder(companyId: string, invoiceId: string): Promise<void> {
    this.logger.log(`Sending overdue reminder for invoice ${invoiceId}`);

    const { recipient, subject, message, metadata } = this.extractJobData();

    await this.emailService.sendMail({
      to: recipient,
      subject,
      html: message,
      context: metadata,
    });
  }

  private async sendWelcomeMessage(companyId: string, tenantId: string): Promise<void> {
    this.logger.log(`Sending welcome message to tenant ${tenantId}`);

    const { recipient, subject, message, metadata } = this.extractJobData();

    await this.emailService.sendMail({
      to: recipient,
      subject,
      html: message,
      context: metadata,
    });
  }

  private async sendPaymentReceipt(data: any): Promise<void> {
    this.logger.log(`Sending payment receipt for payment ${data.paymentId}`);

    await this.emailService.sendMail({
      to: data.recipient,
      subject: data.subject,
      html: data.message,
      context: data.metadata,
    });
  }

  private extractJobData(): any {
    // This would be populated from job.data in the actual process method
    // For now, return empty object as placeholder
    return {};
  }
}
