import { useEffect, useState } from 'react'

type Primitive = number | boolean

/**
 * Like useState for a flat object of numbers/booleans, persisted to localStorage on every change.
 * Stored values are merged over the defaults, so fields added later fall back to their default.
 */
export function useStoredInput<T extends Record<keyof T, Primitive>>(key: string, defaults: T) {
  const [value, setValue] = useState<T>(() => load(key, defaults))

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // storage unavailable – state still works for this session
    }
  }, [key, value])

  return [value, setValue] as const
}

function load<T extends Record<keyof T, Primitive>>(key: string, defaults: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return defaults
    const stored: unknown = JSON.parse(raw)
    if (typeof stored !== 'object' || stored === null) return defaults

    const result = { ...defaults }
    for (const field of Object.keys(defaults) as (keyof T)[]) {
      const candidate = (stored as Record<keyof T, unknown>)[field]
      const sameType = typeof candidate === typeof defaults[field]
      if (sameType && (typeof candidate !== 'number' || Number.isFinite(candidate))) {
        result[field] = candidate as T[keyof T]
      }
    }
    return result
  } catch {
    return defaults
  }
}
