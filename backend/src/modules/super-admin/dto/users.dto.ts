import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MinLength,
    IsInt,
    Min
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole, UserStatus } from '../../../common/enums';

/**
 * Create User DTO
 */
export class CreateUserDto {
    @ApiProperty({ description: 'Company ID' })
    @IsUUID()
    @IsNotEmpty()
    companyId: string;

    @ApiProperty({ description: 'First name' })
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @ApiProperty({ description: 'Last name' })
    @IsString()
    @IsNotEmpty()
    lastName: string;

    @ApiProperty({ description: 'Email address', example: 'user@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ description: 'Password', minLength: 8 })
    @IsString()
    @MinLength(8)
    @IsNotEmpty()
    password: string;

    @ApiProperty({ description: 'User role', enum: UserRole })
    @IsEnum(UserRole)
    @IsNotEmpty()
    role: UserRole;

    @ApiPropertyOptional({ description: 'Phone number' })
    @IsString()
    @IsOptional()
    phone?: string;
}

/**
 * Update User DTO
 */
export class UpdateUserDto extends PartialType(CreateUserDto) {
    @ApiPropertyOptional({ description: 'User status', enum: UserStatus })
    @IsEnum(UserStatus)
    @IsOptional()
    status?: UserStatus;
}

/**
 * List Users Query DTO
 */
export class ListUsersQueryDto {
    @ApiPropertyOptional({ description: 'Page number', default: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Items per page', default: 20 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    limit?: number = 20;

    @ApiPropertyOptional({ description: 'Search by name or email' })
    @IsString()
    @IsOptional()
    search?: string;

    @ApiPropertyOptional({ description: 'Filter by company ID' })
    @IsUUID()
    @IsOptional()
    companyId?: string;

    @ApiPropertyOptional({ description: 'Filter by role', enum: UserRole })
    @IsEnum(UserRole)
    @IsOptional()
    role?: UserRole;

    @ApiPropertyOptional({ description: 'Filter by status', enum: UserStatus })
    @IsEnum(UserStatus)
    @IsOptional()
    status?: UserStatus;

    @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
    @IsString()
    @IsOptional()
    sortBy?: string = 'createdAt';

    @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'] })
    @IsString()
    @IsOptional()
    sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
