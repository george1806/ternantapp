import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateApartmentDto } from './create-apartment.dto';
import { OmitType } from '@nestjs/swagger';
import {
    IsString,
    IsInt,
    IsNumber,
    IsEnum,
    IsArray,
    IsOptional,
    Min,
    Max,
    MaxLength
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Update Apartment DTO
 * All fields are optional except compoundId cannot be changed after creation
 * Handles empty string transformation to prevent validation errors
 *
 * Author: george1806
 */
export class UpdateApartmentDto extends PartialType(
    OmitType(CreateApartmentDto, ['compoundId'] as const)
) {
    @ApiPropertyOptional({ description: 'Unit number or identifier', example: '101' })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    @MaxLength(50)
    unitNumber?: string;

    @ApiPropertyOptional({ description: 'Floor number', example: 1 })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsInt()
    @Min(0)
    floor?: number;

    @ApiPropertyOptional({ description: 'Number of bedrooms', example: 2 })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsInt()
    @Min(0)
    @Max(20)
    bedrooms?: number;

    @ApiPropertyOptional({ description: 'Number of bathrooms', example: 2 })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsInt()
    @Min(0)
    @Max(10)
    bathrooms?: number;

    @ApiPropertyOptional({
        description: 'Area in square meters',
        example: 85.5
    })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    areaSqm?: number;

    @ApiPropertyOptional({
        description: 'Monthly rent amount',
        example: 1500.0
    })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    monthlyRent?: number;

    @ApiPropertyOptional({
        description: 'Current status of the apartment',
        enum: ['available', 'occupied', 'maintenance', 'reserved']
    })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
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
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    notes?: string;
}
