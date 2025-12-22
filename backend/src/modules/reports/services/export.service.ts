import { Injectable } from '@nestjs/common';
import {
    KpiResponseDto,
    RevenueAnalyticsDto,
    OccupancyAnalyticsDto,
    LeaseExpirationReportDto,
    AgingAnalysisReportDto
} from '../dto';

/**
 * Export Service
 * Handles CSV generation for all report types
 *
 * Features:
 * - KPIs export
 * - Revenue analytics export
 * - Occupancy analytics export
 * - Lease expiration export
 * - Aging analysis export
 * - Proper CSV formatting with escaping
 *
 * Author: george1806
 */
@Injectable()
export class ExportService {
    /**
     * Generate KPIs CSV
     */
    generateKPIsCSV(data: KpiResponseDto): string {
        const rows = [
            ['Metric', 'Value'],
            ['Total Units', (data.totalUnits || 0).toString()],
            ['Occupied Units', (data.occupiedUnits || 0).toString()],
            ['Vacant Units', (data.vacantUnits || 0).toString()],
            ['Maintenance Units', (data.maintenanceUnits || 0).toString()],
            ['Occupancy Rate (%)', Number(data.occupancyRate || 0).toFixed(2)],
            ['Total Properties', (data.totalProperties || 0).toString()],
            ['Active Tenants', (data.activeTenants || 0).toString()],
            ['Active Leases', (data.activeLeases || 0).toString()],
            ['Monthly Recurring Revenue', Number(data.monthlyRecurringRevenue || 0).toFixed(2)],
            ['Monthly Revenue', Number(data.monthlyRevenue || 0).toFixed(2)],
            ['Total Revenue', Number(data.totalRevenue || 0).toFixed(2)],
            ['Outstanding Amount', Number(data.outstandingAmount || 0).toFixed(2)],
            ['Collection Rate (%)', Number(data.collectionRate || 0).toFixed(2)],
            ['Overdue Invoices', (data.overdueInvoices || 0).toString()],
            ['Overdue Amount', Number(data.overdueAmount || 0).toFixed(2)],
            ['Pending Invoices', (data.pendingInvoices || 0).toString()],
            ['Expiring Leases (30 days)', (data.expiringLeases || 0).toString()],
            ['Revenue Growth (%)', Number(data.revenueGrowth || 0).toFixed(2)],
            ['Occupancy Trend (%)', Number(data.occupancyTrend || 0).toFixed(2)],
            ['Average Rent', Number(data.averageRent || 0).toFixed(2)]
        ];

        return this.arrayToCSV(rows);
    }

    /**
     * Generate Revenue Analytics CSV
     */
    generateRevenueCSV(data: RevenueAnalyticsDto): string {
        const rows = [
            ['Revenue Analytics Report'],
            [],
            ['Summary'],
            ['Total Revenue', Number(data.totalRevenue || 0).toFixed(2)],
            ['Total Paid', Number(data.totalPaid || 0).toFixed(2)],
            ['Total Outstanding', Number(data.totalOutstanding || 0).toFixed(2)],
            ['Collection Rate (%)', Number(data.collectionRate || 0).toFixed(2)],
            ['Average Monthly Revenue', Number(data.averageMonthlyRevenue || 0).toFixed(2)],
            [],
            ['Monthly Trend'],
            ['Month', 'Revenue', 'Collected', 'Outstanding'],
            ...(data.monthlyTrend || []).map((trend) => [
                trend.month || '',
                Number(trend.revenue || 0).toFixed(2),
                Number(trend.collected || 0).toFixed(2),
                Number(trend.outstanding || 0).toFixed(2)
            ]),
            [],
            ['Payment Methods'],
            ['Method', 'Amount', 'Percentage'],
            ...(data.byPaymentMethod || []).map((method) => [
                method.method || '',
                Number(method.amount || 0).toFixed(2),
                Number(method.percentage || 0).toFixed(2) + '%'
            ])
        ];

        return this.arrayToCSV(rows);
    }

