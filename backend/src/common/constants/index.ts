/**
 * Constants Index
 *
 * Central export point for all application constants.
 * Import constants from here instead of individual files.
 *
 * Usage:
 *   import { MESSAGES, APP_CONFIG } from '@common/constants';
 *   import { AuthMessages, PaginationConfig } from '@common/constants';
 *
 * @author george1806
 */

export * from './messages.constant';
export * from './config.constant';

// Re-export everything for convenience
export { MESSAGES, formatMessage } from './messages.constant';
export { APP_CONFIG } from './config.constant';
