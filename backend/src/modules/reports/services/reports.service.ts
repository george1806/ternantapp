import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import {
  DateRangeDto,
  KpiResponseDto,
  RevenueAnalyticsDto,
  OccupancyAnalyticsDto,
} from '../dto';
import { Apartment } from '../../apartments/entities/apartment.entity';
import { Occupancy } from '../../occupancies/entities/occupancy.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Compound } from '../../compounds/entities/compound.entity';
import { InvoiceStatus, OccupancyStatus } from '../../../common/enums';

/**
 * Reports Service
 * Handles analytics, KPIs, and reporting
 *
 * Features:
 * - Dashboard KPIs (occupancy, revenue, collection rates)
 * - Revenue analytics with trends
 * - Occupancy analytics with trends
 * - Financial metrics and statistics
 * - Redis caching for performance
 * - Configuration-driven cache TTL
 *
 * Author: george1806
 */
@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly cacheTTL: number;

  constructor(
    @InjectRepository(Apartment)
    private readonly apartmentRepository: Repository<Apartment>,
    @InjectRepository(Occupancy)
    private readonly occupancyRepository: Repository<Occupancy>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Compound)
    private readonly compoundRepository: Repository<Compound>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    this.cacheTTL = this.configService.get<number>('CACHE_TTL', 300) * 1000; // Convert to milliseconds
  }

  /**
   * Get dashboard KPIs
   */
  async getDashboardKpis(companyId: string, dateRange?: DateRangeDto): Promise<KpiResponseDto> {
    const cacheKey = `reports:kpis:${companyId}:${JSON.stringify(dateRange)}`;

    // Check cache
    const cached = await this.cacheManager.get<KpiResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`KPIs cache hit for company ${companyId}`);
      return cached;
    }

    this.logger.log(`Calculating KPIs for company ${companyId}`);

    const dateFilter = this.buildDateFilter(dateRange);

    // Total units
    const totalUnits = await this.apartmentRepository.count({
      where: { companyId },
    });

    // Occupied and vacant units (apartments with 'occupied' status)
    const occupiedUnits = await this.apartmentRepository.count({
      where: {
        companyId,
        status: 'occupied',
      },
    });

    const vacantUnits = totalUnits - occupiedUnits;
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    // Active occupancies for MRR calculation
    const activeOccupancies = await this.occupancyRepository.find({
      where: {
        companyId,
        status: 'active',
      },
      relations: ['apartment'],
    });

    const monthlyRecurringRevenue = activeOccupancies.reduce(
      (sum, occ) => sum + (occ.monthlyRent || 0),
      0,
    );

    // Active tenants
    const activeTenants = activeOccupancies.length;

    // Average rent
    const averageRent = activeTenants > 0 ? monthlyRecurringRevenue / activeTenants : 0;

    // Outstanding and overdue invoices (status: draft, sent, or overdue - not paid/cancelled)
    const outstandingInvoices = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.companyId = :companyId', { companyId })
      .andWhere('invoice.status IN (:...statuses)', { statuses: ['draft', 'sent', 'overdue'] })
      .getMany();

    const outstandingAmount = outstandingInvoices.reduce(
      (sum, inv) => sum + inv.amountDue,
      0,
    );

    const today = new Date();
    const overdueInvoices = outstandingInvoices.filter(inv => new Date(inv.dueDate) < today);
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + inv.amountDue, 0);

    // Total revenue (all invoices)
    const allInvoices = await this.invoiceRepository.find({
      where: {
        companyId,
        ...(dateFilter.invoiceDate && { invoiceDate: dateFilter.invoiceDate }),
      },
    });

    const totalRevenue = allInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = allInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
    const collectionRate = totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0;

    const kpis: KpiResponseDto = {
      totalUnits,
      occupiedUnits,
      vacantUnits,
      occupancyRate: Math.round(occupancyRate * 100) / 100,
      monthlyRecurringRevenue: Math.round(monthlyRecurringRevenue * 100) / 100,
      outstandingAmount: Math.round(outstandingAmount * 100) / 100,
      collectionRate: Math.round(collectionRate * 100) / 100,
      overdueInvoices: overdueInvoices.length,
      overdueAmount: Math.round(overdueAmount * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      activeTenants,
      averageRent: Math.round(averageRent * 100) / 100,
    };

    // Cache results
    await this.cacheManager.set(cacheKey, kpis, this.cacheTTL);

    return kpis;
  }

  /**
   * Get revenue analytics with trends
   */
  async getRevenueAnalytics(companyId: string, dateRange?: DateRangeDto): Promise<RevenueAnalyticsDto> {
    const cacheKey = `reports:revenue:${companyId}:${JSON.stringify(dateRange)}`;

    const cached = await this.cacheManager.get<RevenueAnalyticsDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Revenue analytics cache hit for company ${companyId}`);
      return cached;
    }

    this.logger.log(`Calculating revenue analytics for company ${companyId}`);

    const dateFilter = this.buildDateFilter(dateRange);

    // Get all invoices in date range
    const invoices = await this.invoiceRepository.find({
      where: {
        companyId,
        ...(dateFilter.invoiceDate && { invoiceDate: dateFilter.invoiceDate }),
      },
      order: { invoiceDate: 'ASC' },
    });

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.amountDue, 0);
    const collectionRate = totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0;

    // Monthly trend
    const monthlyData = new Map<string, { revenue: number; collected: number; outstanding: number }>();

    invoices.forEach(invoice => {
      const date = invoice.invoiceDate instanceof Date ? invoice.invoiceDate : new Date(invoice.invoiceDate);
      const month = date.toISOString().substring(0, 7); // YYYY-MM
      const existing = monthlyData.get(month) || { revenue: 0, collected: 0, outstanding: 0 };

      existing.revenue += invoice.totalAmount;
      existing.collected += invoice.amountPaid;
      existing.outstanding += invoice.amountDue;

      monthlyData.set(month, existing);
    });

    const monthlyTrend = Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        revenue: Math.round(data.revenue * 100) / 100,
        collected: Math.round(data.collected * 100) / 100,
        outstanding: Math.round(data.outstanding * 100) / 100,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Revenue by payment method
    const payments = await this.paymentRepository.find({
      where: {
        companyId,
        ...(dateFilter.paidAt && { paidAt: dateFilter.paidAt }),
      },
    });

    const methodTotals = new Map<string, number>();
    let totalPayments = 0;

    payments.forEach(payment => {
      const method = payment.method; // Payment entity uses 'method', not 'paymentMethod'
      methodTotals.set(method, (methodTotals.get(method) || 0) + payment.amount);
      totalPayments += payment.amount;
    });

    const byPaymentMethod = Array.from(methodTotals.entries()).map(([method, amount]) => ({
      method,
      amount: Math.round(amount * 100) / 100,
      percentage: Math.round((amount / totalPayments) * 10000) / 100,
    }));

    const averageMonthlyRevenue = monthlyTrend.length > 0
      ? monthlyTrend.reduce((sum, m) => sum + m.revenue, 0) / monthlyTrend.length
      : 0;

    const analytics: RevenueAnalyticsDto = {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      collectionRate: Math.round(collectionRate * 100) / 100,
      monthlyTrend,
      byPaymentMethod,
      averageMonthlyRevenue: Math.round(averageMonthlyRevenue * 100) / 100,
    };

    await this.cacheManager.set(cacheKey, analytics, this.cacheTTL);

    return analytics;
  }

  /**
   * Get occupancy analytics with trends
   */
  async getOccupancyAnalytics(companyId: string, dateRange?: DateRangeDto): Promise<OccupancyAnalyticsDto> {
    const cacheKey = `reports:occupancy:${companyId}:${JSON.stringify(dateRange)}`;

    const cached = await this.cacheManager.get<OccupancyAnalyticsDto>(cacheKey);
    if (cached) {
      this.logger.debug(`Occupancy analytics cache hit for company ${companyId}`);
      return cached;
    }

    this.logger.log(`Calculating occupancy analytics for company ${companyId}`);

    // Current occupancy
    const totalUnits = await this.apartmentRepository.count({ where: { companyId } });
    const occupiedUnits = await this.apartmentRepository.count({
      where: { companyId, status: 'occupied' },
    });
    const vacantUnits = totalUnits - occupiedUnits;
    const currentOccupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    // Average lease duration
    const completedOccupancies = await this.occupancyRepository.find({
      where: {
        companyId,
        status: 'ended',
      },
    });

    let totalDuration = 0;
    completedOccupancies.forEach(occ => {
      if (occ.moveOutDate) {
        const duration = (new Date(occ.moveOutDate).getTime() - new Date(occ.leaseStartDate).getTime()) / (1000 * 60 * 60 * 24);
        totalDuration += duration;
      }
    });

    const averageLeaseDuration = completedOccupancies.length > 0
      ? totalDuration / completedOccupancies.length / 30 // Convert to months
      : 0;

    // Turnover rate (annual)
    const dateFilter = this.buildDateFilter(dateRange);
    const endedOccupancies = await this.occupancyRepository.count({
      where: {
        companyId,
        status: 'ended',
        ...(dateFilter.moveOutDate && { moveOutDate: dateFilter.moveOutDate }),
      },
    });

    const turnoverRate = totalUnits > 0 ? (endedOccupancies / totalUnits) * 100 : 0;

    // Monthly trend (simulate - in production, you'd need historical snapshots)
    const monthlyTrend = await this.calculateMonthlyOccupancyTrend(companyId, dateRange);

    // Occupancy by compound
    const compounds = await this.compoundRepository.find({
      where: { companyId },
      relations: ['apartments'],
    });

    const byCompound = await Promise.all(
      compounds.map(async compound => {
        const compoundUnits = compound.apartments.length;
        const compoundOccupied = compound.apartments.filter(
          apt => apt.status === 'occupied',
        ).length;
        const compoundRate = compoundUnits > 0 ? (compoundOccupied / compoundUnits) * 100 : 0;

        return {
          compoundId: compound.id,
          compoundName: compound.name,
          totalUnits: compoundUnits,
          occupied: compoundOccupied,
          occupancyRate: Math.round(compoundRate * 100) / 100,
        };
      }),
    );

    const analytics: OccupancyAnalyticsDto = {
      currentOccupancyRate: Math.round(currentOccupancyRate * 100) / 100,
      totalUnits,
      occupiedUnits,
      vacantUnits,
      averageLeaseDuration: Math.round(averageLeaseDuration * 100) / 100,
      averageDaysToFill: 12, // Placeholder - would need vacancy tracking
      monthlyTrend,
      byCompound,
      turnoverRate: Math.round(turnoverRate * 100) / 100,
    };

    await this.cacheManager.set(cacheKey, analytics, this.cacheTTL);

    return analytics;
  }

  /**
   * Calculate monthly occupancy trend
   */
  private async calculateMonthlyOccupancyTrend(
    companyId: string,
    dateRange?: DateRangeDto,
  ): Promise<Array<{ month: string; occupancyRate: number; occupied: number; vacant: number }>> {
    // For a proper implementation, you'd need historical snapshots
    // This is a simplified version that shows current state

    const totalUnits = await this.apartmentRepository.count({ where: { companyId } });
    const occupiedUnits = await this.apartmentRepository.count({
      where: { companyId, status: 'occupied' },
    });
    const vacantUnits = totalUnits - occupiedUnits;
    const rate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    const currentMonth = new Date().toISOString().substring(0, 7);

    // Return current month data (in production, query historical data)
    return [
      {
        month: currentMonth,
        occupancyRate: Math.round(rate * 100) / 100,
        occupied: occupiedUnits,
        vacant: vacantUnits,
      },
    ];
  }

  /**
   * Build date filter for TypeORM queries
   */
  private buildDateFilter(dateRange?: DateRangeDto): {
    invoiceDate?: any;
    dueDate?: any;
    paidAt?: any;
    leaseStartDate?: any;
    moveOutDate?: any;
  } {
    if (!dateRange || (!dateRange.startDate && !dateRange.endDate)) {
      return {};
    }

    const filter: any = {};

    if (dateRange.startDate && dateRange.endDate) {
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);

      filter.invoiceDate = Between(start, end);
      filter.dueDate = Between(start, end);
      filter.paidAt = Between(start, end);
      filter.leaseStartDate = Between(start, end);
      filter.moveOutDate = Between(start, end);
    } else if (dateRange.startDate) {
      const start = new Date(dateRange.startDate);

      filter.invoiceDate = MoreThanOrEqual(start);
      filter.dueDate = MoreThanOrEqual(start);
      filter.paidAt = MoreThanOrEqual(start);
      filter.leaseStartDate = MoreThanOrEqual(start);
      filter.moveOutDate = MoreThanOrEqual(start);
    } else if (dateRange.endDate) {
      const end = new Date(dateRange.endDate);

      filter.invoiceDate = LessThanOrEqual(end);
      filter.dueDate = LessThanOrEqual(end);
      filter.paidAt = LessThanOrEqual(end);
      filter.leaseStartDate = LessThanOrEqual(end);
      filter.moveOutDate = LessThanOrEqual(end);
    }

    return filter;
  }

  /**
   * Clear cache for company reports
   */
  async clearCache(companyId: string): Promise<void> {
    this.logger.log(`Clearing reports cache for company ${companyId}`);

    const keys = [
      `reports:kpis:${companyId}:*`,
      `reports:revenue:${companyId}:*`,
      `reports:occupancy:${companyId}:*`,
    ];

    for (const keyPattern of keys) {
      try {
        await this.cacheManager.del(keyPattern);
      } catch (error) {
        this.logger.warn(`Failed to clear cache for pattern ${keyPattern}:`, error);
      }
    }
  }
}
