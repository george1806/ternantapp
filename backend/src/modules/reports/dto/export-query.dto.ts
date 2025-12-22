import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ReportQueryDto } from './report-query.dto';

/**
 * Export Query DTO
 * Query parameters for exporting reports
 *
 * Author: george1806
 */
export class ExportQueryDto extends ReportQueryDto {
  @ApiProperty({
    description: 'Export format',
    enum: ['csv', 'pdf'],
    example: 'csv',
  })
  @IsEnum(['csv', 'pdf'])
  format: 'csv' | 'pdf';
}
