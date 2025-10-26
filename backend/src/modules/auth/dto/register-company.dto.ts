import { ApiProperty } from '@nestjs/swagger';
import {
    IsEmail,
    IsString,
    MinLength,
    MaxLength,
    Matches,
    ValidateNested,
    IsEnum,
    IsOptional
} from 'class-validator';
import { Type } from 'class-transformer';
import { Currency } from '../../../common/enums';

/**
 * Company registration DTO (nested)
 * Author: george1806
 */
class CompanyDto {
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

    @ApiProperty({ example: 'contact@acmeproperties.com', required: false })
    @IsEmail()
    email: string;

    @ApiProperty({ example: '+1234567890', required: false })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiProperty({
        example: 'USD',
        enum: Currency,
        required: false,
        description: 'Company operating currency (ISO 4217 code)'
    })
    @IsEnum(Currency, {
        message: 'Invalid currency code. Must be one of the supported currencies.'
    })
    @IsOptional()
    currency?: Currency;

    @ApiProperty({ example: 'America/New_York', required: false })
    @IsString()
    @IsOptional()
    timezone?: string;
}

/**
 * Owner user DTO (nested)
 * Author: george1806
 */
class OwnerDto {
    @ApiProperty({ example: 'John' })
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    firstName: string;

    @ApiProperty({ example: 'Doe' })
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    lastName: string;

    @ApiProperty({ example: 'john.doe@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'SecurePass123!', minLength: 8 })
    @IsString()
    @MinLength(8)
    @MaxLength(100)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
        message:
            'Password must contain uppercase, lowercase, number and special character'
    })
    password: string;

    @ApiProperty({ example: '+1234567890', required: false })
    @IsString()
    phone?: string;
}

/**
 * Register company DTO (creates company + owner user)
 * Author: george1806
 */
export class RegisterCompanyDto {
    @ApiProperty({ type: CompanyDto })
    @ValidateNested()
    @Type(() => CompanyDto)
    company: CompanyDto;

    @ApiProperty({ type: OwnerDto })
    @ValidateNested()
    @Type(() => OwnerDto)
    owner: OwnerDto;
}
