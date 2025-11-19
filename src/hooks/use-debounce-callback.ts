import { useCallback, useEffect, useRef } from "react";

/**
 * Debounce callback hook with flush support
 * Returns a tuple: [debouncedCallback, flush]
 * - debouncedCallback: A debounced version of the callback that delays execution until after delay milliseconds
 *   have elapsed since the last time it was invoked.
 * - flush: A function that immediately executes any pending debounced callback.
 *
 * Includes cleanup on unmount to prevent memory leaks.
 */
export function useDebounceCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number,
): [T, () => void] {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  const lastArgsRef = useRef<Parameters<T> | null>(null);

  // Keep callback ref up to date to avoid stale closures
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Store the last arguments
      lastArgsRef.current = args;

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
        lastArgsRef.current = null;
      }, delay);
    },
    [delay],
  ) as T;

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (lastArgsRef.current !== null) {
      callbackRef.current(...lastArgsRef.current);
      lastArgsRef.current = null;
    }
  }, []);

  return [debouncedCallback, flush];
}
