import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateCompoundDto } from './create-compound.dto';
import { IsString, IsOptional, IsNumber, IsBoolean, MinLength, MaxLength, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Update Compound DTO
 * Handles partial updates with empty string transformation
 * Author: george1806
 */
export class UpdateCompoundDto extends PartialType(CreateCompoundDto) {
    @ApiProperty({ example: 'Sunset Gardens', required: false })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    @MinLength(2)
    @MaxLength(255)
    name?: string;

    @ApiProperty({ example: '123 Main Street', required: false })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    @MinLength(5)
    @MaxLength(500)
    addressLine?: string;

    @ApiProperty({ example: 'New York', required: false })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    city?: string;

    @ApiProperty({ example: 'NY', required: false })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    @MaxLength(100)
    region?: string;

    @ApiProperty({ example: 'USA', required: false })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    country?: string;

    @ApiProperty({ example: 40.7128, required: false, description: 'Latitude' })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsNumber()
    @Min(-90)
    @Max(90)
    geoLat?: number;

    @ApiProperty({ example: -74.006, required: false, description: 'Longitude' })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsNumber()
    @Min(-180)
    @Max(180)
    geoLng?: number;

    @ApiProperty({ example: 'Modern residential complex with amenities', required: false })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    notes?: string;

    @ApiProperty({ example: true, required: false })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
