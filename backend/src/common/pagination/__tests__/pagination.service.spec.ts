import { Test, TestingModule } from '@nestjs/testing';
import { PaginationService } from '../pagination.service';
import { PaginationParams } from '../pagination.types';

describe('PaginationService', () => {
  let service: PaginationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaginationService],
    }).compile();

    service = module.get<PaginationService>(PaginationService);
  });

  describe('parsePaginationParams', () => {
    it('should parse valid page and limit', () => {
      const result = service.parsePaginationParams(2, 30);

      expect(result).toEqual({
        page: 2,
        limit: 30,
      });
    });

    it('should parse string numbers', () => {
      const result = service.parsePaginationParams('2', '30');

      expect(result).toEqual({
        page: 2,
        limit: 30,
      });
    });

    it('should use defaults when not provided', () => {
      const result = service.parsePaginationParams(undefined, undefined);

      expect(result.page).toBe(service.DEFAULT_PAGE);
      expect(result.limit).toBe(service.DEFAULT_LIMIT);
    });

    it('should handle page < 1 by using default', () => {
      const result = service.parsePaginationParams(0, 20);

      expect(result.page).toBe(service.DEFAULT_PAGE);
    });

    it('should handle negative page', () => {
      const result = service.parsePaginationParams(-5, 20);

      expect(result.page).toBe(service.DEFAULT_PAGE);
    });

    it('should handle limit < 1 by using minimum', () => {
      const result = service.parsePaginationParams(1, 0);

      expect(result.limit).toBe(service.MIN_LIMIT);
    });

    it('should cap limit to MAX_LIMIT', () => {
      const result = service.parsePaginationParams(1, 1000);

      expect(result.limit).toBe(service.MAX_LIMIT);
    });

    it('should handle negative limit', () => {
      const result = service.parsePaginationParams(1, -10);

      expect(result.limit).toBe(service.MIN_LIMIT);
    });

    it('should handle NaN values', () => {
      const result = service.parsePaginationParams(NaN as any, NaN as any);

      expect(result.page).toBe(service.DEFAULT_PAGE);
      expect(result.limit).toBe(service.DEFAULT_LIMIT);
    });

    it('should handle non-numeric strings', () => {
      const result = service.parsePaginationParams('abc' as any, 'xyz' as any);

      expect(result.page).toBe(service.DEFAULT_PAGE);
      expect(result.limit).toBe(service.DEFAULT_LIMIT);
    });
  });

  describe('parseSortParam', () => {
    it('should parse single sort field', () => {
      const result = service.parseSortParam('createdAt:DESC');

      expect(result).toEqual([
        {
          field: 'createdAt',
          direction: 'DESC',
        },
      ]);
    });

    it('should parse multiple sort fields', () => {
      const result = service.parseSortParam('name:ASC,createdAt:DESC');

      expect(result).toEqual([
        { field: 'name', direction: 'ASC' },
        { field: 'createdAt', direction: 'DESC' },
      ]);
    });

    it('should default to ASC when direction not specified', () => {
      const result = service.parseSortParam('name');

      expect(result[0].direction).toBe('ASC');
    });

    it('should handle case-insensitive direction', () => {
      const result = service.parseSortParam('name:desc');

      expect(result[0].direction).toBe('DESC');
    });

    it('should handle whitespace', () => {
      const result = service.parseSortParam('  name  :  ASC  ,  createdAt  :  DESC  ');

      expect(result).toHaveLength(2);
      expect(result[0].field).toBe('name');
      expect(result[1].field).toBe('createdAt');
    });

    it('should return empty array for undefined', () => {
      const result = service.parseSortParam(undefined);

      expect(result).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      const result = service.parseSortParam('');

      expect(result).toEqual([]);
    });

    it('should ignore invalid sort entries', () => {
      const result = service.parseSortParam('name:ASC,invalid-direction:SIDEWAYS,id:DESC');

      expect(result.length).toBeLessThanOrEqual(2);
    });
  });

  describe('calculateMetadata', () => {
    it('should calculate correct metadata', () => {
      const result = service.calculateMetadata(1, 20, 100);

      expect(result).toEqual({
        page: 1,
        limit: 20,
        total: 100,
        pages: 5,
        hasNextPage: true,
        hasPreviousPage: false,
      });
    });

    it('should calculate metadata for middle page', () => {
      const result = service.calculateMetadata(3, 20, 100);

      expect(result).toEqual({
        page: 3,
        limit: 20,
        total: 100,
        pages: 5,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });

    it('should calculate metadata for last page', () => {
      const result = service.calculateMetadata(5, 20, 100);

      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(true);
    });

    it('should calculate pages correctly with remainder', () => {
      const result = service.calculateMetadata(1, 20, 105);

      expect(result.pages).toBe(6); // Math.ceil(105/20) = 6
    });

    it('should handle single item', () => {
      const result = service.calculateMetadata(1, 20, 1);

      expect(result).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('should handle zero items', () => {
      const result = service.calculateMetadata(1, 20, 0);

      expect(result.pages).toBe(0);
      expect(result.hasNextPage).toBe(false);
    });
  });

  describe('generateQueryBuilderOptions', () => {
    it('should generate skip and take from pagination params', () => {
      const params: PaginationParams = { page: 2, limit: 20 };
      const result = service.generateQueryBuilderOptions(params);

      expect(result).toEqual({
        skip: 20, // (2-1) * 20
        take: 20,
        order: {},
      });
    });

    it('should calculate correct skip for page 1', () => {
      const params: PaginationParams = { page: 1, limit: 20 };
      const result = service.generateQueryBuilderOptions(params);

      expect(result.skip).toBe(0);
    });

    it('should use default sort when provided', () => {
      const params: PaginationParams = { page: 1, limit: 20 };
      const defaultSort = { createdAt: 'DESC' as const };

      const result = service.generateQueryBuilderOptions(params, defaultSort);

      expect(result.order).toEqual(defaultSort);
    });

    it('should handle large page numbers', () => {
      const params: PaginationParams = { page: 1000, limit: 50 };
      const result = service.generateQueryBuilderOptions(params);

      expect(result.skip).toBe(49950); // (1000-1) * 50
    });
  });

  describe('validateSortFields', () => {
    it('should allow valid sort fields', () => {
      const sortOptions = [
        { field: 'name', direction: 'ASC' as const },
        { field: 'createdAt', direction: 'DESC' as const },
      ];
      const allowedFields = ['name', 'createdAt', 'email'];

      const result = service.validateSortFields(sortOptions, allowedFields);

      expect(result).toHaveLength(2);
    });

    it('should filter out disallowed fields', () => {
      const sortOptions = [
        { field: 'name', direction: 'ASC' as const },
        { field: 'passwordHash', direction: 'DESC' as const },
      ];
      const allowedFields = ['name', 'createdAt'];

      const result = service.validateSortFields(sortOptions, allowedFields);

      expect(result).toHaveLength(1);
      expect(result[0].field).toBe('name');
    });

    it('should return empty array when no fields match', () => {
      const sortOptions = [{ field: 'secret', direction: 'ASC' as const }];
      const allowedFields = ['name', 'email'];

      const result = service.validateSortFields(sortOptions, allowedFields);

      expect(result).toHaveLength(0);
    });
  });

  describe('convertSortToOrder', () => {
    it('should convert sort options to TypeORM order format', () => {
      const sortOptions = [
        { field: 'name', direction: 'ASC' as const },
        { field: 'createdAt', direction: 'DESC' as const },
      ];

      const result = service.convertSortToOrder(sortOptions, 'invoice');

      expect(result).toEqual({
        'invoice.name': 'ASC',
        'invoice.createdAt': 'DESC',
      });
    });

    it('should use table alias correctly', () => {
      const sortOptions = [{ field: 'id', direction: 'ASC' as const }];

      const result = service.convertSortToOrder(sortOptions, 'user');

      expect(result['user.id']).toBe('ASC');
    });

    it('should handle empty sort options', () => {
      const result = service.convertSortToOrder([], 'invoice');

      expect(result).toEqual({});
    });
  });

  describe('Edge cases', () => {
    it('should handle very large numbers', () => {
      const result = service.parsePaginationParams(Number.MAX_SAFE_INTEGER, 100);

      expect(result.page).toBe(service.DEFAULT_PAGE); // Should be invalid
    });

    it('should handle float numbers', () => {
      const result = service.parsePaginationParams(1.5, 20.7);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should handle null values', () => {
      const result = service.parsePaginationParams(null as any, null as any);

      expect(result.page).toBe(service.DEFAULT_PAGE);
      expect(result.limit).toBe(service.DEFAULT_LIMIT);
    });
  });
});
