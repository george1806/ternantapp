import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to extract and attach tenant context to requests
 * Supports both subdomain and path-based tenant identification
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    let tenantSlug: string | null = null;

    // Extract from subdomain (e.g., acme.myapp.com)
    const host = req.get('host') || '';
    const subdomain = host.split('.')[0];

    // Check if it's a valid subdomain (not www, api, localhost, etc.)
    const reservedSubdomains = ['www', 'api', 'localhost', 'admin'];
    if (subdomain && !reservedSubdomains.includes(subdomain)) {
      tenantSlug = subdomain;
    }

    // Fallback: Extract from path (/c/:slug)
    if (!tenantSlug) {
      const pathMatch = req.path.match(/^\/c\/([^\/]+)/);
      if (pathMatch) {
        tenantSlug = pathMatch[1];
      }
    }

    // Attach tenant slug to request
    if (tenantSlug) {
      (req as any).tenantSlug = tenantSlug;
    }

    next();
  }
}
