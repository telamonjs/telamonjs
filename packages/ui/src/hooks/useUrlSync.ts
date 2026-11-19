'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'

/**
 * Hook to sync state with URL query params
 * Useful for persistent pagination, filters, and sorting
 */
export function useUrlSync() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  /**
   * Get the value of a query param
   */
  const getParam = useCallback(
    (key: string): string | null => {
      return searchParams.get(key)
    },
    [searchParams]
  )

  /**
   * Get the numeric value of a query param
   */
  const getNumberParam = useCallback(
    (key: string, defaultValue?: number): number | undefined => {
      const value = searchParams.get(key)
      if (!value) return defaultValue
      const parsed = parseInt(value, 10)
      return isNaN(parsed) ? defaultValue : parsed
    },
    [searchParams]
  )

  /**
   * Check whether a query param exists
   */
  const hasParam = useCallback(
    (key: string): boolean => {
      return searchParams.has(key)
    },
    [searchParams]
  )

  /**
   * Update a single query param
   *
   * @param options.replace - uses router.replace instead of push (does not
   * create a history entry — useful for dialog state).
   */
  const setParam = useCallback(
    (
      key: string,
      value: string | number | null | undefined,
      options?: { replace?: boolean }
    ) => {
      const params = new URLSearchParams(searchParams.toString())

      if (value === null || value === undefined || value === '') {
        params.delete(key)
      } else {
        params.set(key, String(value))
      }

      const newUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname
      if (options?.replace) {
        router.replace(newUrl, { scroll: false })
      } else {
        router.push(newUrl, { scroll: false })
      }
    },
    [searchParams, pathname, router]
  )

  /**
   * Update multiple query params at once (atomic mutation).
   *
   * @param options.replace - uses router.replace instead of push (does not
   * create a history entry). Useful for writing several keys in a single
   * navigation — e.g. the view→edit handoff that removes `?view` and sets
   * `?edit` in one go, with no stale intermediate snapshots.
   */
  const setParams = useCallback(
    (
      updates: Record<string, string | number | null | undefined>,
      options?: { replace?: boolean }
    ) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          params.delete(key)
        } else {
          params.set(key, String(value))
        }
      })

      const newUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname
      if (options?.replace) {
        router.replace(newUrl, { scroll: false })
      } else {
        router.push(newUrl, { scroll: false })
      }
    },
    [searchParams, pathname, router]
  )

  /**
   * Remove a query param
   */
  const clearParam = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete(key)

      const newUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname
      router.push(newUrl, { scroll: false })
    },
    [searchParams, pathname, router]
  )

  /**
   * Remove all query params
   */
  const clearAllParams = useCallback(() => {
    router.push(pathname, { scroll: false })
  }, [pathname, router])

  /**
   * Get all query params as an object
   */
  const getAllParams = useCallback((): Record<string, string> => {
    const params: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      params[key] = value
    })
    return params
  }, [searchParams])

  return {
    getParam,
    getNumberParam,
    hasParam,
    setParam,
    setParams,
    clearParam,
    clearAllParams,
    getAllParams,
  }
}
