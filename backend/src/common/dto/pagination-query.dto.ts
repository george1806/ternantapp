import { IsOptional, IsInt, Min, Max, IsIn, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Base Pagination Query DTO
 *
 * Provides common pagination and sorting query parameters with validation.
 * Extend this class and override allowedSortFields to customize allowed sort fields.
 *
 * SECURITY: This DTO validates and whitelists sort fields to prevent SQL injection
 * through query parameters.
 *
 * @author george1806
 */
export class PaginationQueryDto {
    @ApiPropertyOptional({
        description: 'Page number (1-based)',
        minimum: 1,
        maximum: 1000,
        default: 1
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(1000)
    page?: number = 1;

    @ApiPropertyOptional({
        description: 'Number of items per page',
        minimum: 1,
        maximum: 100,
        default: 10
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @ApiPropertyOptional({
        description: 'Sort order',
        enum: ['ASC', 'DESC'],
        default: 'DESC'
    })
    @IsOptional()
    @IsIn(['ASC', 'DESC'])
    sortOrder?: 'ASC' | 'DESC' = 'DESC';

    /**
     * Override this property in child classes to define allowed sort fields
     */
    protected getAllowedSortFields(): string[] {
        return ['createdAt', 'updatedAt'];
    }

    /**
     * Validates that the sortBy field is in the allowed list
     * Call this in your service before using sortBy in queries
     */
    validateSortBy(sortBy?: string): string | undefined {
        if (!sortBy) {
            return this.getAllowedSortFields()[0]; // Default to first allowed field
        }

        const allowedFields = this.getAllowedSortFields();
        if (!allowedFields.includes(sortBy)) {
            throw new Error(
                `Invalid sort field: ${sortBy}. Allowed fields: ${allowedFields.join(', ')}`
            );
        }

        return sortBy;
    }
}

/**
 * Invoice Query DTO with whitelisted sort fields
 */
export class InvoiceQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({
        description: 'Sort field',
        enum: ['invoiceNumber', 'amount', 'dueDate', 'status', 'createdAt', 'updatedAt']
    })
    @IsOptional()
    @IsString()
    @IsIn(['invoiceNumber', 'amount', 'dueDate', 'status', 'createdAt', 'updatedAt'])
    sortBy?: string;

    @ApiPropertyOptional({
        description: 'Filter by status',
        enum: ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED']
    })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({
        description: 'Include inactive records',
        type: Boolean
    })
    @IsOptional()
    includeInactive?: boolean;

    protected getAllowedSortFields(): string[] {
        return ['invoiceNumber', 'amount', 'dueDate', 'status', 'createdAt', 'updatedAt'];
    }
}

/**
 * Payment Query DTO with whitelisted sort fields
 */
export class PaymentQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({
        description: 'Sort field',
        enum: ['amount', 'paymentDate', 'paymentMethod', 'createdAt', 'updatedAt']
    })
    @IsOptional()
    @IsString()
    @IsIn(['amount', 'paymentDate', 'paymentMethod', 'createdAt', 'updatedAt'])
    sortBy?: string;

    @ApiPropertyOptional({
        description: 'Filter by payment method',
        enum: ['CASH', 'BANK', 'MOBILE', 'CARD', 'OTHER']
    })
    @IsOptional()
    @IsString()
    paymentMethod?: string;

    protected getAllowedSortFields(): string[] {
        return ['amount', 'paymentDate', 'paymentMethod', 'createdAt', 'updatedAt'];
    }
}

/**
 * User Query DTO with whitelisted sort fields
 */
export class UserQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({
        description: 'Sort field',
        enum: ['email', 'firstName', 'lastName', 'role', 'status', 'createdAt', 'updatedAt']
    })
    @IsOptional()
    @IsString()
    @IsIn(['email', 'firstName', 'lastName', 'role', 'status', 'createdAt', 'updatedAt'])
    sortBy?: string;

    @ApiPropertyOptional({
        description: 'Filter by role',
        enum: ['ADMIN', 'OWNER', 'WORKER']
    })
    @IsOptional()
    @IsString()
    role?: string;

    @ApiPropertyOptional({
        description: 'Filter by status',
        enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED']
    })
    @IsOptional()
    @IsString()
    status?: string;

    protected getAllowedSortFields(): string[] {
        return ['email', 'firstName', 'lastName', 'role', 'status', 'createdAt', 'updatedAt'];
    }
}
