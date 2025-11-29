import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
  ValidationError,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppException, ErrorCode } from '../exceptions/base.exception';

/**
 * Global HTTP Exception Filter
 * Handles all HTTP exceptions and formats them into a consistent API response
 *
 * Features:
 * - Catches both custom AppExceptions and NestJS HttpExceptions
 * - Formats validation errors properly
 * - Includes request correlation ID for tracing
 * - Logs errors with appropriate severity
 * - Sanitizes error messages for security
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const correlationId = this.getCorrelationId(request);

    // Get the exception response
    const exceptionResponse = exception.getResponse();
    const errorResponse = this.formatErrorResponse(
      exception,
      exceptionResponse,
      status,
      correlationId,
    );

    // Log the error
    this.logError(exception, request, status, correlationId);

    // Send response
    response.status(status).json(errorResponse);
  }

  /**
   * Format error response into consistent API structure
   */
  private formatErrorResponse(
    exception: HttpException,
    exceptionResponse: any,
    status: number,
    correlationId: string,
  ): Record<string, any> {
    // If it's a custom AppException
    if (exception instanceof AppException) {
      return {
        success: false,
        error: {
          code: exception.errorCode,
          message: exception.message,
          statusCode: status,
          timestamp: new Date().toISOString(),
          correlationId,
          ...(exception.details && { details: exception.details }),
        },
      };
    }

    // Handle validation errors (from class-validator)
    if (typeof exceptionResponse === 'object' && 'message' in exceptionResponse) {
      const message = exceptionResponse.message;

      // Check if it's a validation error array
      if (Array.isArray(message) && message.length > 0) {
        const validationErrors = this.formatValidationErrors(message);
        return {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Validation failed',
            statusCode: status,
            timestamp: new Date().toISOString(),
            correlationId,
            details: {
              validationErrors,
              errorCount: validationErrors.length,
            },
          },
        };
      }

      // Regular BadRequestException or similar
      return {
        success: false,
        error: {
          code: this.getErrorCodeFromStatus(status),
          message: message || exceptionResponse.error || 'An error occurred',
          statusCode: status,
          timestamp: new Date().toISOString(),
          correlationId,
        },
      };
    }

    // Fallback for unknown exceptions
    return {
      success: false,
      error: {
        code: this.getErrorCodeFromStatus(status),
        message:
          typeof exceptionResponse === 'string' ? exceptionResponse : 'An error occurred',
        statusCode: status,
        timestamp: new Date().toISOString(),
        correlationId,
      },
    };
  }

  /**
   * Format class-validator validation errors
   */
  private formatValidationErrors(errors: any[]): Record<string, any>[] {
    return errors.map((error) => {
      const constraints = error.constraints
        ? Object.values(error.constraints).join(', ')
        : 'Validation failed';

      return {
        field: error.property,
        message: constraints,
        rejectedValue: error.value,
        ...(error.children?.length > 0 && {
          nestedErrors: this.formatValidationErrors(error.children),
        }),
      };
    });
  }

  /**
   * Map HTTP status to error code
   */
  private getErrorCodeFromStatus(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.INVALID_CREDENTIALS;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.INSUFFICIENT_PERMISSIONS;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.RESOURCE_NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.DUPLICATE_RESOURCE;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return ErrorCode.INTERNAL_SERVER_ERROR;
      default:
        return ErrorCode.INTERNAL_SERVER_ERROR;
    }
  }

  /**
   * Extract correlation ID from request headers or generate new one
   */
  private getCorrelationId(request: Request): string {
    return (
      (request.headers['x-correlation-id'] as string) ||
      (request.headers['x-request-id'] as string) ||
      this.generateCorrelationId()
    );
  }

  /**
   * Generate a unique correlation ID
   */
  private generateCorrelationId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log error with appropriate severity level
   */
  private logError(
    exception: HttpException,
    request: Request,
    status: number,
    correlationId: string,
  ) {
    const logContext = {
      correlationId,
      method: request.method,
      path: request.path,
      status,
      userAgent: request.get('user-agent'),
      ip: request.ip,
    };

    const message = exception instanceof AppException
      ? exception.message
      : exception.getResponse?.() || 'Unknown error';

    if (status >= 500) {
      this.logger.error(
        `[${status}] ${request.method} ${request.path}`,
        {
          ...logContext,
          error: message,
          stack: exception.stack,
        },
      );
    } else if (status >= 400) {
      this.logger.warn(
        `[${status}] ${request.method} ${request.path}`,
        {
          ...logContext,
          error: message,
        },
      );
    }
  }
}
