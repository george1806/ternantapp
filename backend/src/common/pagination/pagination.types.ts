/**
 * Pagination Types
 * Reusable interfaces for paginated API responses
 *
 * Author: george1806
 */

/**
 * Pagination Parameters
 * Extracted from query parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sort?: SortOption[];
}

/**
 * Sort Configuration
 */
export interface SortOption {
  field: string;
  direction: 'ASC' | 'DESC';
}

/**
 * Paginated Result
 * Generic type for paginated responses
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMetadata;
}

/**
 * Pagination Metadata
 * Includes useful information about the paginated result
 */
export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Query Builder Options
 * Options passed to TypeORM QueryBuilder
 */
export interface QueryBuilderOptions {
  skip: number;
  take: number;
  order: Record<string, 'ASC' | 'DESC'>;
}
