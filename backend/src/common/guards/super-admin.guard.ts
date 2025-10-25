import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Guard to protect routes that only super admins can access
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, SuperAdminGuard)
 * @Get('super-admin/companies')
 * getAllCompanies() { ... }
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!user.isSuperAdmin) {
      throw new ForbiddenException(
        'Access denied. Super admin privileges required.',
      );
    }

    return true;
  }
}
