import {
    IsString,
    IsEmail,
    IsOptional,
    MinLength,
    MaxLength,
    Matches,
    IsPhoneNumber
} from 'class-validator';

export class CreateCompanyDto {
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name: string;

    @IsString()
    @MinLength(2)
    @MaxLength(50)
    @Matches(/^[a-z0-9-]+$/, {
        message: 'Slug must contain only lowercase letters, numbers, and hyphens'
    })
    slug: string;

    @IsEmail()
    email: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    @MaxLength(3)
    currency?: string;

    @IsOptional()
    @IsString()
    timezone?: string;

    // Owner information
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    ownerFirstName: string;

    @IsString()
    @MinLength(2)
    @MaxLength(100)
    ownerLastName: string;

    @IsEmail()
    ownerEmail: string;

    @IsString()
    @MinLength(8)
    ownerPassword: string;

    @IsOptional()
    @IsString()
    ownerPhone?: string;
}
