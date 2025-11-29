import {
    IsString,
    IsDateString,
    IsNumber,
    IsOptional,
    IsEnum,
    Min,
    MaxLength,
    ValidateIf
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
        example: 1500.0,
        minimum: 0.01
    })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01, { message: 'Monthly rent must be greater than 0' })
    monthlyRent: number;

    @ApiPropertyOptional({
        description: 'Security deposit amount',
        example: 3000.0,
        minimum: 0
    })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0, { message: 'Security deposit cannot be negative' })
    securityDeposit?: number;

    @ApiPropertyOptional({
        description: 'Amount of deposit already paid (must not exceed security deposit)',
        example: 1500.0,
        default: 0,
        minimum: 0
    })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0, { message: 'Deposit paid cannot be negative' })
    @ValidateIf((dto) => dto.depositPaid !== undefined && dto.securityDeposit !== undefined)
    depositPaid?: number;

    get isDepositValid(): boolean {
        if (!this.depositPaid || !this.securityDeposit) return true;
        return this.depositPaid <= this.securityDeposit;
    }

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
