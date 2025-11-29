import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction, AuditStatus } from '../audit-log/audit-log.types';

/**
 * Audit Log Interceptor
 * Logs all HTTP requests/responses for audit trail
 *
 * Responsibilities:
 * - Capture request metadata (user, IP, path, method)
 * - Measure request duration
 * - Capture response status and errors
 * - Map HTTP methods to audit actions
 * - Delegate to AuditLogService for persistence
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Skip audit log for certain endpoints
    if (this.shouldSkipAudit(request)) {
      return next.handle();
    }

    const startTime = Date.now();

    // Extract audit context from request
    const auditContext = this.extractAuditContext(request);

    return next.handle().pipe(
      tap((result) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        // Log successful request
        this.logRequest(auditContext, {
          statusCode,
          duration,
          status: statusCode >= 400 ? AuditStatus.FAILURE : AuditStatus.SUCCESS,
        });

        return result;
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;

        // Log error request
        this.logRequest(auditContext, {
          statusCode: error.status || 500,
          duration,
          status: AuditStatus.FAILURE,
          errorMessage: error.message,
          stackTrace: error.stack,
        });

        throw error;
      }),
    );
  }

  /**
   * Check if endpoint should be skipped from audit logging
   */
  private shouldSkipAudit(request: Request): boolean {
    const excludePaths = [
      '/health',
      '/health/live',
      '/health/ready',
      '/metrics',
      '/api/docs',
      '/api/docs-json',
    ];

    return excludePaths.some((path) => request.path.startsWith(path));
  }

  /**
   * Extract audit context from request
   */
  private extractAuditContext(request: Request) {
    return {
      correlationId:
        (request.headers['x-correlation-id'] as string) ||
        (request.headers['x-request-id'] as string) ||
        this.generateCorrelationId(),
      userId: (request.user as any)?.sub || (request.user as any)?.id,
      userEmail: (request.user as any)?.email,
      companyId: (request.user as any)?.companyId || (request as any).tenantContext?.slug,
      ipAddress: request.ip || request.socket.remoteAddress,
      userAgent: request.get('user-agent'),
      method: request.method,
      path: request.path,
      timestamp: new Date(),
    };
  }

  /**
   * Map HTTP method and path to audit action
   */
  private getAuditAction(method: string, _path: string): AuditAction {
    switch (method.toUpperCase()) {
      case 'GET':
        return AuditAction.READ;
      case 'POST':
        return AuditAction.CREATE;
      case 'PUT':
      case 'PATCH':
        return AuditAction.UPDATE;
      case 'DELETE':
        return AuditAction.DELETE;
      default:
        return AuditAction.READ;
    }
  }

  /**
   * Extract resource type from path
   */
  private getResourceFromPath(path: string): string {
    // Match patterns like /api/v1/invoices, /api/v1/tenants/123
    const match = path.match(/\/api\/v\d+\/([a-z-]+)/i);
    return match ? match[1] : 'unknown';
  }

  /**
   * Log request to audit service
   */
  private logRequest(
    auditContext: any,
    responseContext: { statusCode: number; duration: number; status: AuditStatus; errorMessage?: string; stackTrace?: string },
  ) {
    try {
      this.auditLogService.log({
        timestamp: auditContext.timestamp,
        correlationId: auditContext.correlationId,
        userId: auditContext.userId,
        userEmail: auditContext.userEmail,
        companyId: auditContext.companyId,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        action: this.getAuditAction(auditContext.method, auditContext.path),
        resource: this.getResourceFromPath(auditContext.path),
        method: auditContext.method,
        path: auditContext.path,
        status: responseContext.status,
        statusCode: responseContext.statusCode,
        duration: responseContext.duration,
        errorMessage: responseContext.errorMessage,
        stackTrace: process.env.NODE_ENV === 'development' ? responseContext.stackTrace : undefined,
      });
    } catch (error) {
      // Don't throw if audit logging fails - just log and continue
      this.logger.error('Failed to log audit entry', error);
    }
  }

  /**
   * Generate unique correlation ID
   */
  private generateCorrelationId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
