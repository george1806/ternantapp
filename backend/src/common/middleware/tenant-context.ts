/**
 * Tenant Context Interface
 * Represents the tenant information extracted from the request
 */
export interface TenantContext {
  slug: string;
  source: 'subdomain' | 'path' | 'header';
  timestamp: number;
}

/**
 * Extended Express Request with Tenant Context
 */
export interface TenantRequest {
  tenantContext?: TenantContext;
  tenantSlug?: string; // For backwards compatibility
}
