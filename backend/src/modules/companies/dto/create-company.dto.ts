import { ApiProperty } from '@nestjs/swagger';
import {
    IsString,
    IsEmail,
    IsOptional,
    MinLength,
    MaxLength,
    Matches
} from 'class-validator';

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

    @ApiProperty({ example: 'USD' })
    @IsString()
    @IsOptional()
    currency?: string;

    @ApiProperty({ example: 'America/New_York' })
    @IsString()
    @IsOptional()
    timezone?: string;
}
