import { ApiProperty } from '@nestjs/swagger';

/**
 * Revenue Analytics DTO
 * Detailed revenue breakdown and trends
 *
 * Author: george1806
 */
export class RevenueAnalyticsDto {
  @ApiProperty({ description: 'Total revenue', example: 450000.00 })
  totalRevenue: number;

  @ApiProperty({ description: 'Total paid amount', example: 425000.00 })
  totalPaid: number;

  @ApiProperty({ description: 'Total outstanding amount', example: 25000.00 })
  totalOutstanding: number;

  @ApiProperty({ description: 'Collection rate percentage', example: 94.4 })
  collectionRate: number;

  @ApiProperty({
    description: 'Monthly revenue trend',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        month: { type: 'string', example: '2024-01' },
        revenue: { type: 'number', example: 125000.00 },
        collected: { type: 'number', example: 120000.00 },
        outstanding: { type: 'number', example: 5000.00 },
      },
    },
  })
  monthlyTrend: Array<{
    month: string;
    revenue: number;
    collected: number;
    outstanding: number;
  }>;

  @ApiProperty({
    description: 'Revenue by payment method',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        method: { type: 'string', example: 'BANK_TRANSFER' },
        amount: { type: 'number', example: 250000.00 },
        percentage: { type: 'number', example: 55.5 },
      },
    },
  })
  byPaymentMethod: Array<{
    method: string;
    amount: number;
    percentage: number;
  }>;

  @ApiProperty({ description: 'Average monthly revenue', example: 125000.00 })
  averageMonthlyRevenue: number;
}
