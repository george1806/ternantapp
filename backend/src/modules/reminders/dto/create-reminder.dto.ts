import {
    IsEnum,
    IsUUID,
    IsString,
    IsOptional,
    IsDateString,
    IsObject,
    IsIn
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Create Reminder DTO
 * Input validation for creating new reminders
 *
 * Author: george1806
 */
export class CreateReminderDto {
    @ApiProperty({
        enum: ['rent_due', 'payment_received', 'lease_expiring', 'custom'],
        description: 'Type of reminder',
        example: 'rent_due'
    })
    @IsIn(['rent_due', 'payment_received', 'lease_expiring', 'custom'])
    type: 'rent_due' | 'payment_received' | 'lease_expiring' | 'custom';

    @ApiProperty({
        description: 'Tenant ID to receive the reminder',
        example: 'uuid-here'
    })
    @IsUUID()
    @IsOptional()
    tenantId?: string;

    @ApiPropertyOptional({
        description: 'Related invoice ID (required for payment reminders)',
        example: 'uuid-here'
    })
    @IsUUID()
    @IsOptional()
    invoiceId?: string;

    @ApiPropertyOptional({
        description: 'Related occupancy ID',
        example: 'uuid-here'
    })
    @IsUUID()
    @IsOptional()
    occupancyId?: string;

    @ApiProperty({
        description: 'Reminder email subject',
        example: 'Your rent is due soon'
    })
    @IsString()
    subject: string;

    @ApiProperty({
        description: 'Reminder message body',
        example: 'Dear tenant, your rent for apartment 101 is due on Jan 15, 2025.'
    })
    @IsString()
    message: string;

    @ApiPropertyOptional({
        description: 'Recipient email (defaults to tenant email)',
        example: 'tenant@example.com'
    })
    @IsString()
    @IsOptional()
    recipient?: string;

    @ApiProperty({
        description: 'Scheduled send date/time',
        example: '2025-01-10T09:00:00Z'
    })
    @IsDateString()
    sendAt: string;

    @ApiProperty({
        enum: ['email', 'sms', 'both'],
        description: 'Notification channel',
        example: 'email'
    })
    @IsIn(['email', 'sms', 'both'])
    channel: 'email' | 'sms' | 'both';

    @ApiPropertyOptional({
        description: 'Additional metadata',
        example: { templateName: 'rent-due-soon', amount: 1500 }
    })
    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;
}
