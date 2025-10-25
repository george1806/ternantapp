import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

/**
 * Email Queue Processor
 * Processes email sending jobs asynchronously
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

      // TODO: Integrate with EmailService when implemented
      this.logger.log(`Email to ${to} would be sent here`);

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 100));

      this.logger.log(`Email job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(`Email job ${job.id} failed:`, error);
      throw error; // BullMQ will handle retries
    }
  }
}
