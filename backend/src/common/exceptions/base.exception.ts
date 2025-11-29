import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Error Code Enumeration
 * Standardized error codes for API responses and frontend error handling
 */
export enum ErrorCode {
  // Validation Errors (4001-4099)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_ENUM_VALUE = 'INVALID_ENUM_VALUE',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Authentication Errors (4011-4099)
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE',

  // Tenant/Company Errors (4021-4099)
  INVALID_TENANT = 'INVALID_TENANT',
  UNAUTHORIZED_TENANT_ACCESS = 'UNAUTHORIZED_TENANT_ACCESS',
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
  TENANT_ALREADY_EXISTS = 'TENANT_ALREADY_EXISTS',

  // Resource Not Found (4041-4099)
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  INVOICE_NOT_FOUND = 'INVOICE_NOT_FOUND',
  OCCUPANCY_NOT_FOUND = 'OCCUPANCY_NOT_FOUND',
  TENANT_NOT_FOUND_RESOURCE = 'TENANT_NOT_FOUND_RESOURCE',
  APARTMENT_NOT_FOUND = 'APARTMENT_NOT_FOUND',
  COMPOUND_NOT_FOUND = 'COMPOUND_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  COMPANY_NOT_FOUND = 'COMPANY_NOT_FOUND',

  // Conflict/Duplicate Errors (4091-4099)
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  DUPLICATE_EMAIL = 'DUPLICATE_EMAIL',
  DUPLICATE_INVOICE_NUMBER = 'DUPLICATE_INVOICE_NUMBER',
  DUPLICATE_SLUG = 'DUPLICATE_SLUG',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',

  // Business Rule Violations (4221-4299)
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  PAYMENT_EXCEEDS_TOTAL = 'PAYMENT_EXCEEDS_TOTAL',
  CANNOT_UPDATE_PAID_INVOICE = 'CANNOT_UPDATE_PAID_INVOICE',
  CANNOT_DELETE_PAID_INVOICE = 'CANNOT_DELETE_PAID_INVOICE',
  INVALID_LEASE_DATES = 'INVALID_LEASE_DATES',
  OCCUPANCY_CONFLICT = 'OCCUPANCY_CONFLICT',
  INSUFFICIENT_DEPOSIT = 'INSUFFICIENT_DEPOSIT',
  CANNOT_CANCEL_PAYMENT = 'CANNOT_CANCEL_PAYMENT',

  // External Service Errors (5021-5099)
  EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED',
  PDF_GENERATION_FAILED = 'PDF_GENERATION_FAILED',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  PAYMENT_GATEWAY_ERROR = 'PAYMENT_GATEWAY_ERROR',

  // Internal Server Errors (5001-5020)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  QUEUE_ERROR = 'QUEUE_ERROR',
}

/**
 * Base Application Exception
 * All custom exceptions should extend this class
 */
export abstract class AppException extends HttpException {
  readonly errorCode: ErrorCode;
  readonly details?: Record<string, any>;
  readonly timestamp: Date;
  readonly traceId?: string;

  constructor(
    message: string,
    statusCode: HttpStatus,
    errorCode: ErrorCode,
    details?: Record<string, any>,
    traceId?: string,
  ) {
    super(message, statusCode);
    this.errorCode = errorCode;
    this.details = details;
    this.timestamp = new Date();
    this.traceId = traceId;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert exception to API response format
   */
  toJSON() {
    return {
      error: {
        code: this.errorCode,
        message: this.message,
        statusCode: this.getStatus(),
        timestamp: this.timestamp,
        ...(this.details && { details: this.details }),
        ...(this.traceId && { traceId: this.traceId }),
      },
    };
  }
}
