import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AuditLogInterceptor } from '../audit-log.interceptor';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { ConfigService } from '@nestjs/config';

describe('AuditLogInterceptor', () => {
  let interceptor: AuditLogInterceptor;
  let auditLogService: jest.Mocked<AuditLogService>;
  let mockContext: jest.Mocked<ExecutionContext>;
  let mockRequest: any;
  let mockResponse: any;
  let mockHandler: jest.Mocked<CallHandler>;

  beforeEach(async () => {
    // Mock AuditLogService
    auditLogService = {
      log: jest.fn(),
    } as any;

    // Mock ConfigService
    const configService = {
      get: jest.fn(() => 90),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogInterceptor,
        {
          provide: AuditLogService,
          useValue: auditLogService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    interceptor = module.get<AuditLogInterceptor>(AuditLogInterceptor);

    // Setup mock request
    mockRequest = {
      method: 'GET',
      path: '/api/v1/invoices',
      url: '/api/v1/invoices',
      headers: {
        'x-correlation-id': 'test-corr-id',
        'user-agent': 'test-agent',
      },
      get: jest.fn((header) => {
        if (header === 'user-agent') return 'test-agent';
        if (header === 'x-correlation-id') return 'test-corr-id';
        return undefined;
      }),
      ip: '127.0.0.1',
      socket: {
        remoteAddress: '127.0.0.1',
      },
      user: {
        sub: 'user-123',
        email: 'test@example.com',
        companyId: 'comp-1',
      },
    };

    // Setup mock response
    mockResponse = {
      statusCode: 200,
    };

    // Setup mock context
    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as any;

    // Setup mock handler
    mockHandler = {
      handle: jest.fn(),
    } as any;
  });

  describe('intercept - successful request', () => {
    it('should log successful GET request', (done) => {
      mockHandler.handle.mockReturnValue(of({ data: 'test' }));

      interceptor.intercept(mockContext, mockHandler).subscribe(() => {
        expect(auditLogService.log).toHaveBeenCalled();
        const logCall = auditLogService.log.mock.calls[0][0];
        expect(logCall.path).toBe('/api/v1/invoices');
        expect(logCall.statusCode).toBe(200);
        done();
      });
    });

    it('should measure request duration', (done) => {
      mockHandler.handle.mockReturnValue(of({}));

      interceptor.intercept(mockContext, mockHandler).subscribe(() => {
        const logCall = auditLogService.log.mock.calls[0][0];
        expect(logCall.duration).toBeDefined();
        expect(logCall.duration).toBeGreaterThanOrEqual(0);
        done();
      });
    });

    it('should extract correlation ID from header', (done) => {
      mockHandler.handle.mockReturnValue(of({}));

      interceptor.intercept(mockContext, mockHandler).subscribe(() => {
        const logCall = auditLogService.log.mock.calls[0][0];
        expect(logCall.correlationId).toBe('test-corr-id');
        done();
      });
    });

    it('should extract user information', (done) => {
      mockHandler.handle.mockReturnValue(of({}));

      interceptor.intercept(mockContext, mockHandler).subscribe(() => {
        const logCall = auditLogService.log.mock.calls[0][0];
        expect(logCall.userId).toBe('user-123');
        expect(logCall.userEmail).toBe('test@example.com');
        expect(logCall.companyId).toBe('comp-1');
        done();
      });
    });

    it('should map HTTP method to audit action', (done) => {
      mockRequest.method = 'POST';
      mockHandler.handle.mockReturnValue(of({}));

      interceptor.intercept(mockContext, mockHandler).subscribe(() => {
        const logCall = auditLogService.log.mock.calls[0][0];
        expect(logCall.action).toBeDefined();
        done();
      });
    });
  });

  describe('intercept - failed request', () => {
    it('should log failed request with error message', (done) => {
      const error = new Error('Test error');
      mockHandler.handle.mockReturnValue(throwError(() => error));

      interceptor.intercept(mockContext, mockHandler).subscribe({
        error: () => {
          expect(auditLogService.log).toHaveBeenCalled();
          const logCall = auditLogService.log.mock.calls[0][0];
          expect(logCall.errorMessage).toBe('Test error');
          done();
        },
      });
    });

    it('should capture error status code', (done) => {
      const error = new Error('Not found');
      error['status'] = 404;
      mockHandler.handle.mockReturnValue(throwError(() => error));

      interceptor.intercept(mockContext, mockHandler).subscribe({
        error: () => {
          const logCall = auditLogService.log.mock.calls[0][0];
          expect(logCall.statusCode).toBe(404);
          done();
        },
      });
    });

    it('should default to 500 if no status provided', (done) => {
      const error = new Error('Unknown error');
      mockHandler.handle.mockReturnValue(throwError(() => error));

      interceptor.intercept(mockContext, mockHandler).subscribe({
        error: () => {
          const logCall = auditLogService.log.mock.calls[0][0];
          expect(logCall.statusCode).toBe(500);
          done();
        },
      });
    });
  });

  describe('intercept - skip audit for certain paths', () => {
    it('should skip health check endpoints', () => {
      mockRequest.path = '/health';

      interceptor.intercept(mockContext, mockHandler);

      expect(mockHandler.handle).toHaveBeenCalled();
    });

    it('should skip metrics endpoints', () => {
      mockRequest.path = '/metrics';

      interceptor.intercept(mockContext, mockHandler);

      expect(mockHandler.handle).toHaveBeenCalled();
    });

    it('should skip API docs endpoints', () => {
      mockRequest.path = '/api/docs';

      interceptor.intercept(mockContext, mockHandler);

      expect(mockHandler.handle).toHaveBeenCalled();
    });
  });

  describe('intercept - without user context', () => {
    it('should handle requests without authentication', (done) => {
      mockRequest.user = undefined;
      mockHandler.handle.mockReturnValue(of({}));

      interceptor.intercept(mockContext, mockHandler).subscribe(() => {
        expect(auditLogService.log).toHaveBeenCalled();
        const logCall = auditLogService.log.mock.calls[0][0];
        expect(logCall.userId).toBeUndefined();
        done();
      });
    });

    it('should fallback to tenant context', (done) => {
      mockRequest.user = undefined;
      (mockRequest as any).tenantContext = { slug: 'tenant-123' };
      mockHandler.handle.mockReturnValue(of({}));

      interceptor.intercept(mockContext, mockHandler).subscribe(() => {
        const logCall = auditLogService.log.mock.calls[0][0];
        expect(logCall.companyId).toBe('tenant-123');
        done();
      });
    });
  });

  describe('intercept - IP address extraction', () => {
    it('should extract IP from request.ip', (done) => {
      mockRequest.ip = '192.168.1.1';
      mockHandler.handle.mockReturnValue(of({}));

      interceptor.intercept(mockContext, mockHandler).subscribe(() => {
        const logCall = auditLogService.log.mock.calls[0][0];
        expect(logCall.ipAddress).toBe('192.168.1.1');
        done();
      });
    });

    it('should fallback to socket.remoteAddress', (done) => {
      mockRequest.ip = undefined;
      mockRequest.socket.remoteAddress = '10.0.0.1';
      mockHandler.handle.mockReturnValue(of({}));

      interceptor.intercept(mockContext, mockHandler).subscribe(() => {
        const logCall = auditLogService.log.mock.calls[0][0];
        expect(logCall.ipAddress).toBe('10.0.0.1');
        done();
      });
    });
  });

  describe('intercept - correlation ID generation', () => {
    it('should generate correlation ID if not provided', (done) => {
      mockRequest.headers = {}; // No correlation ID
      mockHandler.handle.mockReturnValue(of({}));

      interceptor.intercept(mockContext, mockHandler).subscribe(() => {
        const logCall = auditLogService.log.mock.calls[0][0];
        expect(logCall.correlationId).toBeDefined();
        expect(logCall.correlationId).toMatch(/^req-\d+-[a-z0-9]+$/);
        done();
      });
    });

    it('should prefer x-correlation-id over x-request-id', (done) => {
      mockRequest.headers = {
        'x-correlation-id': 'corr-id',
        'x-request-id': 'req-id',
      };
      mockHandler.handle.mockReturnValue(of({}));

      interceptor.intercept(mockContext, mockHandler).subscribe(() => {
        const logCall = auditLogService.log.mock.calls[0][0];
        expect(logCall.correlationId).toBe('corr-id');
        done();
      });
    });
  });
});
