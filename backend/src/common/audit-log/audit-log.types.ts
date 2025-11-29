/**
 * Audit Log Types
 * Interfaces and enums for audit logging system
 */

/**
 * Audit Action Types
 * Standard CRUD + business operations
 */
export enum AuditAction {
  // CRUD Operations
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  RESTORE = 'RESTORE',

  // Business Operations
  PAYMENT_RECORDED = 'PAYMENT_RECORDED',
  INVOICE_SENT = 'INVOICE_SENT',
  INVOICE_MARKED_PAID = 'INVOICE_MARKED_PAID',
  OCCUPANCY_ACTIVATED = 'OCCUPANCY_ACTIVATED',
  OCCUPANCY_ENDED = 'OCCUPANCY_ENDED',
  TENANT_BLACKLISTED = 'TENANT_BLACKLISTED',

  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  SESSION_TERMINATED = 'SESSION_TERMINATED',

  // Admin Actions
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DISABLED = 'USER_DISABLED',
  PERMISSION_CHANGED = 'PERMISSION_CHANGED',
  EXPORT_INITIATED = 'EXPORT_INITIATED',

  // Errors
  ERROR = 'ERROR',
}

/**
 * Audit Log Status
 */
export enum AuditStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PARTIAL = 'PARTIAL',
}

/**
 * Audit Log Entry
 * Core interface for audit log records
 */
export interface AuditLogEntry {
  // Identity
  id?: string;
  timestamp: Date;
  correlationId: string;

  // User Information
  userId?: string;
  userEmail?: string;
  companyId: string;
  ipAddress?: string;
  userAgent?: string;

  // Action Details
  action: AuditAction;
  resource: string; // e.g., 'invoices', 'tenants', 'occupancies'
  resourceId?: string;
  method: string; // HTTP method: GET, POST, PUT, DELETE
  path: string;

  // Request/Response
  status: AuditStatus;
  statusCode?: number;
  duration?: number; // in milliseconds

  // Data Changes (only for mutations)
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };

  // Additional Context
  description?: string;
  metadata?: Record<string, any>;
  errorMessage?: string;
  stackTrace?: string;
}

/**
 * Audit Log Filter Options
 */
export interface AuditLogFilter {
  companyId?: string;
  userId?: string;
  action?: AuditAction;
  resource?: string;
  status?: AuditStatus;
  startDate?: Date;
  endDate?: Date;
  minDuration?: number;
  maxDuration?: number;
}

/**
 * Audit Log Query Options
 */
export interface AuditLogQueryOptions extends AuditLogFilter {
  page?: number;
  limit?: number;
  sortBy?: keyof AuditLogEntry;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Sensitive Fields Configuration
 * Fields that should be masked in audit logs
 */
export interface SensitiveFieldConfig {
  paths: string[]; // JsonPath patterns to mask
  replacement: string; // What to replace with (e.g., '***REDACTED***')
}

/**
 * Audit Log Configuration
 */
export interface AuditLogConfig {
  enabled: boolean;
  excludeStatusCodes?: number[]; // E.g., [404, 304] - don't log
  excludePaths?: string[]; // E.g., ['/health', '/metrics']
  sensitiveFields?: SensitiveFieldConfig[];
  maxLogAge?: number; // Days before deletion (GDPR)
  batchSize?: number; // For bulk operations
}

/**
 * Request Context for Audit
 */
export interface RequestAuditContext {
  correlationId: string;
  userId?: string;
  userEmail?: string;
  companyId: string;
  ipAddress?: string;
  userAgent?: string;
  method: string;
  path: string;
  timestamp: Date;
}

/**
 * Response Context for Audit
 */
export interface ResponseAuditContext {
  statusCode: number;
  duration: number;
  status: AuditStatus;
  errorMessage?: string;
}
