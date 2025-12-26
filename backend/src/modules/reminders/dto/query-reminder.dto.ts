import { IsEnum, IsOptional, IsUUID, IsDateString, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ReminderType, ReminderStatus } from '../../../common/enums';

/**
 * Query Reminder DTO
 * Filtering and pagination for reminder queries
 *
 * Author: george1806
 */
export class QueryReminderDto {
    @ApiPropertyOptional({
        enum: ReminderType,
        description: 'Filter by reminder type'
    })
    @IsEnum(ReminderType)
    @IsOptional()
    type?: ReminderType;

    @ApiPropertyOptional({
        enum: ReminderStatus,
        description: 'Filter by reminder status'
    })
    @IsEnum(ReminderStatus)
    @IsOptional()
    status?: ReminderStatus;

    @ApiPropertyOptional({
        description: 'Filter by tenant ID'
    })
    @IsUUID()
    @IsOptional()
    tenantId?: string;

    @ApiPropertyOptional({
        description: 'Filter by invoice ID'
    })
    @IsUUID()
    @IsOptional()
    invoiceId?: string;

    @ApiPropertyOptional({
        description: 'Filter reminders scheduled after this date',
        example: '2025-01-01'
    })
    @IsDateString()
    @IsOptional()
    scheduledFrom?: string;

    @ApiPropertyOptional({
        description: 'Filter reminders scheduled before this date',
        example: '2025-01-31'
    })
    @IsDateString()
    @IsOptional()
    scheduledTo?: string;

    @ApiPropertyOptional({
        description: 'Search term for recipient, subject, etc.',
        example: 'john@example.com'
    })
    @IsString()
    @IsOptional()
    search?: string;

    @ApiPropertyOptional({
        description: 'Page number',
        example: 1,
        default: 1
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    page?: number;

    @ApiPropertyOptional({
        description: 'Items per page',
        example: 10,
        default: 10
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    @IsOptional()
    limit?: number;
}
