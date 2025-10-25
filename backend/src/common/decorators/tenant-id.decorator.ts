import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Tenant ID Decorator
 * Extracts company ID from request user
 *
 * Author: george1806
 */
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.companyId;
  },
);
