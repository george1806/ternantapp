import { ApiProperty } from '@nestjs/swagger';

/**
 * Aging Analysis Detail Item DTO
 * Individual overdue invoice details
 */
export class AgingAnalysisDetailDto {
  @ApiProperty({
    description: 'Tenant ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Tenant full name',
    example: 'John Doe',
  })
  tenantName: string;

  @ApiProperty({
    description: 'Invoice number',
    example: 'INV-2024-0001',
  })
  invoiceNumber: string;

  @ApiProperty({
    description: 'Invoice date',
    example: '2024-01-01T00:00:00Z',
  })
  invoiceDate: Date;

  @ApiProperty({
    description: 'Due date',
    example: '2024-01-15T00:00:00Z',
  })
  dueDate: Date;

  @ApiProperty({
    description: 'Amount due',
    example: 1250.0,
  })
  amountDue: number;

  @ApiProperty({
    description: 'Days overdue',
    example: 45,
  })
  daysOverdue: number;

  @ApiProperty({
    description: 'Aging bucket',
    enum: ['current', '1-30', '31-60', '61-90', '90+'],
    example: '31-60',
  })
  agingBucket: 'current' | '1-30' | '31-60' | '61-90' | '90+';
}

/**
 * Aging Analysis Summary DTO
 * Summary totals for each aging bucket
 */
export class AgingAnalysisSummaryDto {
  @ApiProperty({
    description: 'Total outstanding amount',
    example: 125000.0,
  })
  total: number;

  @ApiProperty({
    description: 'Current (not overdue)',
    example: 50000.0,
  })
  current: number;

  @ApiProperty({
    description: '1-30 days overdue',
    example: 30000.0,
  })
  days30: number;

  @ApiProperty({
    description: '31-60 days overdue',
    example: 20000.0,
  })
  days60: number;

  @ApiProperty({
    description: '61-90 days overdue',
    example: 15000.0,
  })
  days90: number;

  @ApiProperty({
    description: '90+ days overdue',
    example: 10000.0,
  })
  days90Plus: number;
}

/**
 * Aging Analysis Report DTO
 * Complete aging analysis with summary and details
 *
 * Author: george1806
 */
export class AgingAnalysisReportDto {
  @ApiProperty({
    description: 'Summary totals by aging bucket',
    type: AgingAnalysisSummaryDto,
  })
  summary: AgingAnalysisSummaryDto;

  @ApiProperty({
    description: 'Detailed breakdown by invoice',
    type: [AgingAnalysisDetailDto],
  })
  details: AgingAnalysisDetailDto[];
}
