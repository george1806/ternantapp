import { HttpStatus } from '@nestjs/common';
import { AppException, ErrorCode } from './base.exception';

/**
 * Business Rule Violation Exceptions
 * Thrown when domain logic constraints are violated
 */
export class InvalidStateTransitionException extends AppException {
  constructor(
    currentState: string,
    attemptedState: string,
    details?: Record<string, any>,
    traceId?: string,
  ) {
    super(
      `Invalid state transition from "${currentState}" to "${attemptedState}"`,
      HttpStatus.BAD_REQUEST,
      ErrorCode.INVALID_STATE_TRANSITION,
      { currentState, attemptedState, ...details },
      traceId,
    );
  }
}

export class InvalidDateRangeException extends AppException {
  constructor(
    startDate: Date,
    endDate: Date,
    details?: Record<string, any>,
    traceId?: string,
  ) {
    super(
      `Invalid date range: start date must be before end date`,
      HttpStatus.BAD_REQUEST,
      ErrorCode.INVALID_DATE_RANGE,
      { startDate, endDate, ...details },
      traceId,
    );
  }
}

export class PaymentExceedsTotalException extends AppException {
  constructor(
    paymentAmount: number,
    invoiceTotal: number,
    details?: Record<string, any>,
    traceId?: string,
  ) {
    super(
      `Payment amount exceeds invoice total`,
      HttpStatus.BAD_REQUEST,
      ErrorCode.PAYMENT_EXCEEDS_TOTAL,
      { paymentAmount, invoiceTotal, difference: paymentAmount - invoiceTotal, ...details },
      traceId,
    );
  }
}

export class CannotUpdatePaidInvoiceException extends AppException {
  constructor(invoiceId: string, details?: Record<string, any>, traceId?: string) {
    super(
      `Cannot update paid invoice`,
      HttpStatus.BAD_REQUEST,
      ErrorCode.CANNOT_UPDATE_PAID_INVOICE,
      { invoiceId, ...details },
      traceId,
    );
  }
}

export class CannotDeletePaidInvoiceException extends AppException {
  constructor(invoiceId: string, details?: Record<string, any>, traceId?: string) {
    super(
      `Cannot delete paid invoice`,
      HttpStatus.BAD_REQUEST,
      ErrorCode.CANNOT_DELETE_PAID_INVOICE,
      { invoiceId, ...details },
      traceId,
    );
  }
}

export class InvalidLeaseDatesException extends AppException {
  constructor(
    startDate: Date,
    endDate: Date,
    details?: Record<string, any>,
    traceId?: string,
  ) {
    super(
      `Lease end date must be after start date`,
      HttpStatus.BAD_REQUEST,
      ErrorCode.INVALID_LEASE_DATES,
      { startDate, endDate, ...details },
      traceId,
    );
  }
}

export class OccupancyConflictException extends AppException {
  constructor(
    apartmentId: string,
    conflictingStartDate: Date,
    conflictingEndDate: Date,
    details?: Record<string, any>,
    traceId?: string,
  ) {
    super(
      `Occupancy conflict: apartment already occupied during this period`,
      HttpStatus.CONFLICT,
      ErrorCode.OCCUPANCY_CONFLICT,
      { apartmentId, conflictingStartDate, conflictingEndDate, ...details },
      traceId,
    );
  }
}

export class InsufficientDepositException extends AppException {
  constructor(
    requiredAmount: number,
    providedAmount: number,
    details?: Record<string, any>,
    traceId?: string,
  ) {
    super(
      `Insufficient deposit provided`,
      HttpStatus.BAD_REQUEST,
      ErrorCode.INSUFFICIENT_DEPOSIT,
      { requiredAmount, providedAmount, shortage: requiredAmount - providedAmount, ...details },
      traceId,
    );
  }
}

export class CannotCancelPaymentException extends AppException {
  constructor(
    paymentId: string,
    reason: string,
    details?: Record<string, any>,
    traceId?: string,
  ) {
    super(
      `Cannot cancel payment: ${reason}`,
      HttpStatus.BAD_REQUEST,
      ErrorCode.CANNOT_CANCEL_PAYMENT,
      { paymentId, reason, ...details },
      traceId,
    );
  }
}

/**
 * Resource Not Found Exception (Generic)
 */
export class ResourceNotFoundException extends AppException {
  constructor(
    resourceType: string,
    resourceId: string,
    details?: Record<string, any>,
    traceId?: string,
  ) {
    super(
      `${resourceType} with ID "${resourceId}" not found`,
      HttpStatus.NOT_FOUND,
      ErrorCode.RESOURCE_NOT_FOUND,
      { resourceType, resourceId, ...details },
      traceId,
    );
  }
}

/**
 * Duplicate Resource Exception (Generic)
 */
export class DuplicateResourceException extends AppException {
  constructor(
    resourceType: string,
    identifier: string,
    details?: Record<string, any>,
    traceId?: string,
  ) {
    super(
      `${resourceType} with "${identifier}" already exists`,
      HttpStatus.CONFLICT,
      ErrorCode.DUPLICATE_RESOURCE,
      { resourceType, identifier, ...details },
      traceId,
    );
  }
}
