import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsArray, IsUUID, IsEnum } from 'class-validator';
import { ReminderType } from '../../../common/enums';

/**
 * Batch Send Reminders DTO
 *
 * Defines criteria for batch sending reminders.
 * Supports filtering by properties, apartments, and tenants.
 * Includes dry-run mode for testing without actually sending.
 *
 * Author: george1806
 */
export class BatchSendRemindersDto {
  @ApiProperty({
    description: 'Type of reminders to send',
    enum: ReminderType,
    example: ReminderType.DUE_SOON,
  })
  @IsEnum(ReminderType)
  type: ReminderType;

  @ApiPropertyOptional({
    description: 'Filter by specific property IDs',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  propertyIds?: string[];

  @ApiPropertyOptional({
    description: 'Filter by specific apartment IDs',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  apartmentIds?: string[];

  @ApiPropertyOptional({
    description: 'Filter by specific tenant IDs',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tenantIds?: string[];

  @ApiPropertyOptional({
    description: 'Dry run mode - preview what would be sent without actually sending',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

/**
 * Preview Reminder Response
 */
export interface PreviewReminderResponse {
  subject: string;
  message: string;
  recipient: string;
  scheduledFor: Date;
  metadata: Record<string, any>;
  htmlPreview?: string;
  textPreview?: string;
}

/**
 * Batch Send Response
 */
export interface BatchSendResponse {
  success: boolean;
  message: string;
  totalEligible: number;
  totalQueued: number;
  totalSkipped: number;
  reminders: Array<{
    id: string;
    tenantName: string;
    recipient: string;
    subject: string;
    status: string;
  }>;
  skippedReasons?: Record<string, number>;
}
