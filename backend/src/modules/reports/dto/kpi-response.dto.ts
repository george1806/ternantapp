import { ApiProperty } from '@nestjs/swagger';

/**
 * KPI Response DTO
 * Dashboard key performance indicators
 *
 * Author: george1806
 */
export class KpiResponseDto {
  @ApiProperty({ description: 'Total number of units', example: 150 })
  totalUnits: number;

  @ApiProperty({ description: 'Number of occupied units', example: 135 })
  occupiedUnits: number;

  @ApiProperty({ description: 'Number of vacant units', example: 15 })
  vacantUnits: number;

  @ApiProperty({ description: 'Occupancy rate percentage', example: 90 })
  occupancyRate: number;

  @ApiProperty({ description: 'Monthly recurring revenue', example: 125000.50 })
  monthlyRecurringRevenue: number;

  @ApiProperty({ description: 'Total outstanding amount', example: 12500.00 })
  outstandingAmount: number;

  @ApiProperty({ description: 'Collection rate percentage', example: 92.5 })
  collectionRate: number;

  @ApiProperty({ description: 'Number of overdue invoices', example: 8 })
  overdueInvoices: number;

  @ApiProperty({ description: 'Total overdue amount', example: 5400.00 })
  overdueAmount: number;

  @ApiProperty({ description: 'Total revenue for the period', example: 450000.00 })
  totalRevenue: number;

  @ApiProperty({ description: 'Number of active tenants', example: 135 })
  activeTenants: number;

  @ApiProperty({ description: 'Average rent per unit', example: 925.50 })
  averageRent: number;
}