    /**
     * Generate Occupancy Analytics CSV
     */
    generateOccupancyCSV(data: OccupancyAnalyticsDto): string {
        const rows = [
            ['Occupancy Analytics Report'],
            [],
            ['Summary'],
            ['Current Occupancy Rate (%)', Number(data.currentOccupancyRate || 0).toFixed(2)],
            ['Total Units', (data.totalUnits || 0).toString()],
            ['Occupied Units', (data.occupiedUnits || 0).toString()],
            ['Vacant Units', (data.vacantUnits || 0).toString()],
            ['Average Lease Duration (months)', Number(data.averageLeaseDuration || 0).toFixed(2)],
            ['Average Days to Fill', (data.averageDaysToFill || 0).toString()],
            ['Turnover Rate (%)', Number(data.turnoverRate || 0).toFixed(2)],
            [],
            ['Monthly Trend'],
            ['Month', 'Occupancy Rate (%)', 'Occupied', 'Vacant'],
            ...(data.monthlyTrend || []).map((trend) => [
                trend.month || '',
                Number(trend.occupancyRate || 0).toFixed(2),
                (trend.occupied || 0).toString(),
                (trend.vacant || 0).toString()
            ]),
            [],
            ['By Compound/Property'],
            ['Property Name', 'Total Units', 'Occupied', 'Occupancy Rate (%)'],
            ...(data.byCompound || []).map((compound) => [
                compound.compoundName || '',
                (compound.totalUnits || 0).toString(),
                (compound.occupied || 0).toString(),
                Number(compound.occupancyRate || 0).toFixed(2)
            ])
        ];

        return this.arrayToCSV(rows);
    }

    /**
     * Generate Lease Expiration CSV
     */
    generateLeaseExpirationCSV(data: LeaseExpirationReportDto[]): string {
        const rows = [
            ['Lease Expiration Report'],
            [],
            [
                'Tenant Name',
                'Apartment Unit',
                'Property Name',
                'Lease End Date',
                'Days Until Expiration',
                'Monthly Rent',
                'Phone',
                'Email',
                'Urgency'
            ],
            ...(data || []).map((lease) => [
                lease.tenantName || '',
                lease.apartmentUnit || '',
                lease.propertyName || '',
                lease.leaseEndDate ? new Date(lease.leaseEndDate).toISOString().split('T')[0] : '',
                (lease.daysUntilExpiration || 0).toString(),
                Number(lease.monthlyRent || 0).toFixed(2),
                lease.tenantPhone || '',
                lease.tenantEmail || '',
                lease.urgency ? lease.urgency.toUpperCase() : 'NORMAL'
            ])
        ];

        return this.arrayToCSV(rows);
    }

    /**
     * Generate Aging Analysis CSV
     */
    generateAgingAnalysisCSV(data: AgingAnalysisReportDto): string {
        const summary = data?.summary || { total: 0, current: 0, days30: 0, days60: 0, days90: 0, days90Plus: 0 };
        const details = data?.details || [];

        const rows = [
            ['Aging Analysis Report'],
            [],
            ['Summary'],
            ['Total Outstanding', Number(summary.total || 0).toFixed(2)],
            ['Current (Not Overdue)', Number(summary.current || 0).toFixed(2)],
            ['1-30 Days', Number(summary.days30 || 0).toFixed(2)],
            ['31-60 Days', Number(summary.days60 || 0).toFixed(2)],
            ['61-90 Days', Number(summary.days90 || 0).toFixed(2)],
            ['90+ Days', Number(summary.days90Plus || 0).toFixed(2)],
            [],
            ['Details'],
            [
                'Tenant Name',
                'Invoice Number',
                'Invoice Date',
                'Due Date',
                'Amount Due',
                'Days Overdue',
                'Aging Bucket'
            ],
            ...details.map((detail) => [
                detail.tenantName || '',
                detail.invoiceNumber || '',
                detail.invoiceDate ? new Date(detail.invoiceDate).toISOString().split('T')[0] : '',
                detail.dueDate ? new Date(detail.dueDate).toISOString().split('T')[0] : '',
                Number(detail.amountDue || 0).toFixed(2),
                (detail.daysOverdue || 0).toString(),
                detail.agingBucket || 'current'
            ])
        ];

        return this.arrayToCSV(rows);
    }

    /**
     * Convert 2D array to CSV string
     * Properly escapes quotes and special characters
     */
    private arrayToCSV(data: any[][]): string {
        return data
            .map((row) =>
                row
                    .map((cell) => {
                        // Convert cell to string
                        const cellStr = String(cell ?? '');

                        // Escape quotes by doubling them
                        const escaped = cellStr.replace(/"/g, '""');

                        // Wrap in quotes if contains comma, quote, or newline
                        if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
                            return `"${escaped}"`;
                        }

                        return escaped;
                    })
                    .join(',')
            )
            .join('\n');
    }
}
