import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { ReportSnapshot } from '../entities/report-snapshot.entity';
import { ReportsService } from './reports.service';

/**
 * Snapshot Service
 * Handles historical report snapshot generation and retrieval
 *
 * Features:
 * - Generate monthly snapshots of KPIs
 * - Retrieve historical trends
 * - Backfill historical data
 * - Automated snapshot management
 *
 * Author: george1806
 */
@Injectable()
export class SnapshotService {
    private readonly logger = new Logger(SnapshotService.name);

    constructor(
        @InjectRepository(ReportSnapshot)
        private readonly snapshotRepo: Repository<ReportSnapshot>,
        private readonly reportsService: ReportsService
    ) {}

    /**
     * Generate a monthly snapshot for a company
     * Called by cron job or manually for backfilling
     */
    async generateMonthlySnapshot(
        companyId: string,
        date: Date = new Date()
    ): Promise<ReportSnapshot> {
        this.logger.log(`Generating monthly snapshot for company ${companyId} for ${date.toISOString()}`);

        try {
            // Get current KPIs
            const kpis = await this.reportsService.getDashboardKpis(companyId);

            // Normalize date to first of month
            const snapshotDate = new Date(date.getFullYear(), date.getMonth(), 1);

            // Check if snapshot already exists
            const existingSnapshot = await this.snapshotRepo.findOne({
                where: {
                    companyId,
                    snapshotDate,
                    snapshotType: 'monthly'
                }
            });

            if (existingSnapshot) {
                this.logger.warn(
                    `Snapshot already exists for ${companyId} on ${snapshotDate.toISOString()}, updating...`
                );

                // Update existing snapshot
                existingSnapshot.totalUnits = kpis.totalUnits;
                existingSnapshot.occupiedUnits = kpis.occupiedUnits;
                existingSnapshot.vacantUnits = kpis.vacantUnits;
                existingSnapshot.maintenanceUnits = kpis.maintenanceUnits;
                existingSnapshot.occupancyRate = kpis.occupancyRate;
                existingSnapshot.totalRevenue = kpis.totalRevenue;
                existingSnapshot.monthlyRevenue = kpis.monthlyRevenue;
                existingSnapshot.collectedRevenue = kpis.totalRevenue - kpis.outstandingAmount;
                existingSnapshot.outstandingRevenue = kpis.outstandingAmount;
                existingSnapshot.collectionRate = kpis.collectionRate;
                existingSnapshot.activeTenants = kpis.activeTenants;
                existingSnapshot.activeLeases = kpis.activeLeases;
                existingSnapshot.pendingInvoices = kpis.pendingInvoices;
                existingSnapshot.overdueInvoices = kpis.overdueInvoices;
                existingSnapshot.overdueAmount = kpis.overdueAmount;
                existingSnapshot.expiringLeases30Days = kpis.expiringLeases;

                return await this.snapshotRepo.save(existingSnapshot);
            }

            // Create new snapshot
            const snapshot = this.snapshotRepo.create({
                companyId,
                snapshotDate,
                snapshotType: 'monthly',
                totalUnits: kpis.totalUnits,
                occupiedUnits: kpis.occupiedUnits,
                vacantUnits: kpis.vacantUnits,
                maintenanceUnits: kpis.maintenanceUnits,
                occupancyRate: kpis.occupancyRate,
                totalRevenue: kpis.totalRevenue,
                monthlyRevenue: kpis.monthlyRevenue,
                collectedRevenue: kpis.totalRevenue - kpis.outstandingAmount,
                outstandingRevenue: kpis.outstandingAmount,
                collectionRate: kpis.collectionRate,
                activeTenants: kpis.activeTenants,
                activeLeases: kpis.activeLeases,
                pendingInvoices: kpis.pendingInvoices,
                overdueInvoices: kpis.overdueInvoices,
                overdueAmount: kpis.overdueAmount,
                expiringLeases30Days: kpis.expiringLeases,
                expiringLeases60Days: 0, // Can be enhanced later
                expiringLeases90Days: 0 // Can be enhanced later
            });

            const savedSnapshot = await this.snapshotRepo.save(snapshot);
            this.logger.log(`Successfully generated snapshot for company ${companyId}`);

            return savedSnapshot;
        } catch (error) {
            this.logger.error(
                `Failed to generate snapshot for company ${companyId}:`,
                error.stack
            );
            throw error;
        }
    }

    /**
     * Get historical trend data for a company
     * Returns snapshots for the specified number of months
     */
    async getHistoricalTrend(
        companyId: string,
        months: number = 12
    ): Promise<ReportSnapshot[]> {
        this.logger.debug(`Fetching ${months} months of historical data for company ${companyId}`);

        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);
        startDate.setDate(1); // First of month

        return await this.snapshotRepo.find({
            where: {
                companyId,
                snapshotType: 'monthly',
                snapshotDate: MoreThanOrEqual(startDate)
            },
            order: { snapshotDate: 'ASC' }
        });
    }

    /**
     * Backfill historical snapshots for a company
     * Generates snapshots for the past N months
     */
    async backfillSnapshots(
        companyId: string,
        months: number = 12
    ): Promise<ReportSnapshot[]> {
        this.logger.log(`Backfilling ${months} months of snapshots for company ${companyId}`);

        const snapshots: ReportSnapshot[] = [];
        const today = new Date();

        for (let i = 0; i < months; i++) {
            const date = new Date(today);
            date.setMonth(date.getMonth() - i);
            date.setDate(1); // First of month

            try {
                const snapshot = await this.generateMonthlySnapshot(companyId, date);
                snapshots.push(snapshot);
            } catch (error) {
                this.logger.error(
                    `Failed to backfill snapshot for ${date.toISOString()}:`,
                    error.message
                );
                // Continue with other months
            }
        }

        this.logger.log(
            `Successfully backfilled ${snapshots.length} snapshots for company ${companyId}`
        );

        return snapshots;
    }

    /**
     * Delete old snapshots (cleanup)
     * Keeps only the specified number of months
     */
    async cleanupOldSnapshots(
        companyId: string,
        keepMonths: number = 24
    ): Promise<number> {
        this.logger.log(`Cleaning up snapshots older than ${keepMonths} months for company ${companyId}`);

        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - keepMonths);
        cutoffDate.setDate(1);

        const result = await this.snapshotRepo
            .createQueryBuilder()
            .delete()
            .from(ReportSnapshot)
            .where('companyId = :companyId', { companyId })
            .andWhere('snapshotDate < :cutoffDate', { cutoffDate })
            .execute();

        this.logger.log(`Deleted ${result.affected || 0} old snapshots for company ${companyId}`);

        return result.affected || 0;
    }

    /**
     * Get latest snapshot for a company
     */
    async getLatestSnapshot(companyId: string): Promise<ReportSnapshot | null> {
        return await this.snapshotRepo.findOne({
            where: { companyId, snapshotType: 'monthly' },
            order: { snapshotDate: 'DESC' }
        });
    }

    /**
     * Check if snapshot exists for a specific date
     */
    async snapshotExists(
        companyId: string,
        date: Date
    ): Promise<boolean> {
        const snapshotDate = new Date(date.getFullYear(), date.getMonth(), 1);

        const count = await this.snapshotRepo.count({
            where: {
                companyId,
                snapshotDate,
                snapshotType: 'monthly'
            }
        });

        return count > 0;
    }
}
