import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

/**
 * Invoice Queue Processor
 * Processes invoice generation jobs asynchronously
 *
 * Author: george1806
 */
@Processor('invoices')
export class InvoiceProcessor extends WorkerHost {
  private readonly logger = new Logger(InvoiceProcessor.name);

  async process(job: Job<any>): Promise<void> {
    this.logger.log(`Processing invoice job ${job.id}: ${job.data.type}`);

    try {
      const { type, companyId, month } = job.data;

      switch (type) {
        case 'generate-monthly':
          await this.generateMonthlyInvoices(companyId, month);
          break;
        case 'generate-single':
          await this.generateSingleInvoice(job.data);
          break;
        default:
          this.logger.warn(`Unknown invoice job type: ${type}`);
      }

      this.logger.log(`Invoice job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(`Invoice job ${job.id} failed:`, error);
      throw error;
    }
  }

  private async generateMonthlyInvoices(companyId: string, month: string): Promise<void> {
    this.logger.log(`Generating monthly invoices for company ${companyId}, month ${month}`);
    // TODO: Integrate with InvoicesService
  }

  private async generateSingleInvoice(data: any): Promise<void> {
    this.logger.log(`Generating single invoice for occupancy ${data.occupancyId}`);
    // TODO: Integrate with InvoicesService
  }
}
