import { useState, useEffect, useCallback } from 'react';
import { handleApiError } from '@/lib/error-handler';

export interface UseApiQueryOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
  showErrorToast?: boolean;
  enabled?: boolean;
}

export interface UseApiQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for API data fetching with proper error handling and cleanup
 * Automatically cancels pending requests when component unmounts or dependencies change
 */
export function useApiQuery<T>(
  queryFn: (signal: AbortSignal) => Promise<T>,
  dependencies: React.DependencyList = [],
  options: UseApiQueryOptions<T> = {}
): UseApiQueryResult<T> {
  const { onSuccess, onError, showErrorToast = true, enabled = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (signal: AbortSignal) => {
      try {
        setLoading(true);
        setError(null);

        const result = await queryFn(signal);

        if (!signal.aborted) {
          setData(result);
          onSuccess?.(result);
        }
      } catch (err: unknown) {
        if (!signal.aborted) {
          const errorMessage = handleApiError(err, { showToast: showErrorToast });
          setError(errorMessage);
          onError?.(err);
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    dependencies
  );

  const refetch = useCallback(async () => {
    const abortController = new AbortController();
    await fetchData(abortController.signal);
  }, [fetchData]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const abortController = new AbortController();
    fetchData(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [fetchData, enabled]);

  return { data, loading, error, refetch };
}
