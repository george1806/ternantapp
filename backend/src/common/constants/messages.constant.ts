/**
 * Application Messages Constants
 *
 * Centralized repository for all user-facing messages, error messages,
 * and system notifications. This prevents hard-coded strings throughout
 * the application and enables easy internationalization in the future.
 *
 * @author george1806
 */

export const MESSAGES = {
  // Authentication Messages
  AUTH: {
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    TOKEN_REFRESHED: 'Token refreshed successfully',
    INVALID_CREDENTIALS: 'Invalid credentials',
    ACCOUNT_INACTIVE: 'Account is inactive',
    ACCOUNT_LOCKED: 'Account temporarily locked due to multiple failed login attempts. Please try again in {minutes} minute(s).',
    ACCOUNT_LOCKED_LONG: 'Your account has been locked. Please contact support to unlock your account.',
    SESSION_EXPIRED: 'Session expired. Please login again.',
    UNAUTHORIZED: 'Unauthorized access',
    TOKEN_NOT_FOUND: 'Authentication token not found',
    INVALID_TOKEN_TYPE: 'Invalid token type',
    REFRESH_TOKEN_NOT_FOUND_COOKIE: 'Refresh token not found in cookies',
    REFRESH_TOKEN_NOT_FOUND_BODY: 'Refresh token not provided in request body',
    TOO_MANY_LOGIN_ATTEMPTS: 'Too many login attempts. Please try again later.',
    TOO_MANY_REFRESH_ATTEMPTS: 'Too many refresh attempts. Please try again later.',
  },

  // User Management Messages
  USER: {
    CREATED: 'User created successfully',
    UPDATED: 'User updated successfully',
    DELETED: 'User deleted successfully',
    ACTIVATED: 'User activated successfully',
    DEACTIVATED: 'User deactivated successfully',
    NOT_FOUND: 'User not found',
    ALREADY_EXISTS: 'User with this email already exists',
    EMAIL_ALREADY_REGISTERED: 'Email address is already registered',
    CANNOT_DELETE_SELF: 'You cannot delete your own account',
    CANNOT_MODIFY_SELF_ROLE: 'You cannot modify your own role',
    NO_PERMISSION_CREATE_ADMIN: 'You do not have permission to create ADMIN users',
    NO_PERMISSION_CREATE_OWNER: 'You do not have permission to create OWNER users',
    NO_PERMISSION_CREATE_USER: 'You do not have permission to create users',
    INVALID_COMPANY_ASSOCIATION: 'Your company association is invalid. Please contact support.',
    NO_COMPANY_ASSOCIATION: 'You do not have permission to access this resource. No company association found.',
  },

  // Company Management Messages
  COMPANY: {
    CREATED: 'Company created successfully',
    UPDATED: 'Company updated successfully',
    DELETED: 'Company deleted successfully',
    NOT_FOUND: 'Company not found',
    SLUG_ALREADY_EXISTS: 'Company with this slug already exists',
    INACTIVE: 'Your company account is inactive. Please contact support.',
  },

  // Tenant/Multi-tenancy Messages
  TENANT: {
    CROSS_TENANT_ACCESS_DENIED: 'You do not have permission to access this tenant. Access is restricted to your own company data.',
    INVALID_TENANT_CONTEXT: 'Invalid tenant context',
    TENANT_NOT_FOUND: 'Tenant not found',
  },

  // Invoice Messages
  INVOICE: {
    CREATED: 'Invoice created successfully',
    UPDATED: 'Invoice updated successfully',
    DELETED: 'Invoice deleted successfully',
    GENERATED: 'Invoice generated successfully',
    BULK_GENERATED: 'Invoices generated successfully',
    NOT_FOUND: 'Invoice not found',
    NUMBER_EXISTS: 'Invoice number already exists',
    ALREADY_EXISTS_FOR_PERIOD: 'Invoice already exists for this period',
  },

  // Payment Messages
  PAYMENT: {
    CREATED: 'Payment created successfully',
    UPDATED: 'Payment updated successfully',
    DELETED: 'Payment deleted successfully',
    RECORDED: 'Payment recorded successfully',
    NOT_FOUND: 'Payment not found',
  },

  // Apartment Messages
  APARTMENT: {
    CREATED: 'Apartment created successfully',
    UPDATED: 'Apartment updated successfully',
    DELETED: 'Apartment deleted successfully',
    NOT_FOUND: 'Apartment not found',
  },

  // Tenant Messages
  TENANT_ENTITY: {
    CREATED: 'Tenant created successfully',
    UPDATED: 'Tenant updated successfully',
    DELETED: 'Tenant deleted successfully',
    NOT_FOUND: 'Tenant not found',
  },

  // Occupancy Messages
  OCCUPANCY: {
    CREATED: 'Occupancy created successfully',
    UPDATED: 'Occupancy updated successfully',
    DELETED: 'Occupancy deleted successfully',
    ENDED: 'Occupancy ended successfully',
    NOT_FOUND: 'Occupancy not found',
    ALREADY_OCCUPIED: 'Apartment is already occupied',
  },

  // Compound Messages
  COMPOUND: {
    CREATED: 'Compound created successfully',
    UPDATED: 'Compound updated successfully',
    DELETED: 'Compound deleted successfully',
    NOT_FOUND: 'Compound not found',
  },

  // Validation Messages
  VALIDATION: {
    INVALID_EMAIL: 'Invalid email format',
    INVALID_PASSWORD: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
    INVALID_UUID: 'Invalid UUID format',
    INVALID_DATE: 'Invalid date format',
    REQUIRED_FIELD: '{field} is required',
    INVALID_SORT_FIELD: 'Invalid sort field: {field}. Allowed fields: {allowedFields}',
    INVALID_QUERY_PARAM: 'Invalid query parameter',
    PAGE_OUT_OF_RANGE: 'Page number out of range',
    LIMIT_EXCEEDED: 'Limit exceeds maximum allowed value',
  },

  // Permission Messages
  PERMISSION: {
    ACCESS_DENIED: 'Access denied',
    INSUFFICIENT_PERMISSIONS: 'You do not have sufficient permissions to perform this action',
    ADMIN_ONLY: 'This action requires ADMIN privileges',
    OWNER_ONLY: 'This action requires OWNER privileges',
    FORBIDDEN: 'Forbidden',
  },

  // General Messages
  GENERAL: {
    SUCCESS: 'Operation completed successfully',
    FAILED: 'Operation failed',
    NOT_FOUND: 'Resource not found',
    INTERNAL_ERROR: 'Internal server error. Please try again later.',
    BAD_REQUEST: 'Bad request',
    CONFLICT: 'Resource conflict',
    CREATED: 'Resource created successfully',
    UPDATED: 'Resource updated successfully',
    DELETED: 'Resource deleted successfully',
  },

  // Security Messages
  SECURITY: {
    STORE_TOKENS_SECURELY: 'Store tokens securely using platform-specific secure storage (Keychain/KeyStore)',
    TOKENS_IN_COOKIES: 'Tokens are set as httpOnly cookies',
    TOKENS_IN_BODY: 'Tokens are in response body',
    CORS_REQUIRED: 'CORS_ORIGINS environment variable is required for security. Please set it to a comma-separated list of allowed origins.',
    SWAGGER_WARNING: 'WARNING: Swagger is enabled in production but SWAGGER_PASSWORD is not set. API documentation will be publicly accessible!',
  },

  // Token Delivery Messages
  TOKEN_DELIVERY: {
    COOKIES: 'cookies',
    BODY: 'body',
  },

  // Swagger Messages
  SWAGGER: {
    DISABLED: 'API Documentation is disabled (production mode)',
    AVAILABLE: 'API Documentation available at /api/docs',
    PROTECTED: 'API Documentation available at /api/docs (Basic Auth Required)',
  },
} as const;

// Helper function to replace placeholders in messages
export function formatMessage(message: string, params: Record<string, any>): string {
  return message.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

// Export individual message categories for convenience
export const AuthMessages = MESSAGES.AUTH;
export const UserMessages = MESSAGES.USER;
export const CompanyMessages = MESSAGES.COMPANY;
export const TenantMessages = MESSAGES.TENANT;
export const InvoiceMessages = MESSAGES.INVOICE;
export const PaymentMessages = MESSAGES.PAYMENT;
export const ValidationMessages = MESSAGES.VALIDATION;
export const PermissionMessages = MESSAGES.PERMISSION;
export const GeneralMessages = MESSAGES.GENERAL;
export const SecurityMessages = MESSAGES.SECURITY;
