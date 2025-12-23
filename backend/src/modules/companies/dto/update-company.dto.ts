import { PartialType, OmitType, ApiProperty } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto';
import { IsString, IsOptional, IsUrl } from 'class-validator';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}

export class UpdateCompanyProfileDto extends PartialType(
    OmitType(CreateCompanyDto, ['slug'] as const)
) {
    @ApiProperty({ example: '123 Main Street', required: false })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiProperty({ example: 'New York', required: false })
    @IsString()
    @IsOptional()
    city?: string;

    @ApiProperty({ example: 'NY', required: false })
    @IsString()
    @IsOptional()
    region?: string;

    @ApiProperty({ example: 'United States', required: false })
    @IsString()
    @IsOptional()
    country?: string;

    @ApiProperty({ example: '10001', required: false })
    @IsString()
    @IsOptional()
    postalCode?: string;

    @ApiProperty({ example: 'https://company.com', required: false })
    @IsString()
    @IsOptional()
    @IsUrl()
    website?: string;
}
