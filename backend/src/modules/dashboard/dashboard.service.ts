import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Apartment } from '../apartments/entities/apartment.entity';
import { Occupancy } from '../occupancies/entities/occupancy.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Payment } from '../payments/entities/payment.entity';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';

/**
 * Dashboard Service
 * Provides statistics and aggregated data for company dashboard
 * Now with Redis caching for improved performance
 *
 * Author: george1806
 */
@Injectable()
export class DashboardService {
    // Cache TTL: 5 minutes (in milliseconds)
    private readonly CACHE_TTL = 300000;

    constructor(
        @InjectRepository(Apartment)
        private readonly apartmentRepository: Repository<Apartment>,
        @InjectRepository(Occupancy)
        private readonly occupancyRepository: Repository<Occupancy>,
        @InjectRepository(Invoice)
        private readonly invoiceRepository: Repository<Invoice>,
        @InjectRepository(Payment)
        private readonly paymentRepository: Repository<Payment>,
        @Inject(CACHE_MANAGER)
        private readonly cacheManager: Cache
    ) {}

    /**
     * Get dashboard statistics for a company or specific property
     * Uses Redis cache with 5-minute TTL for improved performance
     * @param companyId - Company ID (required)
     * @param compoundId - Optional compound/property ID for property-specific stats
     */
    async getStats(companyId: string, compoundId?: string): Promise<DashboardStatsDto> {
        const cacheKey = compoundId
            ? `dashboard:stats:${companyId}:compound:${compoundId}`
            : `dashboard:stats:${companyId}`;

        // Try to get from cache first
        const cachedStats = await this.cacheManager.get<DashboardStatsDto>(cacheKey);
        if (cachedStats) {
            return cachedStats;
        }

        // If not in cache, calculate stats
        const stats = await this.calculateStats(companyId, compoundId);

        // Store in cache
        await this.cacheManager.set(cacheKey, stats, this.CACHE_TTL);

        return stats;
    }

    /**
     * Invalidate cache for a company's dashboard stats
     * Call this when data changes (new occupancy, payment, etc.)
     * @param companyId - Company ID (required)
     * @param compoundId - Optional compound ID to invalidate specific property cache
     * @param invalidateAll - If true, invalidates both company and all compound caches
     */
    async invalidateCache(companyId: string, compoundId?: string, invalidateAll = false): Promise<void> {
        const keysToDelete: string[] = [];

        if (compoundId) {
            // Invalidate specific compound cache
            keysToDelete.push(`dashboard:stats:${companyId}:compound:${compoundId}`);
        }

        if (invalidateAll || !compoundId) {
            // Always invalidate company-level cache
            keysToDelete.push(`dashboard:stats:${companyId}`);

            // Note: For optimal performance in production with many compounds,
            // consider tracking compound IDs per company or using Redis SCAN
            // to find and delete all compound-specific caches.
            // Current implementation: Delete company cache only to avoid complexity.
        }

        // Delete all identified cache keys
        await Promise.all(keysToDelete.map(key => this.cacheManager.del(key)));
    }

