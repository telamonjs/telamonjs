'use client'

import { useEffect, useRef, useState } from 'react'
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
  /**
   * `false` for infinite scroll: every load starts at page 1 with batches of
   * the config's size, so `page`/`pageSize` stay out of the URL (and a link's
   * are removed) instead of promising a state the list does not use.
   * @default true
   */
  pagination?: boolean
  /**
   * Called when the URL's list params change from outside — Back/Forward, a
   * link to the same page — after `customFilters` were read again: the caller
   * applies the URL's table state. ListPage's own writes do not call it.
   */
  onUrlChange?: (getParam: (key: string) => string | null) => void
}

const positiveInt = (value: string | null): number | undefined => {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : undefined
}

/**
 * The table state a `urlSync` link carries — the params the sync effect
 * below writes. Invalid or missing values are left out (the config defaults
 * apply). `sortBy` is stored as-is: the table resolves both a column id and
 * a data path, and the server validates it like any sort it receives.
 */
export function tableStateFromUrl(
  getParam: (key: string) => string | null,
  /** `false` for infinite scroll: page and pageSize mean nothing there */
  pagination = true
): {
  page?: number
  pageSize?: number
  sorting?: SortField[]
  globalFilter?: string
} {
  const state: ReturnType<typeof tableStateFromUrl> = {}
  const page = pagination ? positiveInt(getParam('page')) : undefined
  const pageSize = pagination ? positiveInt(getParam('pageSize')) : undefined
  const sortBy = getParam('sortBy')
  const search = getParam('search')
  if (page) state.page = page
  if (pageSize) state.pageSize = pageSize
  if (sortBy) {
    state.sorting = [{ field: sortBy, order: getParam('sortOrder') === 'desc' ? 'desc' : 'asc' }]
  }
  if (search) state.globalFilter = search
  return state
}

/**
 * The URL params a `urlSync` ListPage owns. A write to any other param
 * (`useUrlFilters`, a dialog's `?view=`) is not a change of the list.
 */
export function listParamKeys(
  urlFilters: Record<string, 'string' | 'number'>,
  pagination = true
): string[] {
  return [
    ...(pagination ? ['page', 'pageSize'] : []),
    'sortBy',
    'sortOrder',
    'search',
    ...Object.keys(urlFilters),
  ]
}

const paramsKey = (keys: string[], value: (key: string) => string | null) =>
  JSON.stringify(keys.map(value))

function readCustomFilters(
  urlFilters: Record<string, 'string' | 'number'>,
  url: Pick<ReturnType<typeof useUrlSync>, 'getParam' | 'getNumberParam'>
): Record<string, string | number> {
  const filters: Record<string, string | number> = {}
  Object.entries(urlFilters).forEach(([key, type]) => {
    const value = type === 'number' ? url.getNumberParam(key) : url.getParam(key)
    if (value !== null && value !== undefined) {
      filters[key] = value
    }
  })
  return filters
}

/**
 * useListPageUrlSync - URL synchronization for ListPage (internal)
 *
 * Extracts custom filters from the URL on mount (when urlSync=true) and keeps
 * pagination state (page, pageSize, search, sort) synced into query params.
 * A later change of the list's params that ListPage did not write (Back,
 * a link to the same page) reads the filters again and calls `onUrlChange`.
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
  pagination = true,
  onUrlChange,
}: UseListPageUrlSyncParams): Record<string, string | number> {
  // URL sync hook (used when urlSync=true)
  const urlSyncHook = useUrlSync()

  // Custom filters (extracted from the URL when urlSync=true)
  const [customFilters, setCustomFilters] = useState<
    Record<string, string | number>
  >(() => (urlSync ? readCustomFilters(urlFilters, urlSyncHook) : {}))

  // The list's params in the current URL, and the ones this hook wrote that
  // may still be landing: a URL matching one of them is our own write (an
  // earlier write can land after a newer one was sent), anything else came
  // from outside.
  const keys = listParamKeys(urlFilters, pagination)
  const urlKey = paramsKey(keys, urlSyncHook.getParam)
  const lastUrlKey = useRef(urlKey)
  const inFlight = useRef<string[]>([])

  // The guard makes every run but a new URL a no-op
  useEffect(() => {
    if (!urlSync || urlKey === lastUrlKey.current) return
    lastUrlKey.current = urlKey
    const mine = inFlight.current.lastIndexOf(urlKey)
    if (mine >= 0) {
      inFlight.current = inFlight.current.slice(mine + 1)
      return
    }
    inFlight.current = []
    setCustomFilters(readCustomFilters(urlFilters, urlSyncHook))
    onUrlChange?.(urlSyncHook.getParam)
  }, [urlSync, urlKey, urlFilters, urlSyncHook, onUrlChange])

  // Keyed by content: callers rebuild this object on every render (an inline
  // `urlFilters` prop changes its memo deps each time).
  const liveFiltersKey = JSON.stringify(liveFilters ?? null)

  // Sync URL when state changes (when urlSync=true). `replace`: pagination,
  // search and filters are view state, not navigation — a push per change
  // made the Back button walk through every page/filter the user touched
  // (and one extra entry right after mount).
  useEffect(() => {
    if (urlSync) {
      const updates: Record<string, string | number | undefined> = {
        page: pagination ? page : undefined,
        pageSize: pagination ? pageSize : undefined,
        search: search || undefined,
        sortBy: sorting[0]?.field || undefined,
        sortOrder: sorting[0]?.order || undefined,
        ...customFilters, // Include custom filters in URL
        ...liveFilters, // Toolbar selects win over the values read at mount
      }
      const written = paramsKey(keys, key =>
        key in updates
          ? updates[key] === undefined || updates[key] === ''
            ? null
            : String(updates[key])
          : urlSyncHook.getParam(key)
      )
      if (written !== urlKey) inFlight.current.push(written)
      urlSyncHook.setParams(updates, { replace: true })
    }
    // urlSyncHook is intentionally omitted: its identity changes on every
    // searchParams update, so including it would re-run this effect after each
    // URL push performed here (feedback loop of redundant router.push calls).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, sorting, customFilters, liveFiltersKey, urlSync, pagination])

  return customFilters
}
