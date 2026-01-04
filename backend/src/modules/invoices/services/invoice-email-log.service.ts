import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { InvoiceEmailLog, InvoiceEmailLogStatus } from '../entities/invoice-email-log.entity';

/**
 * Invoice Email Log Service
 *
 * Handles logging and audit trail for all invoice emails.
 * Tracks delivery status, failures, and provides send history.
 *
 * Author: george1806
 */
@Injectable()
export class InvoiceEmailLogService {
    private readonly logger = new Logger(InvoiceEmailLogService.name);

    constructor(
        @InjectRepository(InvoiceEmailLog)
        private readonly logRepository: Repository<InvoiceEmailLog>,
    ) {}

    /**
     * Create a log entry for sent invoice
     */
    async logSent(
        companyId: string,
        invoiceId: string,
        recipient: string,
        subject: string,
        messageId: string,
        isResend: boolean,
        metadata?: any,
    ): Promise<InvoiceEmailLog> {
        const log = this.logRepository.create({
            companyId,
            invoiceId,
            recipient,
            subject,
            messageId,
            isResend,
            status: InvoiceEmailLogStatus.SENT,
            metadata,
            queuedAt: new Date(),
            sentAt: new Date(),
            attempts: 1,
        });

        return this.logRepository.save(log);
    }

    /**
     * Create a log entry for failed invoice send
     */
    async logFailed(
        companyId: string,
        invoiceId: string,
        recipient: string,
        subject: string,
        failureReason: string,
        isResend: boolean,
        metadata?: any,
    ): Promise<InvoiceEmailLog> {
        const log = this.logRepository.create({
            companyId,
            invoiceId,
            recipient,
            subject,
            isResend,
            status: InvoiceEmailLogStatus.FAILED,
            failureReason,
            metadata,
            queuedAt: new Date(),
            failedAt: new Date(),
            attempts: 1,
        });

        return this.logRepository.save(log);
    }

    /**
     * Mark a log entry as delivered (webhook notification)
     */
    async markAsDelivered(messageId: string): Promise<InvoiceEmailLog | null> {
        const log = await this.logRepository.findOne({
            where: { messageId },
        });

        if (!log) {
            this.logger.warn(`No log found for message ${messageId}`);
            return null;
        }

        log.status = InvoiceEmailLogStatus.DELIVERED;
        log.deliveredAt = new Date();

        return this.logRepository.save(log);
    }

    /**
     * Mark a log entry as bounced
     */
    async markAsBounced(messageId: string, reason: string): Promise<InvoiceEmailLog | null> {
        const log = await this.logRepository.findOne({
            where: { messageId },
        });

        if (!log) {
            this.logger.warn(`No log found for message ${messageId}`);
            return null;
        }

        log.status = InvoiceEmailLogStatus.BOUNCED;
        log.failureReason = reason;
        log.failedAt = new Date();

        return this.logRepository.save(log);
    }

    /**
     * Get logs for a specific invoice
     */
    async getLogsForInvoice(invoiceId: string): Promise<InvoiceEmailLog[]> {
        return this.logRepository.find({
            where: { invoiceId },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Get send count for an invoice
     */
    async getSendCount(invoiceId: string): Promise<number> {
        return this.logRepository.count({
            where: { invoiceId },
        });
    }

    /**
     * Get last sent date for an invoice
     */
    async getLastSentDate(invoiceId: string): Promise<Date | null> {
        const log = await this.logRepository.findOne({
            where: { invoiceId },
            order: { sentAt: 'DESC' },
        });

        return log?.sentAt || null;
    }

    /**
     * Get logs for a company with optional date range
     */
    async getLogsForCompany(
        companyId: string,
        startDate?: Date,
        endDate?: Date,
    ): Promise<InvoiceEmailLog[]> {
        const where: any = { companyId };

        if (startDate && endDate) {
            where.createdAt = Between(startDate, endDate);
        }

        return this.logRepository.find({
            where,
            order: { createdAt: 'DESC' },
            take: 1000, // Limit to prevent large queries
        });
    }

    /**
     * Get delivery statistics for a company
     */
    async getDeliveryStats(
        companyId: string,
        startDate?: Date,
        endDate?: Date,
    ): Promise<{
        total: number;
        sent: number;
        delivered: number;
        failed: number;
        bounced: number;
        resends: number;
        deliveryRate: number;
        failureRate: number;
    }> {
        const logs = await this.getLogsForCompany(companyId, startDate, endDate);

        const total = logs.length;
        const sent = logs.filter((l) => l.status === InvoiceEmailLogStatus.SENT).length;
        const delivered = logs.filter((l) => l.status === InvoiceEmailLogStatus.DELIVERED).length;
        const failed = logs.filter((l) => l.status === InvoiceEmailLogStatus.FAILED).length;
        const bounced = logs.filter((l) => l.status === InvoiceEmailLogStatus.BOUNCED).length;
        const resends = logs.filter((l) => l.isResend).length;

        return {
            total,
            sent,
            delivered,
            failed,
            bounced,
            resends,
            deliveryRate: total > 0 ? ((sent + delivered) / total) * 100 : 0,
            failureRate: total > 0 ? ((failed + bounced) / total) * 100 : 0,
        };
    }

    /**
     * Get failure reasons breakdown
     */
    async getFailureReasons(
        companyId: string,
        startDate?: Date,
        endDate?: Date,
    ): Promise<Record<string, number>> {
        const logs = await this.getLogsForCompany(companyId, startDate, endDate);

        const failedLogs = logs.filter((l) => l.isFailed());

        const reasons: Record<string, number> = {};
        failedLogs.forEach((log) => {
            const reason = log.failureReason || 'Unknown';
            reasons[reason] = (reasons[reason] || 0) + 1;
        });

        return reasons;
    }

    /**
     * Clean up old logs (older than specified days)
     */
    async cleanupOldLogs(companyId: string, daysToKeep: number = 90): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const result = await this.logRepository
            .createQueryBuilder()
            .delete()
            .from(InvoiceEmailLog)
            .where('companyId = :companyId', { companyId })
            .andWhere('createdAt < :cutoffDate', { cutoffDate })
            .execute();

        this.logger.log(`Cleaned up ${result.affected} old invoice email logs for company ${companyId}`);
        return result.affected || 0;
    }
}
