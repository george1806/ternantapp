import { ApiProperty } from '@nestjs/swagger';
import {
    IsString,
    IsEmail,
    IsOptional,
    MinLength,
    MaxLength,
    Matches,
    IsEnum
} from 'class-validator';
import { Currency } from '../../../common/enums';

export class CreateCompanyDto {
    @ApiProperty({ example: 'Acme Properties' })
    @IsString()
    @MinLength(2)
    @MaxLength(255)
    name: string;

    @ApiProperty({ example: 'acme-properties' })
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    @Matches(/^[a-z0-9-]+$/, {
        message: 'Slug must contain only lowercase letters, numbers, and hyphens'
    })
    slug: string;

    @ApiProperty({ example: 'contact@acmeproperties.com' })
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiProperty({ example: '+1234567890' })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiProperty({
        example: 'USD',
        enum: Currency,
        description: 'Company operating currency (ISO 4217 code)'
    })
    @IsEnum(Currency, {
        message: 'Invalid currency code. Must be one of the supported currencies.'
    })
    @IsOptional()
    currency?: Currency;

    @ApiProperty({ example: 'America/New_York' })
    @IsString()
    @IsOptional()
    timezone?: string;
}
