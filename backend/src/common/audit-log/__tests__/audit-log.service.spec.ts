import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuditLogService } from '../audit-log.service';
import { AuditAction, AuditStatus, AuditLogEntry } from '../audit-log.types';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    configService = {
      get: jest.fn((key, defaultValue) => defaultValue),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  describe('log', () => {
    it('should log an audit entry', () => {
      const entry = {
        timestamp: new Date(),
        correlationId: 'corr-123',
        companyId: 'comp-1',
        action: AuditAction.CREATE,
        resource: 'invoices',
        method: 'POST',
        path: '/api/v1/invoices',
        status: AuditStatus.SUCCESS,
        statusCode: 201,
        duration: 100,
      };

      service.log(entry);

      const logs = (service as any).auditLogs;
      expect(logs.length).toBe(1);
      expect(logs[0].id).toBeDefined();
      expect(logs[0].action).toBe(AuditAction.CREATE);
    });

    it('should handle log errors gracefully', () => {
      const entry = {
        correlationId: 'test',
        companyId: 'comp-1',
        action: AuditAction.CREATE,
        resource: 'test',
        method: 'POST',
        path: '/test',
        status: AuditStatus.SUCCESS,
      };

      // Should not throw
      expect(() => service.log(entry)).not.toThrow();
    });
  });

  describe('query', () => {
    beforeEach(() => {
      // Add test data
      const entries = [
        {
          timestamp: new Date('2024-01-01'),
          correlationId: 'corr-1',
          companyId: 'comp-1',
          userId: 'user-1',
          action: AuditAction.CREATE,
          resource: 'invoices',
          method: 'POST',
          path: '/api/v1/invoices',
          status: AuditStatus.SUCCESS,
          statusCode: 201,
          duration: 100,
        },
        {
          timestamp: new Date('2024-01-02'),
          correlationId: 'corr-2',
          companyId: 'comp-1',
          userId: 'user-2',
          action: AuditAction.UPDATE,
          resource: 'invoices',
          method: 'PUT',
          path: '/api/v1/invoices/123',
          status: AuditStatus.SUCCESS,
          statusCode: 200,
          duration: 50,
        },
        {
          timestamp: new Date('2024-01-03'),
          correlationId: 'corr-3',
          companyId: 'comp-2',
          userId: 'user-1',
          action: AuditAction.DELETE,
          resource: 'tenants',
          method: 'DELETE',
          path: '/api/v1/tenants/456',
          status: AuditStatus.FAILURE,
          statusCode: 404,
          duration: 20,
          errorMessage: 'Not found',
        },
      ];

      entries.forEach((entry) => service.log(entry));
    });

    it('should filter by companyId', async () => {
      const results = await service.query({ companyId: 'comp-1' });

      expect(results).toHaveLength(2);
      expect(results.every((log) => log.companyId === 'comp-1')).toBe(true);
    });

    it('should filter by userId', async () => {
      const results = await service.query({ userId: 'user-1' });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((log) => log.userId === 'user-1')).toBe(true);
    });

    it('should filter by action', async () => {
      const results = await service.query({ action: AuditAction.CREATE });

      expect(results).toHaveLength(1);
      expect(results[0].action).toBe(AuditAction.CREATE);
    });

    it('should filter by resource', async () => {
      const results = await service.query({ resource: 'invoices' });

      expect(results).toHaveLength(2);
      expect(results.every((log) => log.resource === 'invoices')).toBe(true);
    });

    it('should filter by status', async () => {
      const results = await service.query({ status: AuditStatus.FAILURE });

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe(AuditStatus.FAILURE);
    });

    it('should filter by date range', async () => {
      const results = await service.query({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02'),
      });

      expect(results).toHaveLength(2);
    });

    it('should filter by duration range', async () => {
      const results = await service.query({
        minDuration: 50,
        maxDuration: 100,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((log) => (log.duration || 0) >= 50 && (log.duration || 0) <= 100)).toBe(true);
    });

    it('should sort by timestamp descending', async () => {
      const results = await service.query({});

      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          results[i + 1].timestamp.getTime(),
        );
      }
    });

    it('should apply multiple filters', async () => {
      const results = await service.query({
        companyId: 'comp-1',
        resource: 'invoices',
        action: AuditAction.CREATE,
      });

      expect(results).toHaveLength(1);
      expect(results[0].companyId).toBe('comp-1');
      expect(results[0].resource).toBe('invoices');
      expect(results[0].action).toBe(AuditAction.CREATE);
    });
  });

  describe('getCompanyLogs', () => {
    beforeEach(() => {
      for (let i = 0; i < 150; i++) {
        service.log({
          timestamp: new Date(),
          correlationId: `corr-${i}`,
          companyId: 'comp-1',
          action: AuditAction.CREATE,
          resource: 'test',
          method: 'POST',
          path: '/test',
          status: AuditStatus.SUCCESS,
        });
      }
    });

    it('should return limited number of logs', async () => {
      const logs = await service.getCompanyLogs('comp-1', 50);

      expect(logs.length).toBeLessThanOrEqual(50);
    });

    it('should respect limit parameter', async () => {
      const logs = await service.getCompanyLogs('comp-1', 20);

      expect(logs.length).toBeLessThanOrEqual(20);
    });
  });

  describe('getFailedOperations', () => {
    beforeEach(() => {
      service.log({
        timestamp: new Date(),
        correlationId: 'corr-success',
        companyId: 'comp-1',
        action: AuditAction.CREATE,
        resource: 'test',
        method: 'POST',
        path: '/test',
        status: AuditStatus.SUCCESS,
      });

      service.log({
        timestamp: new Date(),
        correlationId: 'corr-failure',
        companyId: 'comp-1',
        action: AuditAction.UPDATE,
        resource: 'test',
        method: 'PUT',
        path: '/test/123',
        status: AuditStatus.FAILURE,
        statusCode: 500,
        errorMessage: 'Server error',
      });
    });

    it('should return only failed operations', async () => {
      const failures = await service.getFailedOperations('comp-1');

      expect(failures).toHaveLength(1);
      expect(failures[0].status).toBe(AuditStatus.FAILURE);
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      service.log({
        timestamp: new Date(),
        correlationId: 'corr-1',
        companyId: 'comp-1',
        action: AuditAction.CREATE,
        resource: 'test',
        method: 'POST',
        path: '/test',
        status: AuditStatus.SUCCESS,
        duration: 100,
      });

      service.log({
        timestamp: new Date(),
        correlationId: 'corr-2',
        companyId: 'comp-1',
        action: AuditAction.UPDATE,
        resource: 'test',
        method: 'PUT',
        path: '/test/1',
        status: AuditStatus.SUCCESS,
        duration: 200,
      });

      service.log({
        timestamp: new Date(),
        correlationId: 'corr-3',
        companyId: 'comp-1',
        action: AuditAction.DELETE,
        resource: 'test',
        method: 'DELETE',
        path: '/test/1',
        status: AuditStatus.FAILURE,
        duration: 50,
        errorMessage: 'Error',
      });
    });

    it('should calculate correct statistics', async () => {
      const stats = await service.getStats('comp-1');

      expect(stats.total).toBe(3);
      expect(stats.byAction[AuditAction.CREATE]).toBe(1);
      expect(stats.byAction[AuditAction.UPDATE]).toBe(1);
      expect(stats.byAction[AuditAction.DELETE]).toBe(1);
      expect(stats.byStatus[AuditStatus.SUCCESS]).toBe(2);
      expect(stats.byStatus[AuditStatus.FAILURE]).toBe(1);
    });

    it('should calculate failure rate correctly', async () => {
      const stats = await service.getStats('comp-1');

      expect(stats.failureRate).toBeCloseTo(33.33, 1);
    });

    it('should calculate average duration correctly', async () => {
      const stats = await service.getStats('comp-1');

      expect(stats.averageDuration).toBe(Math.round((100 + 200 + 50) / 3));
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days ago

      service.log({
        timestamp: oldDate,
        correlationId: 'old-log',
        companyId: 'comp-1',
        action: AuditAction.CREATE,
        resource: 'test',
        method: 'POST',
        path: '/test',
        status: AuditStatus.SUCCESS,
      });

      service.log({
        timestamp: new Date(),
        correlationId: 'new-log',
        companyId: 'comp-1',
        action: AuditAction.CREATE,
        resource: 'test',
        method: 'POST',
        path: '/test',
        status: AuditStatus.SUCCESS,
      });
    });

    it('should remove old logs', async () => {
      const beforeCount = (service as any).auditLogs.length;

      await service.cleanup();

      const afterCount = (service as any).auditLogs.length;
      expect(afterCount).toBeLessThan(beforeCount);
    });

    it('should preserve recent logs', async () => {
      await service.cleanup();

      const logs = (service as any).auditLogs;
      const recentLog = logs.find((log: AuditLogEntry) => log.correlationId === 'new-log');

      expect(recentLog).toBeDefined();
    });
  });

  describe('count', () => {
    beforeEach(() => {
      service.log({
        timestamp: new Date(),
        correlationId: 'corr-1',
        companyId: 'comp-1',
        action: AuditAction.CREATE,
        resource: 'invoices',
        method: 'POST',
        path: '/test',
        status: AuditStatus.SUCCESS,
      });

      service.log({
        timestamp: new Date(),
        correlationId: 'corr-2',
        companyId: 'comp-1',
        action: AuditAction.CREATE,
        resource: 'tenants',
        method: 'POST',
        path: '/test',
        status: AuditStatus.SUCCESS,
      });
    });

    it('should count matching logs', async () => {
      const count = await service.count({ companyId: 'comp-1', resource: 'invoices' });

      expect(count).toBe(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty query', async () => {
      const results = await service.query({});

      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle query with no matches', async () => {
      const results = await service.query({ companyId: 'nonexistent' });

      expect(results).toHaveLength(0);
    });

    it('should handle stats with no logs', async () => {
      const stats = await service.getStats('nonexistent');

      expect(stats.total).toBe(0);
      expect(stats.failureRate).toBe(0);
      expect(stats.averageDuration).toBe(0);
    });
  });
});
