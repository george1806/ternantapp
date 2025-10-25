import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../../common/enums';

/**
 * DTO for creating a payment
 * Author: george1806
 */
export class CreatePaymentDto {
  @ApiProperty({
    description: 'Invoice ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  invoiceId: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 1500.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Payment date and time',
    example: '2024-01-15T10:30:00Z',
  })
  @IsDateString()
  paidAt: string;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Payment reference number (e.g., transaction ID, check number)',
    example: 'TXN-2024-001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reference?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata (JSON)',
    example: { bankName: 'ABC Bank', accountNumber: '****1234' },
  })
  @IsOptional()
  metadata?: any;

  @ApiPropertyOptional({
    description: 'Additional notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
