'use client'

import { useEffect, useState } from 'react'
import { useUrlSync } from '../../hooks/useUrlSync'
import type { SortField } from '../../types/pagination'

interface UseListPageUrlSyncParams {
  /** Enable URL synchronization (ListPage `urlSync` prop) */
  urlSync: boolean
  /** Custom filters to extract from URL (ListPage `urlFilters` prop) */
  urlFilters: Record<string, 'string' | 'number'>
  page: number
  pageSize: number
  search: string
  sorting: SortField[]
  /**
   * Filters owned by live UI state (the toolbar selects) that must follow the
   * user into the URL when `urlSync` is on. `undefined` removes the
   * param, so clearing a select also clears the deep link.
   */
  liveFilters?: Record<string, string | undefined>
}

/**
 * useListPageUrlSync - URL synchronization for ListPage (internal)
 *
 * Extracts custom filters from the URL on mount (when urlSync=true) and keeps
 * pagination state (page, pageSize, search, sort) synced into query params.
 *
 * @internal Extracted from ListPage during the god-component decomposition.
 */
export function useListPageUrlSync({
  urlSync,
  urlFilters,
  page,
  pageSize,
  search,
  sorting,
  liveFilters,
}: UseListPageUrlSyncParams): Record<string, string | number> {
  // URL sync hook (used when urlSync=true)
  const urlSyncHook = useUrlSync()

  // Custom filters (extracted from the URL when urlSync=true)
  const [customFilters] = useState<Record<string, string | number>>(() => {
    if (!urlSync) return {}
    const filters: Record<string, string | number> = {}
    Object.entries(urlFilters).forEach(([key, type]) => {
      const value =
        type === 'number'
          ? urlSyncHook.getNumberParam(key)
          : urlSyncHook.getParam(key)
      if (value !== null && value !== undefined) {
        filters[key] = value
      }
    })
    return filters
  })

  // Keyed by content: callers rebuild this object on every render (an inline
  // `urlFilters` prop changes its memo deps each time).
  const liveFiltersKey = JSON.stringify(liveFilters ?? null)

  // Sync URL when state changes (when urlSync=true). `replace`: pagination,
  // search and filters are view state, not navigation — a push per change
  // made the Back button walk through every page/filter the user touched
  // (and one extra entry right after mount).
  useEffect(() => {
    if (urlSync) {
      urlSyncHook.setParams({
        page: page,
        pageSize: pageSize,
        search: search || undefined,
        sortBy: sorting[0]?.field || undefined,
        sortOrder: sorting[0]?.order || undefined,
        ...customFilters, // Include custom filters in URL
        ...liveFilters, // Toolbar selects win over the values read at mount
      }, { replace: true })
    }
    // urlSyncHook is intentionally omitted: its identity changes on every
    // searchParams update, so including it would re-run this effect after each
    // URL push performed here (feedback loop of redundant router.push calls).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, sorting, customFilters, liveFiltersKey, urlSync])

  return customFilters
}
