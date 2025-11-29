import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContext, TenantRequest } from '../middleware/tenant-context';

/**
 * Tenant Middleware
 * Extracts and validates tenant context from requests
 * Supports multiple tenant identification strategies:
 * 1. Subdomain: acme.app.com
 * 2. Path: /api/v1/c/acme-company
 * 3. Header: X-Tenant-Slug
 *
 * The tenant context is attached to the request for use in controllers and services.
 * This middleware runs on all requests but does not enforce tenant presence.
 * Controllers/guards are responsible for validating tenant in authenticated contexts.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  // Reserved subdomains that should not be treated as tenant identifiers
  private readonly reservedSubdomains = new Set([
    'www',
    'api',
    'localhost',
    'admin',
    'api-admin',
    'app',
    'mail',
    'blog',
    'static',
    'cdn',
  ]);

  // Regex pattern for valid tenant slug: alphanumeric, hyphens, underscores
  // Min 3 chars, max 50 chars
  private readonly slugPattern = /^[a-zA-Z0-9_-]{3,50}$/;

  use(req: TenantRequest, res: Response, next: NextFunction) {
    const tenantContext = this.extractTenantContext(req);

    if (tenantContext) {
      (req as any).tenantContext = tenantContext;
      // Also set for backwards compatibility
      (req as any).tenantSlug = tenantContext.slug;

      this.logger.debug(
        `Tenant context extracted: ${tenantContext.slug} (source: ${tenantContext.source})`,
      );
    } else {
      this.logger.debug('No tenant context found in request');
    }

    next();
  }

  /**
   * Extract tenant context from request using multiple strategies
   */
  private extractTenantContext(req: TenantRequest): TenantContext | null {
    // Strategy 1: Extract from X-Tenant-Slug header
    const headerTenant = this.extractFromHeader(req);
    if (headerTenant) {
      return { ...headerTenant, source: 'header' };
    }

    // Strategy 2: Extract from subdomain
    const subdomainTenant = this.extractFromSubdomain(req);
    if (subdomainTenant) {
      return { ...subdomainTenant, source: 'subdomain' };
    }

    // Strategy 3: Extract from path
    const pathTenant = this.extractFromPath(req);
    if (pathTenant) {
      return { ...pathTenant, source: 'path' };
    }

    return null;
  }

  /**
   * Extract tenant from X-Tenant-Slug header
   */
  private extractFromHeader(req: Request): Omit<TenantContext, 'source'> | null {
    const tenantSlug = req.get('x-tenant-slug')?.toLowerCase();

    if (tenantSlug && this.isValidSlug(tenantSlug)) {
      return { slug: tenantSlug, timestamp: Date.now() };
    }

    return null;
  }

  /**
   * Extract tenant from subdomain
   * Example: acme.app.com -> acme
   */
  private extractFromSubdomain(req: Request): Omit<TenantContext, 'source'> | null {
    const host = req.get('host') || '';
    const parts = host.split('.');

    if (parts.length < 2) {
      // No subdomain (single part or localhost)
      return null;
    }

    const subdomain = parts[0].toLowerCase();

    // Check if it's a reserved subdomain
    if (this.reservedSubdomains.has(subdomain)) {
      return null;
    }

    // Validate subdomain format
    if (this.isValidSlug(subdomain)) {
      return { slug: subdomain, timestamp: Date.now() };
    }

    return null;
  }

  /**
   * Extract tenant from path
   * Example: /api/v1/c/acme-company -> acme-company
   */
  private extractFromPath(req: Request): Omit<TenantContext, 'source'> | null {
    const pathMatch = req.path.match(/^\/(?:api\/)?v\d+\/c\/([a-zA-Z0-9_-]+)/i);

    if (pathMatch && pathMatch[1]) {
      const tenantSlug = pathMatch[1].toLowerCase();

      if (this.isValidSlug(tenantSlug)) {
        return { slug: tenantSlug, timestamp: Date.now() };
      }
    }

    return null;
  }

  /**
   * Validate tenant slug format
   */
  private isValidSlug(slug: string): boolean {
    if (!slug) return false;
    return this.slugPattern.test(slug);
  }
}
