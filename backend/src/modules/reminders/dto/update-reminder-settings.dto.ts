import {
  IsBoolean,
  IsNumber,
  IsString,
  IsArray,
  IsOptional,
  IsEnum,
  Min,
  Max,
  ValidateNested,
  Matches,
  ArrayMinSize,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Template Type for Escalation
 */
export enum EscalationTemplateType {
  GENTLE = 'gentle',
  FIRM = 'firm',
  URGENT = 'urgent',
}

/**
 * Send On Option for Welcome Messages
 */
export enum WelcomeSendOn {
  MOVE_IN_DATE = 'move_in_date',
  LEASE_START = 'lease_start',
  IMMEDIATE = 'immediate',
}

/**
 * Escalation Level DTO
 */
export class EscalationLevelDto {
  @ApiProperty({ example: 1, description: 'Days after due date' })
  @IsNumber()
  @Min(1)
  @Max(90)
  daysAfterDue: number;

  @ApiProperty({ example: '10:00', description: 'Send time in 24h format (HH:mm)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Send time must be in HH:mm format (24h)',
  })
  sendTime: string;

  @ApiProperty({ enum: EscalationTemplateType, example: EscalationTemplateType.GENTLE })
  @IsEnum(EscalationTemplateType)
  templateType: EscalationTemplateType;

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;
}

/**
 * Due Soon Configuration DTO
 */
export class DueSoonConfigDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ example: 3, description: 'Days before due date (1-30)' })
  @IsNumber()
  @Min(1)
  @Max(30)
  daysBeforeDue: number;

  @ApiProperty({ example: '09:00', description: 'Send time in 24h format (HH:mm)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Send time must be in HH:mm format (24h)',
  })
  sendTime: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  skipWeekends: boolean;
}

/**
 * Overdue Configuration DTO
 */
export class OverdueConfigDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ type: [EscalationLevelDto], description: 'Escalation levels (max 10)' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EscalationLevelDto)
  @ArrayMinSize(1)
  escalationLevels: EscalationLevelDto[];

  @ApiProperty({ example: 3, description: 'Max number of escalation reminders (1-10)' })
  @IsNumber()
  @Min(1)
  @Max(10)
  maxEscalations: number;

  @ApiProperty({ example: true, description: 'Stop sending if invoice is paid' })
  @IsBoolean()
  stopIfPaid: boolean;
}

/**
 * Welcome Configuration DTO
 */
export class WelcomeConfigDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ enum: WelcomeSendOn, example: WelcomeSendOn.LEASE_START })
  @IsEnum(WelcomeSendOn)
  sendOn: WelcomeSendOn;

  @ApiProperty({ example: '09:00', description: 'Send time in 24h format (HH:mm)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Send time must be in HH:mm format (24h)',
  })
  sendTime: string;
}

/**
 * Receipt Configuration DTO
 */
export class ReceiptConfigDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ example: true, description: 'Send immediately after payment is recorded' })
  @IsBoolean()
  sendImmediately: boolean;

  @ApiProperty({ example: true, description: 'Include full invoice details in receipt' })
  @IsBoolean()
  includeInvoiceDetails: boolean;
}

/**
 * Email Settings DTO
 */
export class EmailSettingsDto {
  @ApiProperty({ example: 'Apartment Management' })
  @IsString()
  fromName: string;

  @ApiProperty({ example: 'noreply@apartment.app' })
  @IsEmail()
  fromEmail: string;

  @ApiProperty({ example: 'support@apartment.app' })
  @IsEmail()
  replyToEmail: string;

  @ApiPropertyOptional({ type: [String], example: ['admin@apartment.app'] })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  bccAllReminders?: string[];

  @ApiPropertyOptional({ example: '<p>Best regards,<br>Management Team</p>' })
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiProperty({ example: true, description: 'Notify admin when email fails' })
  @IsBoolean()
  notifyAdminOnFailure: boolean;

  @ApiProperty({ example: 3, description: 'Max retry attempts on failure (1-5)' })
  @IsNumber()
  @Min(1)
  @Max(5)
  maxRetriesOnFailure: number;

  @ApiProperty({ example: 30, description: 'Delay between retries in minutes (5-60)' })
  @IsNumber()
  @Min(5)
  @Max(60)
  retryDelayMinutes: number;
}

/**
 * Queue Settings DTO
 */
export class QueueSettingsDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ example: 50, description: 'Max emails per hour (1-100)' })
  @IsNumber()
  @Min(1)
  @Max(100)
  maxEmailsPerHour: number;

  @ApiProperty({ example: 250, description: 'Max emails per day (1-300)' })
  @IsNumber()
  @Min(1)
  @Max(300)
  maxEmailsPerDay: number;

  @ApiProperty({ example: 10, description: 'Batch size for bulk operations (1-50)' })
  @IsNumber()
  @Min(1)
  @Max(50)
  batchSize: number;

  @ApiProperty({ example: 60, description: 'Delay between batches in seconds (30-300)' })
  @IsNumber()
  @Min(30)
  @Max(300)
  delayBetweenBatches: number;

  @ApiProperty({ example: true, description: 'Alert when queue backlog exceeds threshold' })
  @IsBoolean()
  alertOnQueueBacklog: boolean;

  @ApiProperty({ example: 100, description: 'Backlog threshold for alerts (50-500)' })
  @IsNumber()
  @Min(50)
  @Max(500)
  backlogThreshold: number;
}

/**
 * Business Rules DTO
 */
export class BusinessRulesDto {
  @ApiProperty({ example: 2, description: 'Grace period days before marking overdue (0-7)' })
  @IsNumber()
  @Min(0)
  @Max(7)
  gracePeriodDays: number;

  @ApiProperty({ example: true, description: 'Skip reminders if invoice is paid' })
  @IsBoolean()
  skipIfPaid: boolean;

  @ApiProperty({ example: false, description: 'Skip reminders if invoice is partially paid' })
  @IsBoolean()
  skipIfPartiallyPaid: boolean;

  @ApiProperty({ example: true, description: 'Pause reminders on weekends' })
  @IsBoolean()
  pauseOnWeekends: boolean;
}

/**
 * Update Reminder Settings DTO
 */
export class UpdateReminderSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => DueSoonConfigDto)
  dueSoonConfig?: DueSoonConfigDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => OverdueConfigDto)
  overdueConfig?: OverdueConfigDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => WelcomeConfigDto)
  welcomeConfig?: WelcomeConfigDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ReceiptConfigDto)
  receiptConfig?: ReceiptConfigDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailSettingsDto)
  emailSettings?: EmailSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => QueueSettingsDto)
  queueSettings?: QueueSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessRulesDto)
  businessRules?: BusinessRulesDto;
}
