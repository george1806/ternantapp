import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Company } from '../../companies/entities/company.entity';

/**
 * Super Admin Analytics Service
 * Provides platform-wide analytics and reporting
 */
@Injectable()
export class SuperAdminAnalyticsService {
    private invoiceRepository: Repository<Invoice>;
    private paymentRepository: Repository<Payment>;
    private companyRepository: Repository<Company>;

    constructor(private dataSource: DataSource) {
        this.invoiceRepository = dataSource.getRepository(Invoice);
        this.paymentRepository = dataSource.getRepository(Payment);
        this.companyRepository = dataSource.getRepository(Company);
    }

    /**
     * Get revenue trends for a period
     */
    async getRevenueTrends(period: '7d' | '30d' | '90d' | 'ytd' | 'all' = '30d') {
        const days = this.getPeriodDays(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const trends = await this.paymentRepository
            .createQueryBuilder('payment')
            .select('DATE(payment.paidAt)', 'date')
            .addSelect('SUM(payment.amount)', 'amount')
            .addSelect('COUNT(payment.id)', 'invoices')
            .where('payment.paidAt >= :startDate', { startDate })
            .andWhere('payment.isActive = true')
            .groupBy('DATE(payment.paidAt)')
            .orderBy('DATE(payment.paidAt)', 'ASC')
            .getRawMany();

        return trends.map((t) => ({
            date: t.date,
            amount: parseFloat(t.amount) || 0,
            invoices: parseInt(t.invoices) || 0,
        }));
    }

    /**
     * Get invoice distribution by status
     */
    async getInvoiceDistribution(period: '7d' | '30d' | '90d' | 'ytd' | 'all' = '30d') {
        const days = this.getPeriodDays(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const distribution = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .select('invoice.status', 'status')
            .addSelect('COUNT(invoice.id)', 'count')
            .addSelect('SUM(invoice.totalAmount)', 'amount')
            .where('invoice.createdAt >= :startDate', { startDate })
            .andWhere('invoice.isActive = true')
            .groupBy('invoice.status')
            .getRawMany();

        return distribution.map((d) => ({
            status: d.status,
            count: parseInt(d.count) || 0,
            amount: parseFloat(d.amount) || 0,
        }));
    }

    /**
     * Get payment collection metrics
     */
    async getPaymentCollection(period: '7d' | '30d' | '90d' | 'ytd' | 'all' = '30d') {
        const days = this.getPeriodDays(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Total invoiced
        const totalInvoiced = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .select('SUM(invoice.totalAmount)', 'total')
            .where('invoice.createdAt >= :startDate', { startDate })
            .andWhere('invoice.isActive = true')
            .getRawOne();

        // Total collected
        const totalCollected = await this.paymentRepository
            .createQueryBuilder('payment')
            .select('SUM(payment.amount)', 'total')
            .where('payment.paidAt >= :startDate', { startDate })
            .andWhere('payment.isActive = true')
            .getRawOne();

        // Outstanding
        const outstanding = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .select('SUM(invoice.totalAmount - invoice.paidAmount)', 'total')
            .where('invoice.createdAt >= :startDate', { startDate })
            .andWhere('invoice.isActive = true')
            .andWhere('invoice.status != :status', { status: 'paid' })
            .getRawOne();

        // Overdue
        const overdue = await this.invoiceRepository
            .createQueryBuilder('invoice')
            .select('SUM(invoice.totalAmount - invoice.paidAmount)', 'total')
            .where('invoice.dueDate < NOW()')
            .andWhere('invoice.status != :status', { status: 'paid' })
            .andWhere('invoice.isActive = true')
            .getRawOne();

        const totalInvoicedAmount = parseFloat(totalInvoiced?.total) || 0;
        const totalCollectedAmount = parseFloat(totalCollected?.total) || 0;

        return {
            totalInvoiced: totalInvoicedAmount,
            totalCollected: totalCollectedAmount,
            outstanding: parseFloat(outstanding?.total) || 0,
            overdue: parseFloat(overdue?.total) || 0,
            collectionRate: totalInvoicedAmount > 0 ? totalCollectedAmount / totalInvoicedAmount : 0,
        };
    }

    /**
     * Get top companies by revenue
     */
    async getTopCompanies(limit: number = 10) {
        const companies = await this.companyRepository
            .createQueryBuilder('company')
            .leftJoinAndSelect(
                Payment,
                'payment',
                'payment.companyId = company.id AND payment.isActive = true'
            )
            .leftJoinAndSelect(
                Invoice,
                'invoice',
                'invoice.companyId = company.id AND invoice.isActive = true'
            )
            .select('company.id', 'id')
            .addSelect('company.name', 'name')
            .addSelect('SUM(payment.amount)', 'revenue')
            .addSelect('COUNT(DISTINCT invoice.id)', 'invoices')
            .addSelect(
                'SUM(payment.amount) / SUM(invoice.totalAmount)',
                'collectionRate'
            )
            .groupBy('company.id')
            .addGroupBy('company.name')
            .orderBy('SUM(payment.amount)', 'DESC')
            .limit(limit)
            .getRawMany();

        return companies.map((c) => ({
            id: c.id,
            name: c.name,
            revenue: parseFloat(c.revenue) || 0,
            invoices: parseInt(c.invoices) || 0,
            collectionRate: parseFloat(c.collectionRate) || 0,
        }));
    }

    /**
     * Get platform statistics
     */
    async getPlatformStats() {
        const companies = await this.companyRepository.count({
            where: { isActive: true },
        });

        const invoices = await this.invoiceRepository.count({
            where: { isActive: true },
        });

        const totalRevenue = await this.paymentRepository
            .createQueryBuilder('payment')
            .select('SUM(payment.amount)', 'total')
            .where('payment.isActive = true')
            .getRawOne();

        const overdue = await this.invoiceRepository.count({
            where: {
                status: 'overdue',
                isActive: true,
            },
        });

        return {
            companies,
            invoices,
            totalRevenue: parseFloat(totalRevenue?.total) || 0,
            overdueInvoices: overdue,
        };
    }

    /**
     * Helper function to convert period string to days
     */
    private getPeriodDays(period: string): number {
        switch (period) {
            case '7d':
                return 7;
            case '30d':
                return 30;
            case '90d':
                return 90;
            case 'ytd': {
                const now = new Date();
                const startOfYear = new Date(now.getFullYear(), 0, 1);
                return Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
            }
            case 'all':
            default:
                return 3650; // 10 years
        }
    }
}