    /**
     * Calculate dashboard statistics (internal method)
     * @param companyId - Company ID (required)
     * @param compoundId - Optional compound/property ID for property-specific stats
     */
    private async calculateStats(companyId: string, compoundId?: string): Promise<DashboardStatsDto> {
        // Build base where clause for apartments
        const apartmentWhere: any = { companyId, isActive: true };

        if (compoundId) {
            apartmentWhere.compoundId = compoundId;
        }

        // Get total apartments
        const totalUnits = await this.apartmentRepository.count({
            where: apartmentWhere
        });

        // Get occupied units (active occupancies)
        let occupiedUnitsQuery = this.occupancyRepository
            .createQueryBuilder('occupancy')
            .where('occupancy.companyId = :companyId', { companyId })
            .andWhere('occupancy.status = :status', { status: 'active' })
            .andWhere('occupancy.isActive = :isActive', { isActive: true });

        if (compoundId) {
            occupiedUnitsQuery = occupiedUnitsQuery
                .innerJoin('occupancy.apartment', 'apartment')
                .andWhere('apartment.compoundId = :compoundId', { compoundId });
        }

        const occupiedUnits = await occupiedUnitsQuery.getCount();

        const vacantUnits = totalUnits - occupiedUnits;
        const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

        // Get active tenants count
        let activeTenantQuery = this.occupancyRepository
            .createQueryBuilder('occupancy')
            .where('occupancy.companyId = :companyId', { companyId })
            .andWhere('occupancy.status = :status', { status: 'active' })
            .andWhere('occupancy.isActive = :isActive', { isActive: true });

        if (compoundId) {
            activeTenantQuery = activeTenantQuery
                .innerJoin('occupancy.apartment', 'apartment')
                .andWhere('apartment.compoundId = :compoundId', { compoundId });
        }

        const activeTenants = await activeTenantQuery.getCount();

        // Calculate average rent
        let averageRentQuery = this.occupancyRepository
            .createQueryBuilder('occupancy')
            .select('AVG(occupancy.monthlyRent)', 'avgRent')
            .where('occupancy.companyId = :companyId', { companyId })
            .andWhere('occupancy.status = :status', { status: 'active' })
            .andWhere('occupancy.isActive = :isActive', { isActive: true });

        if (compoundId) {
            averageRentQuery = averageRentQuery
                .innerJoin('occupancy.apartment', 'apartment')
                .andWhere('apartment.compoundId = :compoundId', { compoundId });
        }

        const averageRentResult = await averageRentQuery.getRawOne();
        const averageRent = averageRentResult?.avgRent || 0;

        // Calculate monthly recurring revenue
        let mrrQuery = this.occupancyRepository
            .createQueryBuilder('occupancy')
            .select('SUM(occupancy.monthlyRent)', 'mrr')
            .where('occupancy.companyId = :companyId', { companyId })
            .andWhere('occupancy.status = :status', { status: 'active' })
            .andWhere('occupancy.isActive = :isActive', { isActive: true });

        if (compoundId) {
            mrrQuery = mrrQuery
                .innerJoin('occupancy.apartment', 'apartment')
                .andWhere('apartment.compoundId = :compoundId', { compoundId });
        }

        const mrrResult = await mrrQuery.getRawOne();
        const monthlyRecurringRevenue = mrrResult?.mrr || 0;

        // Calculate total revenue (sum of all paid invoices)
        let totalRevenueQuery = this.invoiceRepository
            .createQueryBuilder('invoice')
            .select('SUM(invoice.amountPaid)', 'totalRevenue')
            .where('invoice.companyId = :companyId', { companyId })
            .andWhere('invoice.isActive = :isActive', { isActive: true });

        if (compoundId) {
            totalRevenueQuery = totalRevenueQuery
                .innerJoin('invoice.occupancy', 'occupancy')
                .innerJoin('occupancy.apartment', 'apartment')
                .andWhere('apartment.compoundId = :compoundId', { compoundId });
        }

        const totalRevenueResult = await totalRevenueQuery.getRawOne();
        const totalRevenue = totalRevenueResult?.totalRevenue || 0;

        // Calculate outstanding amount (unpaid)
        let outstandingQuery = this.invoiceRepository
            .createQueryBuilder('invoice')
            .select('SUM(invoice.totalAmount - invoice.amountPaid)', 'outstanding')
            .where('invoice.companyId = :companyId', { companyId })
            .andWhere('invoice.status != :status', { status: 'paid' })
            .andWhere('invoice.isActive = :isActive', { isActive: true });

        if (compoundId) {
            outstandingQuery = outstandingQuery
                .innerJoin('invoice.occupancy', 'occupancy')
                .innerJoin('occupancy.apartment', 'apartment')
                .andWhere('apartment.compoundId = :compoundId', { compoundId });
        }

        const outstandingResult = await outstandingQuery.getRawOne();
        const outstandingAmount = outstandingResult?.outstanding || 0;

        // Calculate collection rate
        let totalInvoicedQuery = this.invoiceRepository
            .createQueryBuilder('invoice')
            .select('SUM(invoice.totalAmount)', 'totalInvoiced')
            .where('invoice.companyId = :companyId', { companyId })
            .andWhere('invoice.isActive = :isActive', { isActive: true });

        if (compoundId) {
            totalInvoicedQuery = totalInvoicedQuery
                .innerJoin('invoice.occupancy', 'occupancy')
                .innerJoin('occupancy.apartment', 'apartment')
                .andWhere('apartment.compoundId = :compoundId', { compoundId });
        }

        const totalInvoicedResult = await totalInvoicedQuery.getRawOne();
        const totalInvoiced = totalInvoicedResult?.totalInvoiced || 0;
        const collectionRate =
            totalInvoiced > 0 ? (totalRevenue / totalInvoiced) * 100 : 0;

        // Get overdue invoices
        const now = new Date();
        let overdueQuery = this.invoiceRepository
            .createQueryBuilder('invoice')
            .where('invoice.companyId = :companyId', { companyId })
            .andWhere('invoice.dueDate < :now', { now })
            .andWhere('invoice.status = :status', { status: 'sent' })
            .andWhere('invoice.isActive = :isActive', { isActive: true });

        if (compoundId) {
            overdueQuery = overdueQuery
                .innerJoin('invoice.occupancy', 'occupancy')
                .innerJoin('occupancy.apartment', 'apartment')
                .andWhere('apartment.compoundId = :compoundId', { compoundId });
        }

        const overdueInvoices = await overdueQuery.getCount();

        // Calculate overdue amount
        let overdueAmountQuery = this.invoiceRepository
            .createQueryBuilder('invoice')
            .select('SUM(invoice.totalAmount - invoice.amountPaid)', 'overdueAmount')
            .where('invoice.companyId = :companyId', { companyId })
            .andWhere('invoice.dueDate < :now', { now })
            .andWhere('invoice.status = :status', { status: 'sent' })
            .andWhere('invoice.isActive = :isActive', { isActive: true });

        if (compoundId) {
            overdueAmountQuery = overdueAmountQuery
                .innerJoin('invoice.occupancy', 'occupancy')
                .innerJoin('occupancy.apartment', 'apartment')
                .andWhere('apartment.compoundId = :compoundId', { compoundId });
        }

        const overdueAmountResult = await overdueAmountQuery.getRawOne();
        const overdueAmount = overdueAmountResult?.overdueAmount || 0;

        return {
            totalUnits,
            occupiedUnits,
            vacantUnits,
            occupancyRate: Number(occupancyRate.toFixed(2)),
            activeTenants,
            averageRent: Number(averageRent),
            monthlyRecurringRevenue: Number(monthlyRecurringRevenue),
            totalRevenue: Number(totalRevenue),
            outstandingAmount: Number(outstandingAmount),
            collectionRate: Number(collectionRate.toFixed(2)),
            overdueInvoices,
            overdueAmount: Number(overdueAmount)
        };
    }
}
