import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Logger
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../../modules/companies/entities/company.entity';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Tenant Validation Guard
 *
 * SECURITY: Validates that authenticated users can only access data from their own company.
 * This prevents cross-tenant data access by validating the tenant context against the user's company.
 *
 * Authorization Rules:
 * - ADMIN users (isSuperAdmin=true) can access any tenant
 * - OWNER and WORKER users can only access their own company's tenant
 * - Public routes bypass this validation
 * - Unauthenticated requests are allowed (handled by JwtAuthGuard)
 *
 * Security Level: CRITICAL
 * OWASP: Addresses A01 (Broken Access Control)
 *
 * @author george1806
 */
@Injectable()
export class TenantValidationGuard implements CanActivate {
    private readonly logger = new Logger(TenantValidationGuard.name);

    constructor(
        private reflector: Reflector,
        @InjectRepository(Company)
        private readonly companyRepository: Repository<Company>
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Check if route is public
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass()
        ]);

        if (isPublic) {
            return true; // Public routes don't need tenant validation
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // If no user, let JwtAuthGuard handle authentication
        if (!user) {
            return true;
        }

        // ADMIN users can access any tenant
        if (user.isSuperAdmin === true) {
            this.logger.debug(`Admin user ${user.userId} granted access to any tenant`);
            return true;
        }

        // Get tenant context from request
        const tenantContext = request.tenantContext;

        // If no tenant context, allow (some routes don't require tenant context)
        if (!tenantContext?.slug) {
            return true;
        }

        // If user has no company, they can't access tenant-scoped resources
        if (!user.companyId) {
            this.logger.warn(
                `User ${user.userId} has no company but attempted to access tenant ${tenantContext.slug}`
            );
            throw new ForbiddenException(
                'You do not have permission to access this resource. No company association found.'
            );
        }

        // Validate tenant slug matches user's company slug
        const company = await this.companyRepository.findOne({
            where: { id: user.companyId },
            select: ['id', 'slug', 'isActive']
        });

        if (!company) {
            this.logger.error(
                `User ${user.userId} has invalid companyId ${user.companyId} - company not found`
            );
            throw new ForbiddenException(
                'Your company association is invalid. Please contact support.'
            );
        }

        // Check if company is active
        if (!company.isActive) {
            this.logger.warn(
                `User ${user.userId} attempted to access inactive company ${company.id}`
            );
            throw new ForbiddenException(
                'Your company account is inactive. Please contact support.'
            );
        }

        // Validate tenant slug matches company slug
        if (company.slug !== tenantContext.slug) {
            this.logger.warn(
                `SECURITY: User ${user.userId} (company: ${company.slug}) ` +
                `attempted to access tenant ${tenantContext.slug} - BLOCKED`
            );
            throw new ForbiddenException(
                'You do not have permission to access this tenant. ' +
                'Access is restricted to your own company data.'
            );
        }

        this.logger.debug(
            `User ${user.userId} validated for tenant ${tenantContext.slug}`
        );

        return true;
    }
}
