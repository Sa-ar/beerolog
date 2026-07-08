import { useEffect, useState } from 'react'

/**
 * Debounce a fast-changing value (e.g. a search input) so downstream work only
 * reacts after the user pauses. Pairs with react-query: feed the returned value
 * into the query key so the query itself stays declarative.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(handle)
  }, [value, delayMs])
  return debounced
}
