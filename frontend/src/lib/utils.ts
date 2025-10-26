import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  formatCurrency as formatCurrencyDynamic,
  getCurrencySymbol,
  type Currency,
} from './currency';

/**
 * Merge Tailwind CSS classes with conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency with international support
 * Defaults to KES for backward compatibility, but supports all currencies
 *
 * @param amount - The amount to format
 * @param currencyCode - Currency code (ISO 4217), defaults to KES
 * @returns Formatted currency string with proper locale formatting
 */
export function formatCurrency(
  amount: number,
  currencyCode: Currency | string = 'KES',
): string {
  return formatCurrencyDynamic(amount, currencyCode);
}

/**
 * Get currency symbol only
 *
 * @param currencyCode - Currency code (ISO 4217), defaults to KES
 * @returns Currency symbol
 */
export function getCurrency(currencyCode: Currency | string = 'KES'): string {
  return getCurrencySymbol(currencyCode);
}

/**
 * Format date to local format
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

/**
 * Format date and time
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}
