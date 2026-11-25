'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ListConfig, ToolbarFilterConfig } from '../../types/crud'

type FilterRules = Pick<ToolbarFilterConfig, 'allValue' | 'defaultValue' | 'options'>

/**
 * A value of this filter that means "no filter": `''`, or its `allValue` when
 * declared, else the legacy magic values `'todos'` / `'all'`.
 */
export function isFilterReset(
  filter: Pick<ToolbarFilterConfig, 'allValue'> | undefined,
  value: string | undefined
): boolean {
  if (!value) return true
  return filter?.allValue !== undefined
    ? value === filter.allValue
    : value === 'todos' || value === 'all'
}

/**
 * The filter starts on (and returns to) its own `defaultValue`: one that is not
 * the "no filter" choice — `allValue`, or the first option without it.
 */
const hasOwnDefault = (f: FilterRules | undefined): boolean =>
  Boolean(f?.defaultValue) &&
  f!.defaultValue !==
    (f!.allValue !== undefined ? f!.allValue : f!.options[0]?.value)

/** Toolbar selection → query filters: drops the "no filter" values */
export function toolbarQueryFilters(
  filters: Record<string, string>,
  configs: readonly ToolbarFilterConfig[] = []
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([k, v]) => !isFilterReset(configs.find(f => f.key === k), v)
    )
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
          } else if (hasOwnDefault(f)) {
            initial[f.key] = f.defaultValue!
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
        const filter = list.toolbar?.filters?.find(f => f.key === key)
        // A filter with its own defaultValue keeps the explicit reset ("todos",
        // or its allValue), otherwise the default would show (and apply) again
        if (isFilterReset(filter, value) && !hasOwnDefault(filter)) {
          delete next[key]
        } else {
          next[key] = value || (filter?.allValue ?? 'todos')
        }
        return next
      })
      // Reset to page 1 when filters change (server-side pagination)
      setStorePage(1)
    },
    [setStorePage, list.toolbar?.filters]
  )

  /** Sets `keys` from `seed` (a URL), back to their default when missing */
  const resetToolbarFilters = useCallback(
    (keys: string[], seed: Record<string, string>) => {
      setToolbarFilters(prev => {
        const next = { ...prev }
        for (const f of list.toolbar?.filters ?? []) {
          if (!keys.includes(f.key)) continue
          const value = seed[f.key] || (hasOwnDefault(f) ? f.defaultValue : '')
          if (value) next[f.key] = value
          else delete next[f.key]
        }
        return next
      })
    },
    [list.toolbar?.filters]
  )

  return {
    toolbarFilters,
    localSearch,
    handleToolbarSearch,
    handleToolbarFilterChange,
    resetToolbarFilters,
  }
}
