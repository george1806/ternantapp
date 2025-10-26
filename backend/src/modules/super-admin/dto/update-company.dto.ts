import {
    IsString,
    IsEmail,
    IsOptional,
    MinLength,
    MaxLength,
    IsEnum
} from 'class-validator';

export enum CompanyStatus {
    ACTIVE = 'ACTIVE',
    SUSPENDED = 'SUSPENDED',
    INACTIVE = 'INACTIVE'
}

export class UpdateCompanyDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

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

    @IsOptional()
    @IsEnum(CompanyStatus)
    status?: CompanyStatus;
}
