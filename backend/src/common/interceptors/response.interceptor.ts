import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

/**
 * Response Interceptor
 * Wraps all successful responses in a consistent format
 * Adds metadata like timestamp, correlationId, etc.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse<Response>();
    const correlationId = this.getCorrelationId(request);

    return next.handle().pipe(
      map((data) => {
        // If response already has success flag, return as-is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Determine if it's a paginated response
        const isPaginated = data && typeof data === 'object' && 'page' in data && 'total' in data;

        return {
          success: true,
          data,
          ...(isPaginated && {
            pagination: {
              page: data.page,
              limit: data.limit,
              total: data.total,
              pages: data.pages,
            },
          }),
          timestamp: new Date().toISOString(),
          correlationId,
        };
      }),
    );
  }

  /**
   * Extract correlation ID from request headers
   */
  private getCorrelationId(request: any): string {
    return (
      (request.headers['x-correlation-id'] as string) ||
      (request.headers['x-request-id'] as string) ||
      `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    );
  }
}
