import { toast } from '@/hooks/use-toast';
import { getApiErrorMessage } from './api';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logToConsole?: boolean;
  context?: string;
  title?: string;
}

/**
 * Centralized error handling utility
 * Provides consistent error handling across the application
 */
export function handleApiError(
  error: unknown,
  options: ErrorHandlerOptions = {}
): string {
  const {
    showToast = true,
    logToConsole = true,
    context = 'API Error',
    title = 'Error',
  } = options;

  const message = getApiErrorMessage(error);

  if (logToConsole) {
    console.error(`[${context}]:`, error);
  }

  if (showToast) {
    toast({
      title,
      description: message,
      variant: 'destructive',
    });
  }

  return message;
}

/**
 * Handle success with optional toast notification
 */
export function handleSuccess(
  message: string,
  options: {
    showToast?: boolean;
    title?: string;
  } = {}
): void {
  const { showToast = true, title = 'Success' } = options;

  if (showToast) {
    toast({
      title,
      description: message,
    });
  }
}
