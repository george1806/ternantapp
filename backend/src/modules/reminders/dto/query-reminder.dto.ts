import { IsEnum, IsOptional, IsUUID, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
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
}
