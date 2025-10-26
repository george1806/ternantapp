import {
    IsString,
    IsEmail,
    IsOptional,
    IsDateString,
    IsNumber,
    IsArray,
    IsEnum,
    MaxLength,
    Min,
    ValidateNested
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class ReferenceDto {
    @ApiProperty({ description: 'Reference name', example: 'Jane Smith' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Reference phone', example: '+1234567890' })
    @IsString()
    phone: string;

    @ApiProperty({
        description: 'Relationship to tenant',
        example: 'Former Landlord'
    })
    @IsString()
    relationship: string;

    @ApiPropertyOptional({
        description: 'Reference email',
        example: 'jane@example.com'
    })
    @IsOptional()
    @IsEmail()
    email?: string;
}

class DocumentDto {
    @ApiProperty({ description: 'Document type', example: 'ID Card' })
    @IsString()
    type: string;

    @ApiProperty({ description: 'File name', example: 'id_card.pdf' })
    @IsString()
    fileName: string;

    @ApiProperty({ description: 'File URL', example: '/uploads/documents/...' })
    @IsString()
    fileUrl: string;

    @ApiProperty({ description: 'Upload timestamp', example: '2024-01-01T00:00:00Z' })
    @IsDateString()
    uploadedAt: string;
}

export class CreateTenantDto {
    @ApiProperty({ description: 'First name', example: 'John' })
    @IsString()
    @MaxLength(100)
    firstName: string;

    @ApiProperty({ description: 'Last name', example: 'Doe' })
    @IsString()
    @MaxLength(100)
    lastName: string;

    @ApiProperty({
        description: 'Email address',
        example: 'john.doe@example.com'
    })
    @IsEmail()
    @MaxLength(255)
    email: string;

    @ApiPropertyOptional({
        description: 'Primary phone number',
        example: '+1234567890'
    })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    phone?: string;

    @ApiPropertyOptional({
        description: 'Alternate phone number',
        example: '+0987654321'
    })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    alternatePhone?: string;

    @ApiPropertyOptional({
        description: 'Date of birth',
        example: '1990-01-15'
    })
    @IsOptional()
    @IsDateString()
    dateOfBirth?: string;

    @ApiPropertyOptional({
        description: 'ID document type',
        example: 'Passport'
    })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    idType?: string;

    @ApiPropertyOptional({
        description: 'ID document number',
        example: 'AB123456'
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    idNumber?: string;

    @ApiPropertyOptional({
        description: 'Current residential address',
        example: '123 Current St, City, Country'
    })
    @IsOptional()
    @IsString()
    currentAddress?: string;

    @ApiPropertyOptional({
        description: 'Emergency contact name',
        example: 'Jane Doe'
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    emergencyContactName?: string;

    @ApiPropertyOptional({
        description: 'Emergency contact phone',
        example: '+1122334455'
    })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    emergencyContactPhone?: string;

    @ApiPropertyOptional({
        description: 'Emergency contact relationship',
        example: 'Spouse'
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    emergencyContactRelationship?: string;

    @ApiPropertyOptional({
        description: 'Employer name',
        example: 'ABC Corporation'
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    employerName?: string;

    @ApiPropertyOptional({
        description: 'Employer phone number',
        example: '+1555666777'
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    employerPhone?: string;

    @ApiPropertyOptional({
        description: 'Monthly income',
        example: 5000.0
    })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    monthlyIncome?: number;

    @ApiPropertyOptional({
        description: 'List of references',
        type: [ReferenceDto]
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ReferenceDto)
    references?: ReferenceDto[];

    @ApiPropertyOptional({
        description: 'List of uploaded documents',
        type: [DocumentDto]
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DocumentDto)
    documents?: DocumentDto[];

    @ApiPropertyOptional({ description: 'Additional notes' })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional({
        description: 'Tenant status',
        enum: ['active', 'inactive', 'blacklisted'],
        default: 'active'
    })
    @IsOptional()
    @IsEnum(['active', 'inactive', 'blacklisted'])
    status?: 'active' | 'inactive' | 'blacklisted';
}
