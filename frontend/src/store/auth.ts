import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { STORAGE_KEYS } from '@/lib/api';

/**
 * Authentication State Interface
 *
 * Best Practice: Centralized auth state management
 * - Single source of truth for user auth state
 * - Type-safe operations
 * - Persistent across sessions
 */
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  clearAuth: () => void; // For silent token expiration
}

/**
 * Auth Store with Zustand
 *
 * Security & Best Practices:
 * - Uses persist middleware for seamless UX
 * - Stores minimal sensitive data (token in separate storage)
 * - Provides logout for both user-initiated and automatic scenarios
 * - Type-safe throughout
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,

      /**
       * Set hydration state
       * Used to track when store has loaded from localStorage
       */
      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },

      /**
       * Set authentication state
       * Called after successful login/registration
       *
       * Security: Token stored in localStorage separately for axios interceptor
       */
      setAuth: (user, token) => {
        console.log('setAuth called with:', {
          userName: user.firstName,
          hasToken: !!token
        });

        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
          console.log('Token saved to localStorage');
        }

        set({ user, token, isAuthenticated: true });

        console.log('Auth state updated in store');
      },

      /**
       * User-initiated logout
       * Clears all auth data and redirects to login
       */
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER_DATA);
        }
        set({ user: null, token: null, isAuthenticated: false });
      },

      /**
       * Silent auth clear
       * Used by API interceptor on 401 errors
       * Doesn't redirect (handled by interceptor)
       */
      clearAuth: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage', // LocalStorage key
      partialize: (state) => ({
        // Only persist user data, not the token (security)
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Restore token from localStorage before marking as hydrated
        if (state && typeof window !== 'undefined') {
          const storedToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
          console.log('Rehydrating auth store:', {
            hasStoredToken: !!storedToken,
            isAuthenticated: state.isAuthenticated,
            hasUser: !!state.user,
          });

          if (storedToken && state.isAuthenticated && state.user) {
            // Manually update the token in state
            state.token = storedToken;
          } else if (!storedToken && state.isAuthenticated) {
            // Token missing but marked as authenticated - clear auth
            console.warn('Token missing from localStorage, clearing auth state');
            state.user = null;
            state.isAuthenticated = false;
            state.token = null;
          }
        }

        state?.setHasHydrated(true);
      },
    }
  )
);
