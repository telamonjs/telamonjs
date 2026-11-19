'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ListConfig } from '../../types/crud'

/** Toolbar filter values that mean "no filter" (the first option of the group) */
export const isResetValue = (value: string | undefined): boolean =>
  !value || value === 'todos' || value === 'all'

/** Toolbar selection → query filters: drops the explicit resets */
export function toolbarQueryFilters(
  filters: Record<string, string>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(filters).filter(([, v]) => !isResetValue(v))
  )
}

interface UseListPageToolbarParams<TData> {
  list: ListConfig<TData>
  /** Global filter value from the Zustand datatable store */
  search: string
  /** Store action: set global filter (pre-bound to tableId) */
  setStoreGlobalFilter: (value: string) => void
  /** Store action: set page (pre-bound to tableId) */
  setStorePage: (page: number) => void
  /**
   * Initial values for the declarative filters, keyed by filter key.
   * Typically the values read from the URL by `useListPageUrlSync` so a
   * deep link like `?status=ativo` also shows "ativo" in the toolbar select,
   * not only in the data. Wins over `defaultValue`.
   */
  initialFilters?: Record<string, string>
}

/**
 * useListPageToolbar - Embedded toolbar state for ListPage (internal)
 *
 * Owns the declarative toolbar filters and the debounced search
 * input used by the embedded TabToolbar.
 *
 * @internal Extracted from ListPage during the god-component decomposition.
 */
export function useListPageToolbar<TData>({
  list,
  search,
  setStoreGlobalFilter,
  setStorePage,
  initialFilters,
}: UseListPageToolbarParams<TData>) {
  // Toolbar filter state (embedded mode)
  const [toolbarFilters, setToolbarFilters] = useState<Record<string, string>>(
    () => {
      const initial: Record<string, string> = {}
      if (list.toolbar?.filters) {
        for (const f of list.toolbar.filters) {
          const fromUrl = initialFilters?.[f.key]
          if (fromUrl) {
            initial[f.key] = fromUrl
          } else if (f.defaultValue && f.defaultValue !== f.options[0]?.value) {
            initial[f.key] = f.defaultValue
          }
        }
      }
      return initial
    }
  )

  // Debounced search for embedded toolbar
  const [localSearch, setLocalSearch] = useState(search)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleToolbarSearch = useCallback(
    (value: string) => {
      setLocalSearch(value)
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
      searchTimeoutRef.current = setTimeout(() => {
        setStoreGlobalFilter(value)
      }, 300)
    },
    [setStoreGlobalFilter]
  )

  // Sync local search when store changes externally (React "adjusting
  // state when a prop changes" pattern — avoids an effect).
  const [prevSearch, setPrevSearch] = useState(search)
  if (search !== prevSearch) {
    setPrevSearch(search)
    setLocalSearch(search)
  }
  useEffect(
    () => () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    },
    []
  )

  const handleToolbarFilterChange = useCallback(
    (key: string, value: string) => {
      setToolbarFilters(prev => {
        const next = { ...prev }
        // A filter with its own defaultValue keeps the explicit reset ("todos"),
        // otherwise the default would show (and apply) again
        const hasDefault = list.toolbar?.filters?.some(
          f =>
            f.key === key &&
            f.defaultValue &&
            f.defaultValue !== f.options[0]?.value
        )
        if (isResetValue(value) && !hasDefault) {
          delete next[key]
        } else {
          next[key] = value || 'todos'
        }
        return next
      })
      // Reset to page 1 when filters change (server-side pagination)
      setStorePage(1)
    },
    [setStorePage, list.toolbar?.filters]
  )

  return {
    toolbarFilters,
    localSearch,
    handleToolbarSearch,
    handleToolbarFilterChange,
  }
}
