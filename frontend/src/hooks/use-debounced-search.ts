import { useState, useEffect } from 'react';

/**
 * Custom hook for debounced search
 * Delays the search query update until user stops typing
 *
 * @param initialValue - Initial search value
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 * @returns [debouncedValue, actualValue, setValue]
 */
export function useDebouncedSearch(initialValue: string = '', delay: number = 300) {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  useEffect(() => {
    // Set up the timeout
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if value changes before delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return {
    /** The debounced search value (use this for API calls) */
    debouncedValue,
    /** The actual input value (use this for the input field) */
    value,
    /** Function to update the search value */
    setValue,
    /** Whether the search is currently debouncing */
    isDebouncing: value !== debouncedValue,
  };
}
