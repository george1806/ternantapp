import { Test } from '@nestjs/testing';
import { TenantMiddleware } from '../tenant.middleware';
import { TenantRequest } from '../../middleware/tenant-context';

describe('TenantMiddleware', () => {
  let middleware: TenantMiddleware;
  let mockRequest: TenantRequest;
  let mockResponse: any;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    middleware = new TenantMiddleware();
    nextFunction = jest.fn();
    mockResponse = {};
  });

  describe('Subdomain extraction', () => {
    it('should extract tenant from subdomain', () => {
      mockRequest = {
        get: jest.fn((header) => {
          if (header === 'host') return 'acme.app.com';
          return undefined;
        }),
        path: '/api/v1/invoices',
        headers: {},
      } as any;

      middleware.use(mockRequest, mockResponse, nextFunction);

      expect(mockRequest.tenantContext).toBeDefined();
      expect(mockRequest.tenantContext?.slug).toBe('acme');
      expect(mockRequest.tenantContext?.source).toBe('subdomain');
      expect(mockRequest.tenantSlug).toBe('acme');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should ignore reserved subdomains', () => {
      const reservedSubdomains = ['www', 'api', 'localhost', 'admin', 'app'];

      reservedSubdomains.forEach((reserved) => {
        mockRequest = {
          get: jest.fn((header) => {
            if (header === 'host') return `${reserved}.app.com`;
            return undefined;
          }),
          path: '/api/v1/c/test-tenant',
          headers: {},
        } as any;

        middleware.use(mockRequest, mockResponse, nextFunction);

        // Should NOT extract from reserved subdomain
        // Should fall back to path extraction if available
        if (mockRequest.tenantContext?.source === 'subdomain') {
          expect(mockRequest.tenantContext.slug).not.toBe(reserved);
        }
      });
    });

    it('should validate subdomain format (alphanumeric, hyphens, underscores)', () => {
      mockRequest = {
        get: jest.fn((header) => {
          if (header === 'host') return 'invalid@domain.app.com';
          return undefined;
        }),
        path: '/api/v1/invoices',
        headers: {},
      } as any;

      middleware.use(mockRequest, mockResponse, nextFunction);

      // Should not extract invalid subdomain
      expect(mockRequest.tenantContext?.source).not.toBe('subdomain');
    });

    it('should convert subdomain to lowercase', () => {
      mockRequest = {
        get: jest.fn((header) => {
          if (header === 'host') return 'ACME-CORP.app.com';
          return undefined;
        }),
        path: '/api/v1/invoices',
        headers: {},
      } as any;

      middleware.use(mockRequest, mockResponse, nextFunction);

      expect(mockRequest.tenantContext?.slug).toBe('acme-corp');
    });

    it('should not extract tenant from single-part host (localhost)', () => {
      mockRequest = {
        get: jest.fn((header) => {
          if (header === 'host') return 'localhost:3000';
          return undefined;
        }),
        path: '/api/v1/c/test-tenant',
        headers: {},
      } as any;

      middleware.use(mockRequest, mockResponse, nextFunction);

      // Should fallback to path extraction
      if (mockRequest.tenantContext) {
        expect(mockRequest.tenantContext.source).not.toBe('subdomain');
      }
    });
  });

  describe('Path-based extraction', () => {
    it('should extract tenant from /api/v1/c/:slug path', () => {
      mockRequest = {
        get: jest.fn(() => 'localhost:3000'),
        path: '/api/v1/c/acme-company',
        headers: {},
      } as any;

      middleware.use(mockRequest, mockResponse, nextFunction);

      expect(mockRequest.tenantContext).toBeDefined();
      expect(mockRequest.tenantContext?.slug).toBe('acme-company');
      expect(mockRequest.tenantContext?.source).toBe('path');
    });

    it('should extract tenant from /c/:slug path (without api/v1)', () => {
      mockRequest = {
        get: jest.fn(() => 'localhost:3000'),
        path: '/c/my-tenant',
        headers: {},
      } as any;

      middleware.use(mockRequest, mockResponse, nextFunction);

      expect(mockRequest.tenantContext?.slug).toBe('my-tenant');
      expect(mockRequest.tenantContext?.source).toBe('path');
    });

    it('should not extract from non-matching paths', () => {
      mockRequest = {
        get: jest.fn(() => 'localhost:3000'),
        path: '/api/v1/invoices',
        headers: {},
      } as any;

      middleware.use(mockRequest, mockResponse, nextFunction);

      expect(mockRequest.tenantContext?.source).not.toBe('path');
    });

    it('should validate path slug format', () => {
      mockRequest = {
        get: jest.fn(() => 'localhost:3000'),
        path: '/api/v1/c/invalid@slug',
        headers: {},
      } as any;

      middleware.use(mockRequest, mockResponse, nextFunction);

      expect(mockRequest.tenantContext).not.toBeDefined();
    });

    it('should enforce minimum slug length (3 characters)', () => {
      mockRequest = {
        get: jest.fn(() => 'localhost:3000'),
        path: '/api/v1/c/ab', // Only 2 chars
        headers: {},
      } as any;

      middleware.use(mockRequest, mockResponse, nextFunction);

      expect(mockRequest.tenantContext).not.toBeDefined();
    });

    it('should enforce maximum slug length (50 characters)', () => {
      const longSlug = 'a'.repeat(51);
      mockRequest = {
        get: jest.fn(() => 'localhost:3000'),
        path: `/api/v1/c/${longSlug}`,
        headers: {},
      } as any;

      middleware.use(mockRequest, mockResponse, nextFunction);

      expect(mockRequest.tenantContext).not.toBeDefined();
    });

    it('should convert path slug to lowercase', () => {
      mockRequest = {
        get: jest.fn(() => 'localhost:3000'),
        path: '/api/v1/c/MY-TENANT',
        headers: {},
      } as any;

      middleware.use(mockRequest, mockResponse, nextFunction);

      expect(mockRequest.tenantContext?.slug).toBe('my-tenant');
    });
  });

  describe('Header extraction', () => {
    it('should extract tenant from X-Tenant-Slug header', () => {
      mockRequest = {
        get: jest.fn((header) => {
          if (header === 'x-tenant-slug') return 'acme-via-header';
          if (header === 'host') return 'localhost:3000';
          return undefined;
        }),
        path: '/api/v1/invoices',
        headers: { 'x-tenant-slug': 'acme-via-header' },
      } as any;

      middleware.use(mockRequest, mockResponse, nextFunction);

      expect(mockRequest.tenantContext).toBeDefined();
      expect(mockRequest.tenantContext?.slug).toBe('acme-via-header');
      expect(mockRequest.tenantContext?.source).toBe('header');
    });

    it('should convert header tenant slug to lowercase', () => {
      mockRequest = {
        get: jest.fn((header) => {
          if (header === 'x-tenant-slug') return 'ACME-COMPANY';
          if (header === 'host') return 'localhost:3000';
          return undefined;
        }),
        path: '/api/v1/invoices',
        headers: { 'x-tenant-slug': 'ACME-COMPANY' },
      } as any;

      middleware.use(mockRequest, mockResponse, nextFunction);

      expect(mockRequest.tenantContext?.slug).toBe('acme-company');
    });

    it('should validate header tenant slug format', () => {
      mockRequest = {
        get: jest.fn((header) => {
          if (header === 'x-tenant-slug') return 'invalid@slug';
          if (header === 'host') return 'localhost:3000';
          return undefined;
        }),
        path: '/api/v1/invoices',
        headers: { 'x-tenant-slug': 'invalid@slug' },
      } as any;

      middleware.use(mockRequest, mockResponse, nextFunction);

      expect(mockRequest.tenantContext).not.toBeDefined();
    });
  });

  describe('Priority/Strategy ordering', () => {
    it('should prioritize header over subdomain and path', () => {
      mockRequest = {
        get: jest.fn((header) => {
          if (header === 'x-tenant-slug') return 'from-header';
          if (header === 'host') return 'from-subdomain.app.com';
          return undefined;
        }),
        path: '/api/v1/c/from-path',
        headers: { 'x-tenant-slug': 'from-header' },
      } as any;

      middleware.use(mockRequest, mockResponse, nextFunction);

      expect(mockRequest.tenantContext?.slug).toBe('from-header');
      expect(mockRequest.tenantContext?.source).toBe('header');
    });

    it('should use subdomain if header not present', () => {
      mockRequest = {
        get: jest.fn((header) => {
          if (header === 'host') return 'from-subdomain.app.com';
          return undefined;
        }),
        path: '/api/v1/c/from-path',
        headers: {},
      } as any;

      middleware.use(mockRequest, mockResponse, nextFunction);

      expect(mockRequest.tenantContext?.slug).toBe('from-subdomain');
      expect(mockRequest.tenantContext?.source).toBe('subdomain');
    });

    it('should use path if header and subdomain not present', () => {
      mockRequest = {
        get: jest.fn(() => 'localhost:3000'),
        path: '/api/v1/c/from-path',
        headers: {},
      } as any;

      middleware.use(mockRequest, mockResponse, nextFunction);

      expect(mockRequest.tenantContext?.slug).toBe('from-path');
      expect(mockRequest.tenantContext?.source).toBe('path');
    });
  });

  describe('No tenant context', () => {
    it('should not set tenant context if no tenant identifier found', () => {
      mockRequest = {
        get: jest.fn(() => 'localhost:3000'),
        path: '/health',
        headers: {},
      } as any;

      middleware.use(mockRequest, mockResponse, nextFunction);

      expect(mockRequest.tenantContext).not.toBeDefined();
      expect(mockRequest.tenantSlug).not.toBeDefined();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should still call next() even if no tenant found', () => {
      mockRequest = {
        get: jest.fn(() => 'localhost:3000'),
        path: '/public/health',
        headers: {},
      } as any;

      middleware.use(mockRequest, mockResponse, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('Timestamp tracking', () => {
    it('should include timestamp in tenant context', () => {
      const beforeTime = Date.now();
      mockRequest = {
        get: jest.fn((header) => {
          if (header === 'host') return 'acme.app.com';
          return undefined;
        }),
        path: '/api/v1/invoices',
        headers: {},
      } as any;

      middleware.use(mockRequest, mockResponse, nextFunction);

      expect(mockRequest.tenantContext?.timestamp).toBeDefined();
      expect(mockRequest.tenantContext?.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(mockRequest.tenantContext?.timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Backwards compatibility', () => {
    it('should set both tenantContext and tenantSlug', () => {
      mockRequest = {
        get: jest.fn((header) => {
          if (header === 'host') return 'acme.app.com';
          return undefined;
        }),
        path: '/api/v1/invoices',
        headers: {},
      } as any;

      middleware.use(mockRequest, mockResponse, nextFunction);

      expect(mockRequest.tenantContext).toBeDefined();
      expect(mockRequest.tenantSlug).toBeDefined();
      expect(mockRequest.tenantSlug).toBe(mockRequest.tenantContext?.slug);
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined host header gracefully', () => {
      mockRequest = {
        get: jest.fn(() => undefined),
        path: '/api/v1/c/acme',
        headers: {},
      } as any;

      middleware.use(mockRequest, mockResponse, nextFunction);

      // Should extract from path
      expect(mockRequest.tenantContext?.slug).toBe('acme');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle empty path gracefully', () => {
      mockRequest = {
        get: jest.fn(() => 'localhost:3000'),
        path: '',
        headers: {},
      } as any;

      middleware.use(mockRequest, mockResponse, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle special characters in path gracefully', () => {
      mockRequest = {
        get: jest.fn(() => 'localhost:3000'),
        path: '/api/v1/c/../../admin',
        headers: {},
      } as any;

      middleware.use(mockRequest, mockResponse, nextFunction);

      // Should not extract (invalid path traversal)
      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
