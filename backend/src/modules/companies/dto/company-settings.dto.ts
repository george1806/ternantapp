import { IsString, IsOptional, IsEmail, IsPhoneNumber, IsBoolean, IsEnum, Min, Max, IsNumber, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Company Settings DTO
 * Contains configuration and preferences for a company
 */
export class CompanySettingsDto {
  @ApiProperty({
    description: 'Company ID',
    example: 'company-uuid'
  })
  companyId: string;

  @ApiPropertyOptional({
    description: 'Default due day for invoices (1-31)',
    example: 5,
    minimum: 1,
    maximum: 31
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  defaultInvoiceDueDay?: number;

  @ApiPropertyOptional({
    description: 'Email for receiving system notifications',
    example: 'admin@company.com'
  })
  @IsOptional()
  @IsEmail()
  notificationEmail?: string;

  @ApiPropertyOptional({
    description: 'Phone number for support',
    example: '+1234567890'
  })
  @IsOptional()
  supportPhoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Enable automated invoice reminders',
    example: true,
    type: Boolean
  })
  @IsOptional()
  @IsBoolean()
  enableInvoiceReminders?: boolean;

  @ApiPropertyOptional({
    description: 'Days before due date to send reminder (1-30)',
    example: 3,
    minimum: 1,
    maximum: 30
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  reminderDaysBeforeDue?: number;

  @ApiPropertyOptional({
    description: 'Enable automated overdue notifications',
    example: true,
    type: Boolean
  })
  @IsOptional()
  @IsBoolean()
  enableOverdueNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Default invoice template name',
    example: 'standard'
  })
  @IsOptional()
  @IsString()
  defaultInvoiceTemplate?: string;

  @ApiPropertyOptional({
    description: 'Enable late fees on overdue payments',
    example: false,
    type: Boolean
  })
  @IsOptional()
  @IsBoolean()
  enableLateFees?: boolean;

  @ApiPropertyOptional({
    description: 'Late fee percentage (0-100)',
    example: 5,
    minimum: 0,
    maximum: 100
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  lateFeePercentage?: number;

  @ApiPropertyOptional({
    description: 'Enable tenant self-service portal',
    example: true,
    type: Boolean
  })
  @IsOptional()
  @IsBoolean()
  enableTenantPortal?: boolean;

  @ApiPropertyOptional({
    description: 'Enable online payment processing',
    example: true,
    type: Boolean
  })
  @IsOptional()
  @IsBoolean()
  enableOnlinePayments?: boolean;

  @ApiPropertyOptional({
    description: 'Preferred payment gateway (stripe, paypal, etc.)',
    example: 'stripe'
  })
  @IsOptional()
  @IsString()
  preferredPaymentGateway?: string;

  @ApiPropertyOptional({
    description: 'Default lease term in months',
    example: 12,
    minimum: 1,
    maximum: 60
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  defaultLeaseTerm?: number;

  @ApiPropertyOptional({
    description: 'Enable automatic invoice generation on lease start',
    example: true,
    type: Boolean
  })
  @IsOptional()
  @IsBoolean()
  autoGenerateInvoices?: boolean;

  @ApiPropertyOptional({
    description: 'Last updated timestamp',
    example: '2024-01-01T00:00:00Z'
  })
  updatedAt?: Date;
}

/**
 * Update Company Settings DTO
 * For updating specific company settings
 */
export class UpdateCompanySettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  defaultInvoiceDueDay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  notificationEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  supportPhoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enableInvoiceReminders?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  reminderDaysBeforeDue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enableOverdueNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultInvoiceTemplate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enableLateFees?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  lateFeePercentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enableTenantPortal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enableOnlinePayments?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preferredPaymentGateway?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  defaultLeaseTerm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoGenerateInvoices?: boolean;
}
