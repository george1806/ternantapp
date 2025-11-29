import { HttpStatus } from '@nestjs/common';
import { AppException, ErrorCode } from './base.exception';

/**
 * Tenant/Company Related Exceptions
 */
export class InvalidTenantException extends AppException {
  constructor(message = 'Invalid tenant context', details?: Record<string, any>, traceId?: string) {
    super(message, HttpStatus.BAD_REQUEST, ErrorCode.INVALID_TENANT, details, traceId);
  }
}

export class UnauthorizedTenantAccessException extends AppException {
  constructor(
    message = 'Access denied for this tenant',
    details?: Record<string, any>,
    traceId?: string,
  ) {
    super(
      message,
      HttpStatus.FORBIDDEN,
      ErrorCode.UNAUTHORIZED_TENANT_ACCESS,
      details,
      traceId,
    );
  }
}

export class TenantNotFoundException extends AppException {
  constructor(
    tenantId: string,
    details?: Record<string, any>,
    traceId?: string,
  ) {
    super(
      `Tenant with ID "${tenantId}" not found`,
      HttpStatus.NOT_FOUND,
      ErrorCode.TENANT_NOT_FOUND,
      { tenantId, ...details },
      traceId,
    );
  }
}

export class TenantAlreadyExistsException extends AppException {
  constructor(identifier: string, details?: Record<string, any>, traceId?: string) {
    super(
      `Tenant with identifier "${identifier}" already exists`,
      HttpStatus.CONFLICT,
      ErrorCode.TENANT_ALREADY_EXISTS,
      { identifier, ...details },
      traceId,
    );
  }
}
