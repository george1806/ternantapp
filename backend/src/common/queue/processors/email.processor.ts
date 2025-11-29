import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

/**
 * Email Queue Processor
 * Processes email sending jobs asynchronously
 * Note: EmailService integration ready for implementation
 * Current implementation logs email sending for testing purposes
 *
 * Author: george1806
 */
@Processor('emails')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(job: Job<any>): Promise<void> {
    this.logger.log(`Processing email job ${job.id}: ${job.data.subject}`);

    try {
      const { to, subject, template, data } = job.data;

      // Email sending placeholder - ready for EmailService integration
      this.logger.log(`Email sent to ${to} with subject: ${subject}, template: ${template}`);

      // Simulate processing time to avoid tight loops
      await new Promise((resolve) => setTimeout(resolve, 100));

      this.logger.log(`Email job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(`Email job ${job.id} failed:`, error);
      throw error; // BullMQ will handle retries
    }
  }
}
