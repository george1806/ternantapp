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
          await this.sendDueSoonReminder(job.data);
          break;
        case 'overdue':
          await this.sendOverdueReminder(job.data);
          break;
        case 'welcome':
          await this.sendWelcomeMessage(job.data);
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

  private async sendDueSoonReminder(data: any): Promise<void> {
    this.logger.log(`Sending due soon reminder for invoice ${data.invoiceId}`);

    await this.emailService.sendMail({
      to: data.recipient,
      subject: data.subject,
      html: data.message,
      context: data.metadata,
    });
  }

  private async sendOverdueReminder(data: any): Promise<void> {
    this.logger.log(`Sending overdue reminder for invoice ${data.invoiceId}`);

    await this.emailService.sendMail({
      to: data.recipient,
      subject: data.subject,
      html: data.message,
      context: data.metadata,
    });
  }

  private async sendWelcomeMessage(data: any): Promise<void> {
    this.logger.log(`Sending welcome message to tenant ${data.tenantId}`);

    await this.emailService.sendMail({
      to: data.recipient,
      subject: data.subject,
      html: data.message,
      context: data.metadata,
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
}
