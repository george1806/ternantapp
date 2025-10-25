import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, MinLength, MaxLength, IsBoolean, Min, Max } from 'class-validator';

/**
 * Create Compound DTO
 * Author: george1806
 */
export class CreateCompoundDto {
  @ApiProperty({ example: 'Sunset Gardens' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: '123 Main Street' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  addressLine: string;

  @ApiProperty({ example: 'New York' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: 'NY', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  region?: string;

  @ApiProperty({ example: 'USA' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  country: string;

  @ApiProperty({ example: 40.7128, required: false, description: 'Latitude' })
  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  geoLat?: number;

  @ApiProperty({ example: -74.0060, required: false, description: 'Longitude' })
  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  geoLng?: number;

  @ApiProperty({ example: 'Modern residential complex with amenities', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
