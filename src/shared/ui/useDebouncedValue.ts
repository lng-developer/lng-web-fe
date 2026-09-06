import { useEffect, useState } from 'react'

/**
 * Hook that returns a debounced version of the passed value.
 * Commonly used for search inputs, query filters, and auto-save fields.
 *
 * @param value The value to debounce
 * @param delay Milliseconds to wait before updating debounced value (default: 200ms)
 */
export function useDebouncedValue<T>(value: T, delay = 200): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

export default useDebouncedValue
