/**
 * Application Configuration Constants
 *
 * Static configuration values used throughout the application.
 * These are NOT environment-specific (those go in .env).
 * These are application-level constants that rarely change.
 *
 * @author george1806
 */

export const APP_CONFIG = {
  // Application Metadata
  APP: {
    NAME: 'Apartment Management SaaS',
    VERSION: '1.0.1',
    DESCRIPTION: 'Multi-tenant apartment management SaaS API',
    AUTHOR: 'george1806',
  },

  // API Configuration
  API: {
    DEFAULT_PREFIX: 'api',
    DEFAULT_VERSION: '1',
    DEFAULT_PORT: 3000,
  },

  // Pagination Defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
    MIN_LIMIT: 1,
    MAX_PAGE: 1000,
  },

  // Rate Limiting
  RATE_LIMIT: {
    DEFAULT_TTL: 60, // seconds
    DEFAULT_LIMIT: 100, // requests
    LOGIN_LIMIT: 5,
    LOGIN_TTL: 60, // 1 minute
    REFRESH_LIMIT: 10,
    REFRESH_TTL: 60, // 1 minute
  },

  // JWT Configuration
  JWT: {
    DEFAULT_ACCESS_EXPIRES_IN: '15m',
    DEFAULT_REFRESH_EXPIRES_IN: '7d',
    ACCESS_TOKEN_COOKIE_MAX_AGE: 15 * 60 * 1000, // 15 minutes in ms
    REFRESH_TOKEN_COOKIE_MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  },

  // Session Configuration
  SESSION: {
    MAX_SESSIONS_PER_USER: 5,
    ACCESS_TOKEN_TTL: 900, // 15 minutes in seconds
    REFRESH_TOKEN_TTL: 604800, // 7 days in seconds
    SESSION_PREFIX: 'session:',
    REFRESH_SESSION_PREFIX: 'refresh:',
    BLACKLIST_PREFIX: 'blacklist:',
  },

  // Password Configuration
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    BCRYPT_ROUNDS: 12,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL_CHAR: true,
  },

  // Brute Force Protection
  BRUTE_FORCE: {
    LOCKOUT_POLICY: [
      { threshold: 3, duration: 5 },      // 3 attempts → 5 min
      { threshold: 5, duration: 15 },     // 5 attempts → 15 min
      { threshold: 10, duration: 60 },    // 10 attempts → 1 hour
      { threshold: 20, duration: 1440 }   // 20 attempts → 24 hours
    ],
    RESET_ATTEMPTS_AFTER: 60, // minutes
  },

  // Database Configuration
  DATABASE: {
    DEFAULT_POOL_SIZE: 20,
    DEFAULT_ACQUIRE_TIMEOUT: 30000, // ms
    DEFAULT_IDLE_TIMEOUT: 10000, // ms
    DEFAULT_MAX_REUSES: 100,
  },

  // Redis/Cache Configuration
  CACHE: {
    DEFAULT_TTL: 3600, // 1 hour in seconds
    SHORT_TTL: 300, // 5 minutes
    MEDIUM_TTL: 1800, // 30 minutes
    LONG_TTL: 7200, // 2 hours
  },

  // File Upload Configuration
  FILE_UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB in bytes
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },

  // Tenant Configuration
  TENANT: {
    SLUG_MIN_LENGTH: 3,
    SLUG_MAX_LENGTH: 50,
    SLUG_PATTERN: /^[a-zA-Z0-9_-]{3,50}$/,
    RESERVED_SLUGS: ['www', 'api', 'localhost', 'admin', 'api-admin', 'app', 'mail', 'blog', 'static', 'cdn'],
  },

  // Audit Log Configuration
  AUDIT: {
    MAX_LOG_AGE_DAYS: 90,
    LOG_RETENTION_POLICY: '90 days',
  },

  // Email Configuration
  EMAIL: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 60000, // 1 minute in ms
  },

  // Queue Configuration
  QUEUE: {
    DEFAULT_JOB_ATTEMPTS: 3,
    DEFAULT_BACKOFF_DELAY: 60000, // 1 minute in ms
    COMPLETED_JOB_AGE: 86400, // 24 hours in seconds
    FAILED_JOB_AGE: 604800, // 7 days in seconds
  },

  // Reminders Configuration
  REMINDERS: {
    DEFAULT_DUE_SOON_DAYS: 3,
    DEFAULT_DUE_SOON_CRON: '0 8 * * *', // 8 AM daily
    DEFAULT_OVERDUE_CRON: '0 9 * * *', // 9 AM daily
    DEFAULT_OVERDUE_INTERVAL_DAYS: 7,
    DEFAULT_MAX_RETRIES: 3,
  },

  // Currency & Localization
  LOCALIZATION: {
    DEFAULT_CURRENCY: 'USD',
    DEFAULT_TIMEZONE: 'UTC',
    DEFAULT_LANGUAGE: 'en',
  },

  // Security Headers
  SECURITY_HEADERS: {
    HSTS_MAX_AGE: 31536000, // 1 year in seconds
    CORS_PREFLIGHT_MAX_AGE: 3600, // 1 hour in seconds
    CSP_DIRECTIVES: {
      DEFAULT_SRC: ["'self'"],
      STYLE_SRC: ["'self'"],
      SCRIPT_SRC: ["'self'"],
      IMG_SRC: ["'self'", 'data:', 'https:'],
      CONNECT_SRC: ["'self'"],
      FONT_SRC: ["'self'"],
      OBJECT_SRC: ["'none'"],
      MEDIA_SRC: ["'self'"],
      FRAME_SRC: ["'none'"],
    },
  },

  // Cookie Configuration
  COOKIE: {
    ACCESS_TOKEN_NAME: 'accessToken',
    REFRESH_TOKEN_NAME: 'refreshToken',
    SAME_SITE: 'strict' as const,
    PATH_ROOT: '/',
    PATH_REFRESH: '/api/auth/refresh',
  },

  // Client Type Detection
  CLIENT_TYPES: {
    WEB: 'web' as const,
    MOBILE: 'mobile' as const,
    API: 'api' as const,
  },

  // Logging Configuration
  LOGGING: {
    MAX_LOG_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_LOG_FILES: 14, // 2 weeks
    DATE_PATTERN: 'YYYY-MM-DD',
  },

  // Monitoring Configuration
  MONITORING: {
    METRICS_PATH: '/metrics',
    HEALTH_CHECK_PATH: '/health',
    PROMETHEUS_ENABLED: true,
  },
} as const;

