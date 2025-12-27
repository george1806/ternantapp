import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract tenant/company ID from request
 * Usage: @TenantId() tenantId: string
 */
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantId || request.user?.companyId;
  },
);

/**
 * Decorator to extract current user from request
 * Usage:
 *   @CurrentUser() user: User - returns full user object
 *   @CurrentUser('companyId') companyId: string - returns specific property
 */
export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If a property name is provided, return that property
    if (data && user) {
      return user[data];
    }

    // Otherwise return the full user object
    return user;
  },
);
