import { ApiProperty } from '@nestjs/swagger';

/**
 * Dashboard Statistics DTO
 * Response object for dashboard statistics
 */
export class DashboardStatsDto {
    @ApiProperty({ description: 'Total number of units/apartments' })
    totalUnits: number;

    @ApiProperty({ description: 'Number of occupied units' })
    occupiedUnits: number;

    @ApiProperty({ description: 'Number of vacant units' })
    vacantUnits: number;

    @ApiProperty({ description: 'Occupancy rate percentage' })
    occupancyRate: number;

    @ApiProperty({ description: 'Number of active tenants' })
    activeTenants: number;

    @ApiProperty({ description: 'Average rent per unit' })
    averageRent: number;

    @ApiProperty({ description: 'Monthly recurring revenue' })
    monthlyRecurringRevenue: number;

    @ApiProperty({ description: 'Total revenue (all time)' })
    totalRevenue: number;

    @ApiProperty({ description: 'Outstanding amount (unpaid)' })
    outstandingAmount: number;

    @ApiProperty({ description: 'Collection rate percentage' })
    collectionRate: number;

    @ApiProperty({ description: 'Number of overdue invoices' })
    overdueInvoices: number;

    @ApiProperty({ description: 'Total amount overdue' })
    overdueAmount: number;
}
