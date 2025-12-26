import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ReminderLog, ReminderLogStatus } from '../entities/reminder-log.entity';
import { ReminderType } from '../../../common/enums';

/**
 * Reminder Log Service
 *
 * Handles logging and audit trail for all reminder emails.
 * Tracks delivery status, failures, and provides analytics data.
 *
 * Author: george1806
 */
@Injectable()
export class ReminderLogService {
    private readonly logger = new Logger(ReminderLogService.name);

    constructor(
        @InjectRepository(ReminderLog)
        private readonly logRepository: Repository<ReminderLog>,
    ) {}

    /**
     * Create a log entry for a queued reminder
     */
    async logQueued(
        companyId: string,
        reminderId: string,
        type: ReminderType,
        recipient: string,
        subject: string,
        metadata?: any,
    ): Promise<ReminderLog> {
        const log = this.logRepository.create({
            companyId,
            reminderId,
            type,
            recipient,
            subject,
            status: ReminderLogStatus.QUEUED,
            metadata,
            queuedAt: new Date(),
            attempts: 0,
        });

        return this.logRepository.save(log);
    }

    /**
     * Mark a log entry as sent
     */
    async logSent(
        reminderId: string,
        messageId: string,
        provider: string,
    ): Promise<ReminderLog | null> {
        const log = await this.logRepository.findOne({
            where: { reminderId },
            order: { createdAt: 'DESC' },
        });

        if (!log) {
            this.logger.warn(`No log found for reminder ${reminderId}`);
            return null;
        }

        log.status = ReminderLogStatus.SENT;
        log.messageId = messageId;
        log.sentAt = new Date();
        log.metadata = {
            ...log.metadata,
            provider,
        };

        return this.logRepository.save(log);
    }

    /**
     * Mark a log entry as delivered (webhook notification)
     */
    async logDelivered(messageId: string): Promise<ReminderLog | null> {
        const log = await this.logRepository.findOne({
            where: { messageId },
        });

        if (!log) {
            this.logger.warn(`No log found for message ${messageId}`);
            return null;
        }

        log.status = ReminderLogStatus.DELIVERED;
        log.deliveredAt = new Date();

        return this.logRepository.save(log);
    }

    /**
     * Mark a log entry as failed
     */
    async logFailed(
        reminderId: string,
        failureReason: string,
    ): Promise<ReminderLog | null> {
        const log = await this.logRepository.findOne({
            where: { reminderId },
            order: { createdAt: 'DESC' },
        });

        if (!log) {
            this.logger.warn(`No log found for reminder ${reminderId}`);
            return null;
        }

        log.status = ReminderLogStatus.FAILED;
        log.failureReason = failureReason;
        log.failedAt = new Date();
        log.attempts += 1;

        return this.logRepository.save(log);
    }

    /**
     * Mark a log entry as bounced
     */
    async logBounced(messageId: string, reason: string): Promise<ReminderLog | null> {
        const log = await this.logRepository.findOne({
            where: { messageId },
        });

        if (!log) {
            this.logger.warn(`No log found for message ${messageId}`);
            return null;
        }

        log.status = ReminderLogStatus.BOUNCED;
        log.failureReason = reason;
        log.failedAt = new Date();

        return this.logRepository.save(log);
    }

    /**
     * Get logs for a specific reminder
     */
    async getLogsForReminder(reminderId: string): Promise<ReminderLog[]> {
        return this.logRepository.find({
            where: { reminderId },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Get logs for a company with optional date range
     */
    async getLogsForCompany(
        companyId: string,
        startDate?: Date,
        endDate?: Date,
    ): Promise<ReminderLog[]> {
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
        deliveryRate: number;
        failureRate: number;
    }> {
        const logs = await this.getLogsForCompany(companyId, startDate, endDate);

        const total = logs.length;
        const sent = logs.filter((l) => l.status === ReminderLogStatus.SENT).length;
        const delivered = logs.filter((l) => l.status === ReminderLogStatus.DELIVERED).length;
        const failed = logs.filter((l) => l.status === ReminderLogStatus.FAILED).length;
        const bounced = logs.filter((l) => l.status === ReminderLogStatus.BOUNCED).length;

        return {
            total,
            sent,
            delivered,
            failed,
            bounced,
            deliveryRate: total > 0 ? ((sent + delivered) / total) * 100 : 0,
            failureRate: total > 0 ? ((failed + bounced) / total) * 100 : 0,
        };
    }

    /**
     * Get average processing time for sent emails
     */
    async getAverageProcessingTime(
        companyId: string,
        startDate?: Date,
        endDate?: Date,
    ): Promise<number | null> {
        const logs = await this.getLogsForCompany(companyId, startDate, endDate);

        const processingTimes = logs
            .filter((l) => l.queuedAt && l.sentAt)
            .map((l) => l.getProcessingTime())
            .filter((t) => t !== null) as number[];

        if (processingTimes.length === 0) {
            return null;
        }

        const sum = processingTimes.reduce((a, b) => a + b, 0);
        return sum / processingTimes.length;
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
     * Clean up old logs (older than 90 days)
     */
    async cleanupOldLogs(companyId: string, daysToKeep: number = 90): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const result = await this.logRepository
            .createQueryBuilder()
            .delete()
            .from(ReminderLog)
            .where('companyId = :companyId', { companyId })
            .andWhere('createdAt < :cutoffDate', { cutoffDate })
            .execute();

        this.logger.log(`Cleaned up ${result.affected} old logs for company ${companyId}`);
        return result.affected || 0;
    }
}
