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
     * Get dashboard statistics for a company
     * Uses Redis cache with 5-minute TTL for improved performance
     */
    async getStats(companyId: string): Promise<DashboardStatsDto> {
        const cacheKey = `dashboard:stats:${companyId}`;

        // Try to get from cache first
        const cachedStats = await this.cacheManager.get<DashboardStatsDto>(cacheKey);
        if (cachedStats) {
            return cachedStats;
        }

        // If not in cache, calculate stats
        const stats = await this.calculateStats(companyId);

        // Store in cache
        await this.cacheManager.set(cacheKey, stats, this.CACHE_TTL);

        return stats;
    }

    /**
     * Invalidate cache for a company's dashboard stats
     * Call this when data changes (new occupancy, payment, etc.)
     */
    async invalidateCache(companyId: string): Promise<void> {
        const cacheKey = `dashboard:stats:${companyId}`;
        await this.cacheManager.del(cacheKey);
    }

    /**
     * Calculate dashboard statistics (internal method)
     */
    private async calculateStats(companyId: string): Promise<DashboardStatsDto> {
        // Get total apartments
        const totalUnits = await this.apartmentRepository.count({
            where: { companyId, isActive: true }
        });

        // Get occupied units (active occupancies)
        const occupiedUnits = await this.occupancyRepository.count({
            where: { companyId, status: 'active', isActive: true }
        });

        const vacantUnits = totalUnits - occupiedUnits;
        const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

        // Get active tenants count
        const activeTenants = await this.occupancyRepository
            .createQueryBuilder('occupancy')
            .where('occupancy.companyId = :companyId', { companyId })
            .andWhere('occupancy.status = :status', { status: 'active' })
            .andWhere('occupancy.isActive = :isActive', { isActive: true })
            .getCount();

        // Calculate average rent
        const averageRentResult = await this.occupancyRepository
            .createQueryBuilder('occupancy')
            .select('AVG(occupancy.monthlyRent)', 'avgRent')
            .where('occupancy.companyId = :companyId', { companyId })
            .andWhere('occupancy.status = :status', { status: 'active' })
            .andWhere('occupancy.isActive = :isActive', { isActive: true })
            .getRawOne();

        const averageRent = averageRentResult?.avgRent || 0;

        // Calculate monthly recurring revenue
        const mrrResult = await this.occupancyRepository
            .createQueryBuilder('occupancy')
            .select('SUM(occupancy.monthlyRent)', 'mrr')
            .where('occupancy.companyId = :companyId', { companyId })
            .andWhere('occupancy.status = :status', { status: 'active' })
            .andWhere('occupancy.isActive = :isActive', { isActive: true })
            .getRawOne();

        const monthlyRecurringRevenue = mrrResult?.mrr || 0;

        // Calculate total revenue (sum of all paid invoices)
        const totalRevenueResult = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .select('SUM(invoice.amountPaid)', 'totalRevenue')
            .where('invoice.companyId = :companyId', { companyId })
            .andWhere('invoice.isActive = :isActive', { isActive: true })
            .getRawOne();

        const totalRevenue = totalRevenueResult?.totalRevenue || 0;

        // Calculate outstanding amount (unpaid)
        const outstandingResult = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .select('SUM(invoice.totalAmount - invoice.amountPaid)', 'outstanding')
            .where('invoice.companyId = :companyId', { companyId })
            .andWhere('invoice.status != :status', { status: 'paid' })
            .andWhere('invoice.isActive = :isActive', { isActive: true })
            .getRawOne();

        const outstandingAmount = outstandingResult?.outstanding || 0;

        // Calculate collection rate
        const totalInvoicedResult = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .select('SUM(invoice.totalAmount)', 'totalInvoiced')
            .where('invoice.companyId = :companyId', { companyId })
            .andWhere('invoice.isActive = :isActive', { isActive: true })
            .getRawOne();

        const totalInvoiced = totalInvoicedResult?.totalInvoiced || 0;
        const collectionRate =
            totalInvoiced > 0 ? (totalRevenue / totalInvoiced) * 100 : 0;

        // Get overdue invoices
        const now = new Date();
        const overdueInvoices = await this.invoiceRepository.count({
            where: {
                companyId,
                dueDate: LessThan(now),
                status: 'sent',
                isActive: true
            }
        });

        // Calculate overdue amount
        const overdueAmountResult = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .select('SUM(invoice.totalAmount - invoice.amountPaid)', 'overdueAmount')
            .where('invoice.companyId = :companyId', { companyId })
            .andWhere('invoice.dueDate < :now', { now })
            .andWhere('invoice.status = :status', { status: 'sent' })
            .andWhere('invoice.isActive = :isActive', { isActive: true })
            .getRawOne();

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
