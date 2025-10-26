import {
    IsString,
    IsDateString,
    IsNumber,
    IsOptional,
    IsEnum,
    Min,
    MaxLength
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOccupancyDto {
    @ApiProperty({
        description: 'Tenant ID',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    @IsString()
    tenantId: string;

    @ApiProperty({
        description: 'Apartment ID',
        example: '123e4567-e89b-12d3-a456-426614174000'
    })
    @IsString()
    apartmentId: string;

    @ApiProperty({
        description: 'Lease start date',
        example: '2024-01-01'
    })
    @IsDateString()
    leaseStartDate: string;

    @ApiProperty({
        description: 'Lease end date',
        example: '2024-12-31'
    })
    @IsDateString()
    leaseEndDate: string;

    @ApiProperty({
        description: 'Monthly rent amount',
        example: 1500.0
    })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    monthlyRent: number;

    @ApiPropertyOptional({
        description: 'Security deposit amount',
        example: 3000.0
    })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    securityDeposit?: number;

    @ApiPropertyOptional({
        description: 'Amount of deposit already paid',
        example: 1500.0,
        default: 0
    })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    depositPaid?: number;

    @ApiPropertyOptional({
        description: 'Actual move-in date',
        example: '2024-01-01'
    })
    @IsOptional()
    @IsDateString()
    moveInDate?: string;

    @ApiPropertyOptional({
        description: 'Actual move-out date',
        example: '2024-12-31'
    })
    @IsOptional()
    @IsDateString()
    moveOutDate?: string;

    @ApiPropertyOptional({
        description: 'Occupancy status',
        enum: ['pending', 'active', 'ended', 'cancelled'],
        default: 'pending'
    })
    @IsOptional()
    @IsEnum(['pending', 'active', 'ended', 'cancelled'])
    status?: 'pending' | 'active' | 'ended' | 'cancelled';

    @ApiPropertyOptional({
        description: 'Additional notes'
    })
    @IsOptional()
    @IsString()
    notes?: string;
}
