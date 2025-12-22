import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { SnapshotService } from '../services/snapshot.service';

/**
 * Snapshot Task
 * Scheduled task for generating monthly report snapshots
 *
 * Features:
 * - Runs on the 1st of every month at midnight
 * - Generates snapshots for all active companies
 * - Error handling for individual company failures
 * - Logging for monitoring and debugging
 *
 * Author: george1806
 */
@Injectable()
export class SnapshotTask {
    private readonly logger = new Logger(SnapshotTask.name);

    constructor(
        @InjectRepository(Company)
        private readonly companyRepo: Repository<Company>,
        private readonly snapshotService: SnapshotService
    ) {}

    /**
     * Generate monthly snapshots for all companies
     * Runs on the 1st of every month at midnight (server time)
     */
    @Cron('0 0 1 * *', {
        name: 'monthly-snapshot-generation',
        timeZone: 'UTC'
    })
    async generateMonthlySnapshots(): Promise<void> {
        this.logger.log('Starting monthly snapshot generation for all companies...');

        try {
            // Get all active companies
            const companies = await this.companyRepo.find({
                where: { isActive: true }
            });

            this.logger.log(`Found ${companies.length} active companies`);

            let successCount = 0;
            let failureCount = 0;

            // Generate snapshot for each company
            for (const company of companies) {
                try {
                    await this.snapshotService.generateMonthlySnapshot(company.id);
                    successCount++;
                    this.logger.debug(`✓ Snapshot generated for company ${company.id} (${company.name})`);
                } catch (error) {
                    failureCount++;
                    this.logger.error(
                        `✗ Failed to generate snapshot for company ${company.id} (${company.name}):`,
                        error.message
                    );
                }
            }

            this.logger.log(
                `Monthly snapshot generation completed. ` +
                `Success: ${successCount}, Failed: ${failureCount}, Total: ${companies.length}`
            );
        } catch (error) {
            this.logger.error('Failed to execute monthly snapshot generation:', error.stack);
        }
    }

    /**
     * Cleanup old snapshots for all companies
     * Runs on the 2nd of every month at 2 AM (after snapshots are generated)
     * Keeps last 24 months of data
     */
    @Cron('0 2 2 * *', {
        name: 'snapshot-cleanup',
        timeZone: 'UTC'
    })
    async cleanupOldSnapshots(): Promise<void> {
        this.logger.log('Starting cleanup of old snapshots...');

        try {
            const companies = await this.companyRepo.find({
                where: { isActive: true }
            });

            let totalDeleted = 0;

            for (const company of companies) {
                try {
                    const deleted = await this.snapshotService.cleanupOldSnapshots(company.id, 24);
                    totalDeleted += deleted;

                    if (deleted > 0) {
                        this.logger.debug(
                            `Deleted ${deleted} old snapshots for company ${company.id} (${company.name})`
                        );
                    }
                } catch (error) {
                    this.logger.error(
                        `Failed to cleanup snapshots for company ${company.id}:`,
                        error.message
                    );
                }
            }

            this.logger.log(`Snapshot cleanup completed. Total deleted: ${totalDeleted}`);
        } catch (error) {
            this.logger.error('Failed to execute snapshot cleanup:', error.stack);
        }
    }

    /**
     * Manual trigger for testing (can be called via admin endpoint)
     */
    async manualSnapshot(companyId: string): Promise<void> {
        this.logger.log(`Manual snapshot generation requested for company ${companyId}`);
        await this.snapshotService.generateMonthlySnapshot(companyId);
    }
}
