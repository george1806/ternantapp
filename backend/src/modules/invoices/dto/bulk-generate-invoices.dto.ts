import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for bulk invoice generation
 * Allows generating invoices for multiple occupancies in a single request
 */
export class BulkGenerateInvoicesDto {
  @ApiProperty({
    description: 'Month for which to generate invoices (format: YYYY-MM)',
    example: '2024-01',
    pattern: '\\d{4}-\\d{2}'
  })
  @IsString()
  month: string;

  @ApiPropertyOptional({
    description: 'Day of month when rent is due (1-31)',
    example: 5,
    minimum: 1,
    maximum: 31
  })
  @IsOptional()
  @IsNumber()
  dueDay?: number;

  @ApiPropertyOptional({
    description: 'Specific occupancy IDs to generate invoices for (if empty, generates for all active occupancies)',
    example: ['occupancy-1', 'occupancy-2'],
    type: [String]
  })
  @IsOptional()
  occupancyIds?: string[];

  @ApiPropertyOptional({
    description: 'Skip invoices that already exist for this period',
    example: true,
    type: Boolean
  })
  @IsOptional()
  skipExisting?: boolean;
}

/**
 * Response DTO for bulk invoice generation
 * Contains summary of generated invoices
 */
export class BulkGenerateInvoicesResponseDto {
  @ApiProperty({
    description: 'Total number of invoices processed',
    example: 10
  })
  processed: number;

  @ApiProperty({
    description: 'Number of invoices successfully created',
    example: 8
  })
  created: number;

  @ApiProperty({
    description: 'Number of invoices skipped (already exist)',
    example: 2
  })
  skipped: number;

  @ApiProperty({
    description: 'Number of invoices that failed',
    example: 0
  })
  failed: number;

  @ApiProperty({
    description: 'List of generated invoice IDs',
    example: ['inv-uuid-1', 'inv-uuid-2'],
    type: [String]
  })
  createdInvoiceIds: string[];

  @ApiProperty({
    description: 'List of errors that occurred during generation',
    example: [
      {
        occupancyId: 'occ-3',
        error: 'Invoice already exists for this period'
      }
    ],
    type: [Object]
  })
  errors: Array<{
    occupancyId: string;
    error: string;
  }>;

  @ApiProperty({
    description: 'Total amount of all generated invoices',
    example: 8000
  })
  totalAmount: number;
}
