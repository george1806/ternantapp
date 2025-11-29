import { Test, TestingModule } from '@nestjs/testing';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { BaseRepository } from '../base.repository';
import { PaginationService } from '../pagination.service';
import { PaginationParams } from '../pagination.types';

// Mock entity for testing
class MockEntity {
  id: string;
  name: string;
  createdAt: Date;
  email: string;
}

// Concrete implementation for testing
class MockRepository extends BaseRepository<MockEntity> {}

describe('BaseRepository', () => {
  let repository: MockRepository;
  let mockTypeOrmRepository: jest.Mocked<Repository<MockEntity>>;
  let paginationService: PaginationService;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<MockEntity>>;

  beforeEach(async () => {
    // Mock QueryBuilder
    mockQueryBuilder = {
      getCount: jest.fn().mockResolvedValue(100),
      getMany: jest.fn().mockResolvedValue([]),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
    } as any;

    // Mock TypeORM Repository
    mockTypeOrmRepository = {
      count: jest.fn().mockResolvedValue(100),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
      remove: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaginationService,
        {
          provide: Repository,
          useValue: mockTypeOrmRepository,
        },
      ],
    }).compile();

    paginationService = module.get<PaginationService>(PaginationService);
    repository = new MockRepository(mockTypeOrmRepository, paginationService);
  });

  describe('paginate', () => {
    it('should paginate query builder results', async () => {
      const params: PaginationParams = { page: 1, limit: 20 };
      mockQueryBuilder.getMany.mockResolvedValue([
        { id: '1', name: 'Item 1', createdAt: new Date(), email: 'test1@example.com' },
        { id: '2', name: 'Item 2', createdAt: new Date(), email: 'test2@example.com' },
      ]);

      const result = await repository.paginate(mockQueryBuilder, params);

      expect(result.data).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total).toBe(100);
    });

    it('should skip and take correct amounts', async () => {
      const params: PaginationParams = { page: 2, limit: 20 };
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await repository.paginate(mockQueryBuilder, params);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('should calculate hasNextPage correctly', async () => {
      const params: PaginationParams = { page: 1, limit: 20 };
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await repository.paginate(mockQueryBuilder, params);

      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.pages).toBe(5); // 100/20 = 5
    });

    it('should indicate no next page on last page', async () => {
      const params: PaginationParams = { page: 5, limit: 20 };
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await repository.paginate(mockQueryBuilder, params);

      expect(result.pagination.hasNextPage).toBe(false);
    });
  });

  describe('findWithPagination', () => {
    it('should find records with pagination', async () => {
      const mockEntities = [
        { id: '1', name: 'Test', createdAt: new Date(), email: 'test@example.com' },
      ];
      mockTypeOrmRepository.find.mockResolvedValue(mockEntities);

      const where = { isActive: true };
      const params: PaginationParams = { page: 1, limit: 20 };

      const result = await repository.findWithPagination(where, params);

      expect(result.data).toEqual(mockEntities);
      expect(result.pagination).toBeDefined();
    });

    it('should pass correct parameters to repository.find', async () => {
      mockTypeOrmRepository.find.mockResolvedValue([]);

      const where = { isActive: true };
      const params: PaginationParams = { page: 1, limit: 20 };
      const relations = ['company', 'user'];
      const order = { createdAt: 'DESC' as const };

      await repository.findWithPagination(where, params, relations, order);

      expect(mockTypeOrmRepository.find).toHaveBeenCalledWith({
        where,
        skip: 0,
        take: 20,
        relations,
        order,
      });
    });

    it('should handle missing relations', async () => {
      mockTypeOrmRepository.find.mockResolvedValue([]);

      const where = { isActive: true };
      const params: PaginationParams = { page: 1, limit: 20 };

      await repository.findWithPagination(where, params);

      const call = mockTypeOrmRepository.find.mock.calls[0][0];
      expect(call.relations).toBeUndefined();
    });
  });

  describe('count', () => {
    it('should count records matching criteria', async () => {
      const where = { isActive: true };

      const result = await repository.count(where);

      expect(result).toBe(100);
      expect(mockTypeOrmRepository.count).toHaveBeenCalledWith({ where });
    });
  });

  describe('findOne', () => {
    it('should find one record', async () => {
      const mockEntity: MockEntity = {
        id: '1',
        name: 'Test',
        createdAt: new Date(),
        email: 'test@example.com',
      };
      mockTypeOrmRepository.findOne.mockResolvedValue(mockEntity);

      const where = { id: '1' };
      const result = await repository.findOne(where);

      expect(result).toEqual(mockEntity);
      expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({ where, relations: undefined });
    });

    it('should find one with relations', async () => {
      const where = { id: '1' };
      const relations = ['company'];

      await repository.findOne(where, relations);

      expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({ where, relations });
    });
  });

  describe('save', () => {
    it('should save entity', async () => {
      const entity: MockEntity = {
        id: '1',
        name: 'Test',
        createdAt: new Date(),
        email: 'test@example.com',
      };
      mockTypeOrmRepository.save.mockResolvedValue(entity);

      const result = await repository.save(entity);

      expect(result).toEqual(entity);
      expect(mockTypeOrmRepository.save).toHaveBeenCalledWith(entity);
    });
  });

  describe('saveMany', () => {
    it('should save multiple entities', async () => {
      const entities: MockEntity[] = [
        { id: '1', name: 'Test1', createdAt: new Date(), email: 'test1@example.com' },
        { id: '2', name: 'Test2', createdAt: new Date(), email: 'test2@example.com' },
      ];
      mockTypeOrmRepository.save.mockResolvedValue(entities);

      const result = await repository.saveMany(entities);

      expect(result).toEqual(entities);
      expect(mockTypeOrmRepository.save).toHaveBeenCalledWith(entities);
    });
  });

  describe('remove', () => {
    it('should remove entity', async () => {
      const entity: MockEntity = {
        id: '1',
        name: 'Test',
        createdAt: new Date(),
        email: 'test@example.com',
      };
      mockTypeOrmRepository.remove.mockResolvedValue(entity);

      const result = await repository.remove(entity);

      expect(result).toEqual(entity);
      expect(mockTypeOrmRepository.remove).toHaveBeenCalledWith(entity);
    });
  });

  describe('removeMany', () => {
    it('should remove multiple entities', async () => {
      const entities: MockEntity[] = [
        { id: '1', name: 'Test1', createdAt: new Date(), email: 'test1@example.com' },
        { id: '2', name: 'Test2', createdAt: new Date(), email: 'test2@example.com' },
      ];
      mockTypeOrmRepository.remove.mockResolvedValue(entities);

      const result = await repository.removeMany(entities);

      expect(result).toEqual(entities);
      expect(mockTypeOrmRepository.remove).toHaveBeenCalledWith(entities);
    });
  });
});
