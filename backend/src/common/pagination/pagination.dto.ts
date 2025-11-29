import { IsOptional, IsNumber, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Pagination Query DTO
 * Validates pagination parameters from query string
 */
export class PaginationQueryDto {
  @ApiProperty({
    description: 'Page number (1-indexed)',
    example: 1,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
    required: false,
    minimum: 1,
    maximum: 500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(500, { message: 'Limit cannot exceed 500' })
  limit?: number = 20;

  @ApiProperty({
    description: 'Sort fields (format: "field:ASC,field2:DESC")',
    example: 'createdAt:DESC,name:ASC',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Sort must be a string' })
  sort?: string;
}

/**
 * Pagination Response DTO
 * Generic type for paginated API responses
 */
export class PaginationMetadataDto {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of items',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
  })
  pages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNextPage: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPreviousPage: boolean;
}

/**
 * Generic Paginated Response DTO
 * Use this as base for your specific paginated responses
 *
 * Example:
 * class PaginatedInvoicesDto extends PaginatedDto<InvoiceDto> {
 *   @ApiProperty({ type: [InvoiceDto] })
 *   data: InvoiceDto[];
 * }
 */
export class PaginatedDto<T> {
  @ApiProperty({
    description: 'Array of items',
  })
  data: T[];

  @ApiProperty({
    type: PaginationMetadataDto,
    description: 'Pagination metadata',
  })
  pagination: PaginationMetadataDto;
}