// Export individual config categories for convenience
export const AppMetadata = APP_CONFIG.APP;
export const ApiConfig = APP_CONFIG.API;
export const PaginationConfig = APP_CONFIG.PAGINATION;
export const RateLimitConfig = APP_CONFIG.RATE_LIMIT;
export const JwtConfig = APP_CONFIG.JWT;
export const SessionConfig = APP_CONFIG.SESSION;
export const PasswordConfig = APP_CONFIG.PASSWORD;
export const BruteForceConfig = APP_CONFIG.BRUTE_FORCE;
export const DatabaseConfig = APP_CONFIG.DATABASE;
export const CacheConfig = APP_CONFIG.CACHE;
export const FileUploadConfig = APP_CONFIG.FILE_UPLOAD;
export const TenantConfig = APP_CONFIG.TENANT;
export const AuditConfig = APP_CONFIG.AUDIT;
export const EmailConfig = APP_CONFIG.EMAIL;
export const QueueConfig = APP_CONFIG.QUEUE;
export const RemindersConfig = APP_CONFIG.REMINDERS;
export const LocalizationConfig = APP_CONFIG.LOCALIZATION;
export const SecurityHeadersConfig = APP_CONFIG.SECURITY_HEADERS;
export const CookieConfig = APP_CONFIG.COOKIE;
export const ClientTypes = APP_CONFIG.CLIENT_TYPES;
export const LoggingConfig = APP_CONFIG.LOGGING;
export const MonitoringConfig = APP_CONFIG.MONITORING;
