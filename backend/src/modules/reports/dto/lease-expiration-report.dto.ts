import { ApiProperty } from '@nestjs/swagger';

/**
 * Lease Expiration Report DTO
 * Details of leases expiring within a specified timeframe
 *
 * Author: george1806
 */
export class LeaseExpirationReportDto {
  @ApiProperty({
    description: 'Occupancy ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  occupancyId: string;

  @ApiProperty({
    description: 'Tenant full name',
    example: 'John Doe',
  })
  tenantName: string;

  @ApiProperty({
    description: 'Apartment unit number',
    example: 'A101',
  })
  apartmentUnit: string;

  @ApiProperty({
    description: 'Property/compound name',
    example: 'Sunset Apartments',
  })
  propertyName: string;

  @ApiProperty({
    description: 'Lease end date',
    example: '2024-12-31T00:00:00Z',
  })
  leaseEndDate: Date;

  @ApiProperty({
    description: 'Days until lease expiration',
    example: 45,
  })
  daysUntilExpiration: number;

  @ApiProperty({
    description: 'Monthly rent amount',
    example: 1250.0,
  })
  monthlyRent: number;

  @ApiProperty({
    description: 'Tenant phone number',
    example: '+1234567890',
  })
  tenantPhone: string;

  @ApiProperty({
    description: 'Tenant email address',
    example: 'john.doe@example.com',
  })
  tenantEmail: string;

  @ApiProperty({
    description: 'Urgency level',
    enum: ['critical', 'warning', 'normal'],
    example: 'warning',
  })
  urgency: 'critical' | 'warning' | 'normal';
}
