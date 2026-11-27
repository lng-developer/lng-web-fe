import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useUrlFilters<T extends object>(defaults: T, keys: readonly (keyof T)[]) {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => {
    const result = { ...defaults }
    for (const key of keys) {
      const value = params.get(String(key))
      if (value !== null) Object.assign(result, { [key]: value || undefined })
    }
    return result
  }, [defaults, keys, params])
  const setFilters = useCallback(
    (value: T | ((current: T) => T)) => {
      const next = typeof value === 'function' ? (value as (current: T) => T)(filters) : value
      setParams(
        (current) => {
          const result = new URLSearchParams(current)
          for (const key of keys) {
            if (next[key] == null || next[key] === '') {
              if (defaults[key] != null) result.set(String(key), '')
              else result.delete(String(key))
            } else result.set(String(key), String(next[key]))
          }
          return result
        },
        { replace: true },
      )
    },
    [defaults, filters, keys, setParams],
  )
  return [filters, setFilters] as const
}
