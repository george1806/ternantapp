/**
 * Application Constants
 * Centralized constants to avoid magic numbers and improve maintainability
 */

export const PAGINATION = {
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 1000,
  WIDGET_LIMIT: 5,
} as const;

export const DATE_RANGES = {
  EXPIRING_LEASES_DAYS: 30,
  DUE_SOON_INVOICES_DAYS: 7,
  DEFAULT_DUE_DAYS: 7,
} as const;

export const VALIDATION_RULES = {
  COMPANY_NAME_MIN: 2,
  PASSWORD_MIN: 8,
  SUBJECT_MIN: 3,
  MESSAGE_MIN: 10,
  SLUG_MIN: 2,
  PHONE_MIN: 10,
} as const;

export const VALIDATION_PATTERNS = {
  SLUG: /^[a-z0-9-]+$/,
  PASSWORD_UPPERCASE: /[A-Z]/,
  PASSWORD_LOWERCASE: /[a-z]/,
  PASSWORD_NUMBER: /[0-9]/,
} as const;

export const DATE_FORMATS = {
  DISPLAY_DATE: 'MMM d, yyyy',
  DISPLAY_TIME: 'hh:mm a',
  DISPLAY_DATETIME: 'MMM d, yyyy HH:mm',
  INPUT_DATE: 'yyyy-MM-dd',
  INPUT_DATETIME: "yyyy-MM-dd'T'HH:mm",
  API_DATE: 'yyyy-MM-dd',
  API_DATETIME: "yyyy-MM-dd'T'HH:mm:ss",
} as const;

export const DEBOUNCE_DELAY = {
  SEARCH: 300,
  AUTO_SAVE: 1000,
  SLUG_GENERATION: 300,
} as const;
