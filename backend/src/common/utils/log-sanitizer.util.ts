/**
 * Log Sanitization Utility
 *
 * Removes or masks sensitive data from logs to prevent PII/credential leakage
 *
 * Security Best Practices:
 * - Never log passwords, tokens, or secrets
 * - Mask credit card numbers and SSN
 * - Sanitize both keys and values
 * - Handle nested objects and arrays
 */

/**
 * Sensitive field names that should be masked
 */
const SENSITIVE_KEYS = [
    'password',
    'passwd',
    'pwd',
    'secret',
    'token',
    'accessToken',
    'refreshToken',
    'access_token',
    'refresh_token',
    'apiKey',
    'api_key',
    'authorization',
    'auth',
    'bearer',
    'credit_card',
    'creditCard',
    'cvv',
    'ssn',
    'social_security',
    'pin',
    'privateKey',
    'private_key'
];

/**
 * Regular expressions for sensitive data patterns
 */
const SENSITIVE_PATTERNS = {
    // Credit card (basic pattern)
    creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    // SSN (US format)
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    // Email (optional - might be legitimate to log)
    // email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    // JWT tokens
    jwt: /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*/g,
    // API keys (common formats)
    apiKey: /\b[A-Za-z0-9]{32,}\b/g
};

/**
 * Mask value - show only first and last 2 characters
 */
function maskValue(value: string): string {
    if (!value || value.length <= 4) {
        return '[REDACTED]';
    }
    const start = value.substring(0, 2);
    const end = value.substring(value.length - 2);
    const middle = '*'.repeat(Math.min(value.length - 4, 10));
    return `${start}${middle}${end}`;
}

/**
 * Check if a key name is sensitive
 */
function isSensitiveKey(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return SENSITIVE_KEYS.some(sensitiveKey => lowerKey.includes(sensitiveKey));
}

/**
 * Sanitize a string value
 */
function sanitizeString(value: string): string {
    let sanitized = value;

    // Mask credit card numbers
    sanitized = sanitized.replace(
        SENSITIVE_PATTERNS.creditCard,
        (match) => `****-****-****-${match.slice(-4)}`
    );

    // Mask SSN
    sanitized = sanitized.replace(
        SENSITIVE_PATTERNS.ssn,
        '***-**-****'
    );

    // Mask JWT tokens
    sanitized = sanitized.replace(
        SENSITIVE_PATTERNS.jwt,
        '[JWT_TOKEN_REDACTED]'
    );

    return sanitized;
}

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: any, maxDepth: number = 10, currentDepth: number = 0): any {
    // Prevent infinite recursion
    if (currentDepth > maxDepth) {
        return '[MAX_DEPTH_REACHED]';
    }

    // Handle null and undefined
    if (obj === null || obj === undefined) {
        return obj;
    }

    // Handle primitive types
    if (typeof obj !== 'object') {
        if (typeof obj === 'string') {
            return sanitizeString(obj);
        }
        return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item, maxDepth, currentDepth + 1));
    }

    // Handle objects
    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
        // Check if key is sensitive
        if (isSensitiveKey(key)) {
            if (typeof value === 'string') {
                sanitized[key] = maskValue(value);
            } else {
                sanitized[key] = '[REDACTED]';
            }
        } else if (typeof value === 'object' && value !== null) {
            // Recursively sanitize nested objects
            sanitized[key] = sanitizeObject(value, maxDepth, currentDepth + 1);
        } else if (typeof value === 'string') {
            // Sanitize string values for patterns
            sanitized[key] = sanitizeString(value);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

/**
 * Main sanitization function
 *
 * Usage:
 *   logger.info(sanitizeLogData({ password: 'secret123', email: 'user@example.com' }));
 *   // Outputs: { password: '[REDACTED]', email: 'user@example.com' }
 */
export function sanitizeLogData(data: any): any {
    try {
        return sanitizeObject(data);
    } catch (error) {
        // If sanitization fails, return safe fallback
        return '[LOG_SANITIZATION_ERROR]';
    }
}

/**
 * Sanitize error objects for logging
 * Preserves stack trace but removes sensitive data from message
 */
export function sanitizeError(error: any): any {
    if (!(error instanceof Error)) {
        return sanitizeLogData(error);
    }

    return {
        name: error.name,
        message: sanitizeString(error.message),
        stack: error.stack,
        ...sanitizeLogData({ ...error })
    };
}

/**
 * Create a sanitized logger wrapper
 *
 * Usage:
 *   const sanitizedLogger = createSanitizedLogger(originalLogger);
 *   sanitizedLogger.info('User logged in', { password: 'secret' });
 *   // password will be automatically redacted
 */
export function createSanitizedLogger(logger: any) {
    return {
        error: (message: string, ...meta: any[]) => {
            logger.error(message, ...meta.map(sanitizeLogData));
        },
        warn: (message: string, ...meta: any[]) => {
            logger.warn(message, ...meta.map(sanitizeLogData));
        },
        info: (message: string, ...meta: any[]) => {
            logger.info(message, ...meta.map(sanitizeLogData));
        },
        debug: (message: string, ...meta: any[]) => {
            logger.debug(message, ...meta.map(sanitizeLogData));
        },
        verbose: (message: string, ...meta: any[]) => {
            logger.verbose(message, ...meta.map(sanitizeLogData));
        }
    };
}
