import {
    IsString,
    IsInt,
    IsNumber,
    IsEnum,
    IsArray,
    IsOptional,
    IsUUID,
    Min,
    Max,
    MaxLength
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApartmentDto {
    @ApiProperty({ description: 'Compound ID where the apartment is located' })
    @IsUUID()
    compoundId: string;

    @ApiProperty({ description: 'Unit number or identifier', example: '101' })
    @IsString()
    @MaxLength(50)
    unitNumber: string;

    @ApiPropertyOptional({ description: 'Floor number', example: 1 })
    @IsOptional()
    @IsInt()
    @Min(0)
    floor?: number;

    @ApiPropertyOptional({ description: 'Number of bedrooms', example: 2 })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(20)
    bedrooms?: number;

    @ApiPropertyOptional({ description: 'Number of bathrooms', example: 2 })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(10)
    bathrooms?: number;

    @ApiPropertyOptional({
        description: 'Area in square meters',
        example: 85.5
    })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    areaSqm?: number;

    @ApiPropertyOptional({
        description: 'Monthly rent amount',
        example: 1500.0
    })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    monthlyRent?: number;

    @ApiPropertyOptional({
        description: 'Current status of the apartment',
        enum: ['available', 'occupied', 'maintenance', 'reserved'],
        default: 'available'
    })
    @IsOptional()
    @IsEnum(['available', 'occupied', 'maintenance', 'reserved'])
    status?: 'available' | 'occupied' | 'maintenance' | 'reserved';

    @ApiPropertyOptional({
        description: 'List of amenities',
        example: ['AC', 'Balcony', 'Parking'],
        type: [String]
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    amenities?: string[];

    @ApiPropertyOptional({ description: 'Additional notes' })
    @IsOptional()
    @IsString()
    notes?: string;
}
