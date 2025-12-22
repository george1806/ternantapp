import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum, IsInt, Min, Max } from 'class-validator';
import { DateRangeDto } from './date-range.dto';

/**
 * Report Query DTO
 * Common query parameters for report filtering
 *
 * Author: george1806
 */
export class ReportQueryDto extends DateRangeDto {
  @ApiPropertyOptional({
    description: 'Filter by property/compound ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({
    description: 'Period grouping',
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    example: 'monthly',
  })
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly';

  @ApiPropertyOptional({
    description: 'Number of months of historical data',
    example: 12,
    minimum: 1,
    maximum: 36,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(36)
  months?: number;
}
