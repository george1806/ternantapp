import { IsDateString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Date Range DTO
 * Used for filtering reports by date range
 *
 * Author: george1806
 */
export class DateRangeDto {
    @ApiPropertyOptional({
        description: 'Start date (ISO 8601 format)',
        example: '2024-01-01T00:00:00Z'
    })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({
        description: 'End date (ISO 8601 format)',
        example: '2024-12-31T23:59:59Z'
    })
    @IsOptional()
    @IsDateString()
    endDate?: string;
}
