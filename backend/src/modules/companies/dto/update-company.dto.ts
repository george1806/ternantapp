import { PartialType, OmitType, ApiProperty } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto';
import { IsString, IsOptional, IsUrl, IsEmail, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { Currency } from '../../../common/enums';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}

export class UpdateCompanyProfileDto extends PartialType(
    OmitType(CreateCompanyDto, ['slug'] as const)
) {
    @ApiProperty({ example: 'contact@acmeproperties.com', required: false })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsEmail()
    email?: string;

    @ApiProperty({ example: '+1234567890', required: false })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    phone?: string;

    @ApiProperty({
        example: 'USD',
        enum: Currency,
        description: 'Company operating currency (ISO 4217 code)',
        required: false
    })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsEnum(Currency, {
        message: 'Invalid currency code. Must be one of the supported currencies.'
    })
    currency?: Currency;

    @ApiProperty({ example: 'America/New_York', required: false })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    timezone?: string;

    @ApiProperty({ example: '123 Main Street', required: false })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    address?: string;

    @ApiProperty({ example: 'New York', required: false })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    city?: string;

    @ApiProperty({ example: 'NY', required: false })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    region?: string;

    @ApiProperty({ example: 'United States', required: false })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    country?: string;

    @ApiProperty({ example: '10001', required: false })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsString()
    postalCode?: string;

    @ApiProperty({ example: 'https://company.com', required: false })
    @IsOptional()
    @Transform(({ value }) => value === '' ? undefined : value)
    @IsUrl({}, { message: 'Website must be a valid URL' })
    website?: string;
}
