import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateTenantDto } from './create-tenant.dto';
import {
    IsString,
    IsEmail,
    IsOptional,
    IsDateString,
    IsIn,
    MaxLength
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Update Tenant DTO
 * All fields are optional for partial updates
 * Handles empty string transformation to prevent validation errors
 *
 * Author: george1806
 */
export class UpdateTenantDto extends PartialType(CreateTenantDto) {
    @ApiProperty({ description: 'First name', example: 'John' })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    @MaxLength(100)
    firstName?: string;

    @ApiProperty({ description: 'Last name', example: 'Doe' })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    @MaxLength(100)
    lastName?: string;

    @ApiProperty({ description: 'Email address', example: 'john.doe@example.com' })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsEmail()
    @MaxLength(255)
    email?: string;

    @ApiPropertyOptional({ description: 'Primary phone number', example: '+1234567890' })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    @MaxLength(50)
    phone?: string;

    @ApiPropertyOptional({ description: 'Alternate phone number', example: '+0987654321' })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    @MaxLength(50)
    alternatePhone?: string;

    @ApiPropertyOptional({ description: 'Date of birth', example: '1990-01-15' })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsDateString()
    dateOfBirth?: string;

    @ApiPropertyOptional({ description: 'ID document type', example: 'Passport' })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    @MaxLength(50)
    idType?: string;

    @ApiPropertyOptional({ description: 'ID document number', example: 'AB123456' })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    @MaxLength(100)
    idNumber?: string;

    @ApiPropertyOptional({ description: 'Current residential address', example: '123 Current St, City, Country' })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    currentAddress?: string;

    @ApiPropertyOptional({ description: 'Emergency contact name', example: 'Jane Doe' })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    @MaxLength(100)
    emergencyContactName?: string;

    @ApiPropertyOptional({ description: 'Emergency contact phone', example: '+1122334455' })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    @MaxLength(50)
    emergencyContactPhone?: string;

    @ApiPropertyOptional({ description: 'Emergency contact relationship', example: 'Spouse' })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    @MaxLength(100)
    emergencyContactRelationship?: string;

    @ApiPropertyOptional({ description: 'Employer name', example: 'ABC Corporation' })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    @MaxLength(255)
    employerName?: string;

    @ApiPropertyOptional({ description: 'Employer phone number', example: '+1555666777' })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    @MaxLength(100)
    employerPhone?: string;

    @ApiPropertyOptional({ description: 'Additional notes' })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    notes?: string;

    @ApiPropertyOptional({
        description: 'Tenant status',
        enum: ['active', 'inactive', 'blacklisted']
    })
    @IsOptional()
    @IsIn(['active', 'inactive', 'blacklisted'])
    status?: 'active' | 'inactive' | 'blacklisted';
}
