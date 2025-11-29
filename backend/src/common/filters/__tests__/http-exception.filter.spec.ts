import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, BadRequestException, NotFoundException } from '@nestjs/common';
import { HttpExceptionFilter } from '../http-exception.filter';
import {
  InvalidCredentialsException,
  InvalidTenantException,
  PaymentExceedsTotalException,
} from '../../exceptions';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockExecutionContext: any;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    // Mock response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Mock request
    mockRequest = {
      method: 'GET',
      path: '/api/v1/invoices',
      headers: {
        'user-agent': 'test-agent',
      },
      get: jest.fn((header) => {
        if (header === 'user-agent') return 'test-agent';
        return undefined;
      }),
      ip: '127.0.0.1',
    };

    // Mock execution context
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    };
  });

  describe('catch - Custom AppException', () => {
    it('should format InvalidCredentialsException correctly', () => {
      const exception = new InvalidCredentialsException('Invalid email or password');

      filter.catch(exception, mockExecutionContext);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalled();

      const response = mockResponse.json.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INVALID_CREDENTIALS');
      expect(response.error.message).toBe('Invalid email or password');
      expect(response.error.statusCode).toBe(401);
      expect(response.error.correlationId).toBeDefined();
    });

    it('should include details in error response when provided', () => {
      const details = { attemptCount: 3 };
      const exception = new InvalidCredentialsException('Too many attempts', details);

      filter.catch(exception, mockExecutionContext);

      const response = mockResponse.json.mock.calls[0][0];
      expect(response.error.details).toEqual(details);
    });

    it('should format PaymentExceedsTotalException with financial details', () => {
      const exception = new PaymentExceedsTotalException(1500, 1000);

      filter.catch(exception, mockExecutionContext);

      const response = mockResponse.json.mock.calls[0][0];
      expect(response.error.code).toBe('PAYMENT_EXCEEDS_TOTAL');
      expect(response.error.details.paymentAmount).toBe(1500);
      expect(response.error.details.invoiceTotal).toBe(1000);
      expect(response.error.details.difference).toBe(500);
    });

    it('should format InvalidTenantException correctly', () => {
      const exception = new InvalidTenantException(
        'Company context is missing',
        { userId: 'user-123' },
      );

      filter.catch(exception, mockExecutionContext);

      const response = mockResponse.json.mock.calls[0][0];
      expect(response.error.code).toBe('INVALID_TENANT');
      expect(response.error.statusCode).toBe(400);
      expect(response.error.details.userId).toBe('user-123');
    });
  });

  describe('catch - Standard NestJS Exceptions', () => {
    it('should handle NotFoundException', () => {
      const exception = new NotFoundException('Invoice not found');

      filter.catch(exception, mockExecutionContext);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);

      const response = mockResponse.json.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('RESOURCE_NOT_FOUND');
      expect(response.error.statusCode).toBe(404);
    });

    it('should handle BadRequestException', () => {
      const exception = new BadRequestException('Invalid input');

      filter.catch(exception, mockExecutionContext);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);

      const response = mockResponse.json.mock.calls[0][0];
      expect(response.error.code).toBe('VALIDATION_ERROR');
      expect(response.error.statusCode).toBe(400);
    });
  });

  describe('catch - Validation Errors', () => {
    it('should format class-validator validation errors', () => {
      const validationErrors = [
        {
          property: 'email',
          constraints: {
            isEmail: 'email must be an email',
            isDefined: 'email should not be empty',
          },
          value: 'invalid-email',
        },
        {
          property: 'password',
          constraints: {
            minLength: 'password must be at least 8 characters',
          },
          value: '123',
        },
      ];

      const exception = new BadRequestException(validationErrors);

      filter.catch(exception, mockExecutionContext);

      const response = mockResponse.json.mock.calls[0][0];
      expect(response.error.code).toBe('VALIDATION_ERROR');
      expect(response.error.message).toBe('Validation failed');
      expect(response.error.details.validationErrors).toBeDefined();
      expect(response.error.details.errorCount).toBe(2);

      const errors = response.error.details.validationErrors;
      expect(errors[0].field).toBe('email');
      expect(errors[0].message).toContain('email must be an email');
      expect(errors[1].field).toBe('password');
    });

    it('should handle nested validation errors', () => {
      const nestedError = {
        property: 'company',
        constraints: null,
        children: [
          {
            property: 'email',
            constraints: {
              isEmail: 'email must be an email',
            },
            value: 'invalid',
          },
        ],
      };

      const exception = new BadRequestException([nestedError]);

      filter.catch(exception, mockExecutionContext);

      const response = mockResponse.json.mock.calls[0][0];
      const errors = response.error.details.validationErrors;
      expect(errors[0].nestedErrors).toBeDefined();
      expect(errors[0].nestedErrors[0].field).toBe('email');
    });
  });

  describe('catch - Correlation ID handling', () => {
    it('should use x-correlation-id from request header if present', () => {
      const correlationId = 'test-correlation-123';
      mockRequest.headers['x-correlation-id'] = correlationId;

      const exception = new NotFoundException('Not found');
      filter.catch(exception, mockExecutionContext);

      const response = mockResponse.json.mock.calls[0][0];
      expect(response.error.correlationId).toBe(correlationId);
    });

    it('should use x-request-id as fallback correlation ID', () => {
      const requestId = 'test-request-456';
      mockRequest.headers['x-request-id'] = requestId;

      const exception = new NotFoundException('Not found');
      filter.catch(exception, mockExecutionContext);

      const response = mockResponse.json.mock.calls[0][0];
      expect(response.error.correlationId).toBe(requestId);
    });

    it('should generate correlation ID if none provided in headers', () => {
      const exception = new NotFoundException('Not found');
      filter.catch(exception, mockExecutionContext);

      const response = mockResponse.json.mock.calls[0][0];
      expect(response.error.correlationId).toBeDefined();
      expect(response.error.correlationId).toMatch(/^req-\d+-[a-z0-9]+$/);
    });
  });

  describe('catch - Status code mapping', () => {
    it('should map 400 to VALIDATION_ERROR', () => {
      const exception = new BadRequestException('Bad request');
      filter.catch(exception, mockExecutionContext);

      const response = mockResponse.json.mock.calls[0][0];
      expect(response.error.code).toBe('VALIDATION_ERROR');
    });

    it('should map 404 to RESOURCE_NOT_FOUND', () => {
      const exception = new NotFoundException('Not found');
      filter.catch(exception, mockExecutionContext);

      const response = mockResponse.json.mock.calls[0][0];
      expect(response.error.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('should map 500 to INTERNAL_SERVER_ERROR', () => {
      const exception = new BadRequestException('Server error');
      Object.defineProperty(exception, 'getStatus', {
        value: () => 500,
      });

      filter.catch(exception, mockExecutionContext);

      const response = mockResponse.json.mock.calls[0][0];
      expect(response.error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('catch - Response format', () => {
    it('should include timestamp in ISO format', () => {
      const exception = new NotFoundException('Not found');
      const beforeTime = new Date();

      filter.catch(exception, mockExecutionContext);

      const response = mockResponse.json.mock.calls[0][0];
      const timestamp = new Date(response.error.timestamp);

      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime() - 100);
      expect(timestamp.getTime()).toBeLessThanOrEqual(new Date().getTime());
    });

    it('should always include success: false for errors', () => {
      const exception = new NotFoundException('Not found');
      filter.catch(exception, mockExecutionContext);

      const response = mockResponse.json.mock.calls[0][0];
      expect(response.success).toBe(false);
    });

    it('should have proper error structure', () => {
      const exception = new BadRequestException('Invalid input');
      filter.catch(exception, mockExecutionContext);

      const response = mockResponse.json.mock.calls[0][0];
      expect(response.error).toHaveProperty('code');
      expect(response.error).toHaveProperty('message');
      expect(response.error).toHaveProperty('statusCode');
      expect(response.error).toHaveProperty('timestamp');
      expect(response.error).toHaveProperty('correlationId');
    });
  });
});
