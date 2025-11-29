import { Test, TestingModule } from '@nestjs/testing';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { SoftDeleteService } from '../soft-delete.service';
import { TenantBaseEntity } from '../../../database/entities/base.entity';

// Mock entity for testing
class MockEntity extends TenantBaseEntity {
  name: string;
}

describe('SoftDeleteService', () => {
  let service: SoftDeleteService;
  let mockRepository: jest.Mocked<Repository<MockEntity>>;

  beforeEach(async () => {
    mockRepository = {
      update: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
      metadata: {
        tableName: 'test_table',
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [SoftDeleteService],
    }).compile();

    service = module.get<SoftDeleteService>(SoftDeleteService);
  });

  describe('softDelete', () => {
    it('should soft delete a single record', async () => {
      const updateResult: UpdateResult = { affected: 1, raw: {}, generatedMaps: [] };
      mockRepository.update.mockResolvedValue(updateResult);

      const result = await service.softDelete(mockRepository, 'test-id');

      expect(result).toBe(true);
      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should return false if no record found', async () => {
      const updateResult: UpdateResult = { affected: 0, raw: {}, generatedMaps: [] };
      mockRepository.update.mockResolvedValue(updateResult);

      const result = await service.softDelete(mockRepository, 'nonexistent-id');

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockRepository.update.mockRejectedValue(new Error('Database error'));

      await expect(service.softDelete(mockRepository, 'test-id')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('softDeleteMany', () => {
    it('should soft delete multiple records', async () => {
      const updateResult: UpdateResult = { affected: 3, raw: {}, generatedMaps: [] };
      mockRepository.update.mockResolvedValue(updateResult);

      const result = await service.softDeleteMany(mockRepository, ['id-1', 'id-2', 'id-3']);

      expect(result).toBe(3);
      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should return 0 if no records deleted', async () => {
      const updateResult: UpdateResult = { affected: 0, raw: {}, generatedMaps: [] };
      mockRepository.update.mockResolvedValue(updateResult);

      const result = await service.softDeleteMany(mockRepository, []);

      expect(result).toBe(0);
    });
  });

  describe('restore', () => {
    it('should restore a soft deleted record', async () => {
      const updateResult: UpdateResult = { affected: 1, raw: {}, generatedMaps: [] };
      mockRepository.update.mockResolvedValue(updateResult);

      const result = await service.restore(mockRepository, 'test-id');

      expect(result).toBe(true);
    });

    it('should return false if record not found', async () => {
      const updateResult: UpdateResult = { affected: 0, raw: {}, generatedMaps: [] };
      mockRepository.update.mockResolvedValue(updateResult);

      const result = await service.restore(mockRepository, 'nonexistent-id');

      expect(result).toBe(false);
    });
  });

  describe('restoreMany', () => {
    it('should restore multiple soft deleted records', async () => {
      const updateResult: UpdateResult = { affected: 2, raw: {}, generatedMaps: [] };
      mockRepository.update.mockResolvedValue(updateResult);

      const result = await service.restoreMany(mockRepository, ['id-1', 'id-2']);

      expect(result).toBe(2);
    });
  });

  describe('hardDelete', () => {
    it('should hard delete a record', async () => {
      const deleteResult: DeleteResult = { affected: 1, raw: {} };
      mockRepository.delete.mockResolvedValue(deleteResult);

      const result = await service.hardDelete(mockRepository, 'test-id');

      expect(result).toBe(true);
      expect(mockRepository.delete).toHaveBeenCalled();
    });

    it('should return false if record not found', async () => {
      const deleteResult: DeleteResult = { affected: 0, raw: {} };
      mockRepository.delete.mockResolvedValue(deleteResult);

      const result = await service.hardDelete(mockRepository, 'nonexistent-id');

      expect(result).toBe(false);
    });

    it('should log warning for hard delete', async () => {
      const deleteResult: DeleteResult = { affected: 1, raw: {} };
      mockRepository.delete.mockResolvedValue(deleteResult);
      const warnSpy = jest.spyOn(service['logger'], 'warn');

      await service.hardDelete(mockRepository, 'test-id');

      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('hardDeleteMany', () => {
    it('should hard delete multiple records', async () => {
      const deleteResult: DeleteResult = { affected: 2, raw: {} };
      mockRepository.delete.mockResolvedValue(deleteResult);

      const result = await service.hardDeleteMany(mockRepository, ['id-1', 'id-2']);

      expect(result).toBe(2);
    });
  });

  describe('findDeleted', () => {
    it('should find only soft deleted records', async () => {
      const deletedRecords = [
        {
          id: '1',
          companyId: 'company-1',
          name: 'Deleted Item',
          deletedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockRepository.find.mockResolvedValue(deletedRecords);

      const result = await service.findDeleted(mockRepository);

      expect(result).toEqual(deletedRecords);
      expect(mockRepository.find).toHaveBeenCalled();
    });

    it('should filter by additional criteria', async () => {
      mockRepository.find.mockResolvedValue([]);

      await service.findDeleted(mockRepository, { companyId: 'company-1' } as any);

      const call = mockRepository.find.mock.calls[0][0];
      expect(call.where).toBeDefined();
    });
  });

  describe('findDeletedForCompany', () => {
    it('should find soft deleted records for a company', async () => {
      mockRepository.find.mockResolvedValue([]);

      await service.findDeletedForCompany(mockRepository, 'company-1');

      expect(mockRepository.find).toHaveBeenCalled();
    });
  });

  describe('countDeleted', () => {
    it('should count soft deleted records', async () => {
      mockRepository.count.mockResolvedValue(5);

      const result = await service.countDeleted(mockRepository);

      expect(result).toBe(5);
    });

    it('should count soft deleted records for criteria', async () => {
      mockRepository.count.mockResolvedValue(2);

      const result = await service.countDeleted(mockRepository, { companyId: 'company-1' } as any);

      expect(result).toBe(2);
    });
  });

  describe('cleanupOldDeletedRecords', () => {
    it('should cleanup old soft deleted records', async () => {
      const mockQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 10 }),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.cleanupOldDeletedRecords(mockRepository, 30);

      expect(result).toBe(10);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should use correct date cutoff', async () => {
      const mockQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.cleanupOldDeletedRecords(mockRepository, 30);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at <'),
        expect.objectContaining({
          cutoffDate: expect.any(Date),
        }),
      );
    });
  });

  describe('getStats', () => {
    it('should return soft delete statistics', async () => {
      mockRepository.count.mockResolvedValueOnce(100); // total
      mockRepository.count.mockResolvedValueOnce(25); // deleted

      const result = await service.getStats(mockRepository);

      expect(result).toEqual({
        total: 100,
        active: 75,
        deleted: 25,
        deletedPercentage: 25,
      });
    });

    it('should calculate percentage correctly', async () => {
      mockRepository.count.mockResolvedValueOnce(50); // total
      mockRepository.count.mockResolvedValueOnce(10); // deleted

      const result = await service.getStats(mockRepository);

      expect(result.deletedPercentage).toBe(20);
    });

    it('should handle zero total records', async () => {
      mockRepository.count.mockResolvedValueOnce(0); // total
      mockRepository.count.mockResolvedValueOnce(0); // deleted

      const result = await service.getStats(mockRepository);

      expect(result.deletedPercentage).toBe(0);
    });

    it('should filter by company when provided', async () => {
      mockRepository.count.mockResolvedValue(50);

      await service.getStats(mockRepository, 'company-1');

      expect(mockRepository.count).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle null affected value from update', async () => {
      const updateResult: UpdateResult = { affected: null, raw: {}, generatedMaps: [] };
      mockRepository.update.mockResolvedValue(updateResult);

      const result = await service.softDelete(mockRepository, 'test-id');

      expect(result).toBe(false);
    });

    it('should handle null affected value from delete', async () => {
      const deleteResult: DeleteResult = { affected: null, raw: {} };
      mockRepository.delete.mockResolvedValue(deleteResult);

      const result = await service.hardDelete(mockRepository, 'test-id');

      expect(result).toBe(false);
    });

    it('should handle empty ID array', async () => {
      const updateResult: UpdateResult = { affected: 0, raw: {}, generatedMaps: [] };
      mockRepository.update.mockResolvedValue(updateResult);

      const result = await service.softDeleteMany(mockRepository, []);

      expect(result).toBe(0);
    });
  });
});
