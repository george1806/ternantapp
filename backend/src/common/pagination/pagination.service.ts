import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PaginationParams, PaginationMetadata, QueryBuilderOptions, SortOption } from './pagination.types';
import { ErrorCode } from '../exceptions/base.exception';

/**
 * Pagination Service
 * Handles all pagination-related logic following SRP
 *
 * Responsibilities:
 * - Parse and validate pagination parameters
 * - Calculate pagination metadata
 * - Generate QueryBuilder options
 * - Handle sorting configuration
 */
@Injectable()
export class PaginationService {
  private readonly logger = new Logger(PaginationService.name);

  // Constants for pagination
  readonly MIN_PAGE = 1;
  readonly MIN_LIMIT = 1;
  readonly MAX_LIMIT = 500;
  readonly DEFAULT_PAGE = 1;
  readonly DEFAULT_LIMIT = 20;

  /**
   * Parse and validate pagination parameters from query
   */
  parsePaginationParams(page?: string | number, limit?: string | number): PaginationParams {
    // Parse page
    let parsedPage = this.parseNumber(page, this.DEFAULT_PAGE);
    if (parsedPage < this.MIN_PAGE) {
      this.logger.warn(`Invalid page number: ${parsedPage}, using default: ${this.DEFAULT_PAGE}`);
      parsedPage = this.DEFAULT_PAGE;
    }

    // Parse limit
    let parsedLimit = this.parseNumber(limit, this.DEFAULT_LIMIT);
    if (parsedLimit < this.MIN_LIMIT) {
      this.logger.warn(`Invalid limit: ${parsedLimit}, using minimum: ${this.MIN_LIMIT}`);
      parsedLimit = this.MIN_LIMIT;
    }
    if (parsedLimit > this.MAX_LIMIT) {
      this.logger.warn(`Limit exceeds maximum: ${parsedLimit}, capping to: ${this.MAX_LIMIT}`);
      parsedLimit = this.MAX_LIMIT;
    }

    return {
      page: parsedPage,
      limit: parsedLimit,
    };
  }

  /**
   * Parse sort parameter
   * Format: "field:ASC,field2:DESC"
   */
  parseSortParam(sort?: string): SortOption[] {
    if (!sort) {
      return [];
    }

    try {
      return sort.split(',').map((item) => {
        const [field, direction] = item.trim().split(':');

        if (!field) {
          throw new Error('Field name is required');
        }

        // Validate direction
        const validDirection = direction?.toUpperCase() || 'ASC';
        if (!['ASC', 'DESC'].includes(validDirection)) {
          throw new Error(`Invalid sort direction: ${direction}`);
        }

        return {
          field: field.trim(),
          direction: validDirection as 'ASC' | 'DESC',
        };
      });
    } catch (error) {
      this.logger.warn(`Invalid sort parameter: ${sort}`, error);
      return [];
    }
  }

  /**
   * Calculate pagination metadata
   */
  calculateMetadata(page: number, limit: number, total: number): PaginationMetadata {
    const pages = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      pages,
      hasNextPage: page < pages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Generate QueryBuilder options from pagination params
   */
  generateQueryBuilderOptions(
    params: PaginationParams,
    defaultSort?: Record<string, 'ASC' | 'DESC'>,
  ): QueryBuilderOptions {
    const skip = (params.page - 1) * params.limit;

    return {
      skip,
      take: params.limit,
      order: defaultSort || {},
    };
  }

  /**
   * Validate that sort fields are allowed
   * This prevents injection/abuse of sort parameters
   */
  validateSortFields(sortOptions: SortOption[], allowedFields: string[]): SortOption[] {
    const allowedSet = new Set(allowedFields);

    return sortOptions.filter((sort) => {
      if (!allowedSet.has(sort.field)) {
        this.logger.warn(`Attempted sort on disallowed field: ${sort.field}`);
        return false;
      }
      return true;
    });
  }

  /**
   * Convert sort options to TypeORM order object
   */
  convertSortToOrder(sortOptions: SortOption[], tableAlias: string): Record<string, 'ASC' | 'DESC'> {
    const order: Record<string, 'ASC' | 'DESC'> = {};

    for (const sort of sortOptions) {
      order[`${tableAlias}.${sort.field}`] = sort.direction;
    }

    return order;
  }

  /**
   * Private helper to parse number safely
   */
  private parseNumber(value: string | number | undefined, defaultValue: number): number {
    if (value === undefined || value === null) {
      return defaultValue;
    }

    const parsed = typeof value === 'string' ? parseInt(value, 10) : value;

    if (isNaN(parsed)) {
      this.logger.warn(`Failed to parse number: ${value}, using default: ${defaultValue}`);
      return defaultValue;
    }

    return parsed;
  }
}
