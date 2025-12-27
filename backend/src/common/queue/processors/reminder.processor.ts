import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailService } from '../../email/services/email.service';

/**
 * Reminder Queue Processor
 * Processes reminder sending jobs asynchronously
 *
 * Features:
 * - Template-based email rendering (MJML + Handlebars)
 * - Complete audit logging via ReminderLogService
 * - Automatic status updates
 * - Error handling and retry support
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
      const { type } = job.data;

      // Send email using appropriate method
      let emailResult;
      switch (type) {
        case 'DUE_SOON':
          emailResult = await this.sendDueSoonReminder(job.data);
          break;
        case 'OVERDUE':
          emailResult = await this.sendOverdueReminder(job.data);
          break;
        case 'WELCOME':
          emailResult = await this.sendWelcomeMessage(job.data);
          break;
        case 'RECEIPT':
          emailResult = await this.sendPaymentReceipt(job.data);
          break;
        default:
          this.logger.warn(`Unknown reminder job type: ${type}`);
          return;
      }

      this.logger.log(
        `Reminder job ${job.id} completed successfully. MessageID: ${emailResult.messageId}, Provider: ${emailResult.provider}`
      );
    } catch (error) {
      this.logger.error(`Reminder job ${job.id} failed:`, error);
      throw error; // BullMQ will handle retry logic
    }
  }

  private async sendDueSoonReminder(data: any): Promise<{ messageId: string; provider: string }> {
    this.logger.log(`Sending due soon reminder for invoice ${data.invoiceId}`);

    // Use template from metadata or default
    const template = data.metadata?.templateName || 'rent-due-soon';

    return await this.emailService.sendMail({
      to: data.recipient,
      subject: data.subject,
      template,
      context: data.metadata,
    });
  }

  private async sendOverdueReminder(data: any): Promise<{ messageId: string; provider: string }> {
    this.logger.log(`Sending overdue reminder for invoice ${data.invoiceId}`);

    // Use template from metadata (includes escalation level)
    const template = data.metadata?.templateName || 'rent-overdue';

    this.logger.debug(`Using template: ${template} for escalation: ${data.metadata?.escalationLevel}`);

    return await this.emailService.sendMail({
      to: data.recipient,
      subject: data.subject,
      template,
      context: data.metadata,
    });
  }

  private async sendWelcomeMessage(data: any): Promise<{ messageId: string; provider: string }> {
    this.logger.log(`Sending welcome message to tenant ${data.tenantId}`);

    const template = data.metadata?.templateName || 'tenant-welcome';

    return await this.emailService.sendMail({
      to: data.recipient,
      subject: data.subject,
      template,
      context: data.metadata,
    });
  }

  private async sendPaymentReceipt(data: any): Promise<{ messageId: string; provider: string }> {
    this.logger.log(`Sending payment receipt for payment ${data.paymentId}`);

    const template = data.metadata?.templateName || 'payment-receipt';

    return await this.emailService.sendMail({
      to: data.recipient,
      subject: data.subject,
      template,
      context: data.metadata,
    });
  }
}
