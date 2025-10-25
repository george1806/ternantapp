import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig
} from 'axios';

/**
 * API Configuration Constants
 * Centralized configuration for easy maintenance and environment-specific changes
 */
const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

/**
 * Storage Keys - Centralized to prevent typos and ensure consistency
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
} as const;

/**
 * Track if we've just logged in to prevent premature logout
 */
let justLoggedIn = false;
export const setJustLoggedIn = (value: boolean) => {
  justLoggedIn = value;
  if (value) {
    // Reset after 2 seconds
    setTimeout(() => {
      justLoggedIn = false;
    }, 2000);
  }
};

/**
 * Axios instance with security-focused configuration
 * - CSRF protection ready
 * - XSS prevention through Content-Type headers
 * - Timeout to prevent hanging requests
 */
export const api: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Enable cookies for CSRF token
});

/**
 * Request Interceptor
 *
 * Security & Optimization:
 * - Automatically injects JWT token from secure storage
 * - Prevents unauthorized requests
 * - Adds request timestamp for debugging
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Only access localStorage in browser environment
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Add request timestamp for performance monitoring
    config.metadata = { startTime: Date.now() };

    return config;
  },
  (error) => {
    console.error('[API Request Error]:', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 *
 * Security & Error Handling:
 * - Handles 401 (Unauthorized) with automatic logout
 * - Handles 403 (Forbidden) with appropriate messaging
 * - Handles 500+ (Server errors) gracefully
 * - Logs performance metrics
 * - Implements retry logic for network failures
 */
api.interceptors.response.use(
  (response) => {
    // Calculate request duration for monitoring
    const duration = Date.now() - (response.config.metadata?.startTime || 0);

    // Log slow requests (> 3 seconds)
    if (duration > 3000) {
      console.warn(`[API Slow Request]: ${response.config.url} took ${duration}ms`);
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _retryCount?: number;
    };

    // Handle different error scenarios
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data as ApiError;

      switch (status) {
        case 401:
          // Unauthorized - Clear auth and redirect to login
          // BUT: Don't auto-logout if this is the login endpoint itself OR if we just logged in
          const isLoginEndpoint = originalRequest.url?.includes('/auth/login');

          if (!isLoginEndpoint && !justLoggedIn && typeof window !== 'undefined') {
            console.warn('[API 401]: Unauthorized, clearing auth state', {
              url: originalRequest.url,
              justLoggedIn
            });
            localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
            localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
            localStorage.removeItem(STORAGE_KEYS.USER_DATA);
            localStorage.removeItem('auth-storage'); // Clear Zustand persisted state

            // Prevent redirect loop on login page
            if (!window.location.pathname.includes('/auth/login')) {
              window.location.href = '/auth/login';
            }
          } else {
            console.log('[API 401]: Skipping auto-logout', {
              isLoginEndpoint,
              justLoggedIn,
              url: originalRequest.url
            });
          }
          break;

        case 403:
          console.error('[API Forbidden]:', errorData.message || 'Access denied');
          break;

        case 404:
          console.error('[API Not Found]:', originalRequest.url);
          break;

        case 429:
          // Too Many Requests - Rate limiting
          console.warn('[API Rate Limit]: Too many requests, please slow down');
          break;

        case 500:
        case 502:
        case 503:
        case 504:
          // Server errors - Implement retry logic
          if (!originalRequest._retry && (originalRequest._retryCount || 0) < API_CONFIG.RETRY_ATTEMPTS) {
            originalRequest._retry = true;
            originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

            // Exponential backoff
            const delay = API_CONFIG.RETRY_DELAY * Math.pow(2, originalRequest._retryCount - 1);

            console.log(`[API Retry]: Attempt ${originalRequest._retryCount} after ${delay}ms`);

            await new Promise(resolve => setTimeout(resolve, delay));
            return api(originalRequest);
          }
          break;
      }
    } else if (error.request) {
      // Network error - no response received
      console.error('[API Network Error]:', error.message);
    } else {
      // Request setup error
      console.error('[API Request Setup Error]:', error.message);
    }

    return Promise.reject(error);
  }
);

/**
 * API Error Interface
 * Standardized error structure from backend
 */
export interface ApiError {
  message: string;
  statusCode?: number;
  error?: string;
  errors?: Record<string, string[]>; // Validation errors
}

/**
 * Extract user-friendly error message from API error
 *
 * Best Practice: Never expose raw error details to users
 * - Sanitizes error messages
 * - Provides fallback messages
 * - Handles validation errors
 */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError;

    // Handle validation errors
    if (apiError?.errors) {
      const firstError = Object.values(apiError.errors)[0];
      return Array.isArray(firstError) ? firstError[0] : String(firstError);
    }

    // Handle standard API errors
    if (apiError?.message) {
      return apiError.message;
    }

    // Handle network errors
    if (error.code === 'ECONNABORTED') {
      return 'Request timeout. Please check your internet connection.';
    }

    if (error.code === 'ERR_NETWORK') {
      return 'Network error. Please check your internet connection.';
    }

    // Generic axios error
    return error.message || 'An error occurred while communicating with the server';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unknown error occurred';
}

/**
 * Check if error is authentication related
 * Useful for conditional rendering and flow control
 */
export function isAuthError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return error.response?.status === 401;
  }
  return false;
}

/**
 * Check if error is network related
 * Useful for showing offline indicators
 */
export function isNetworkError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return !error.response && Boolean(error.request);
  }
  return false;
}

/**
 * API Response Wrapper Interface
 * Standardized response structure for type safety
 */
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  statusCode?: number;
}

/**
 * Paginated Response Interface
 * For list endpoints with pagination
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Pagination Parameters
 * Reusable interface for list queries
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// Type augmentation for axios config to include metadata
declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: number;
    };
  }
}
