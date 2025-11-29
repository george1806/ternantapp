import { HttpStatus } from '@nestjs/common';
import { AppException, ErrorCode } from './base.exception';

/**
 * Authentication & Authorization Related Exceptions
 */
export class InvalidCredentialsException extends AppException {
  constructor(message = 'Invalid email or password', details?: Record<string, any>, traceId?: string) {
    super(message, HttpStatus.UNAUTHORIZED, ErrorCode.INVALID_CREDENTIALS, details, traceId);
  }
}

export class TokenExpiredException extends AppException {
  constructor(message = 'Token has expired', details?: Record<string, any>, traceId?: string) {
    super(message, HttpStatus.UNAUTHORIZED, ErrorCode.TOKEN_EXPIRED, details, traceId);
  }
}

export class InvalidTokenException extends AppException {
  constructor(message = 'Invalid or malformed token', details?: Record<string, any>, traceId?: string) {
    super(message, HttpStatus.UNAUTHORIZED, ErrorCode.INVALID_TOKEN, details, traceId);
  }
}

export class InsufficientPermissionsException extends AppException {
  constructor(
    message = 'Insufficient permissions to perform this action',
    details?: Record<string, any>,
    traceId?: string,
  ) {
    super(
      message,
      HttpStatus.FORBIDDEN,
      ErrorCode.INSUFFICIENT_PERMISSIONS,
      details,
      traceId,
    );
  }
}

export class AccountInactiveException extends AppException {
  constructor(message = 'Account is inactive', details?: Record<string, any>, traceId?: string) {
    super(message, HttpStatus.FORBIDDEN, ErrorCode.ACCOUNT_INACTIVE, details, traceId);
  }
}
