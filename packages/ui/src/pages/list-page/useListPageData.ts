'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useDebounce } from '../../hooks/use-debounce'
import { useCacheContext } from '../../contexts/CacheContext'
import { useCrudQuery } from '../../hooks/useCrudQuery'
import {
  useInfiniteListQuery,
  type UseInfiniteListQueryReturn,
} from '../../hooks/useInfiniteListQuery'
import type { CrudConfigWithAnyForm } from '../../types/crud'
import type { PaginationParams, SortField } from '../../types/pagination'
import { logger } from '../../utils/logger'

interface UseListPageDataParams<TData> {
  config: CrudConfigWithAnyForm<TData>
  page: number
  pageSize: number
  search: string
  sorting: SortField[]
  /** Merged custom + column + toolbar filters */
  allFilters: Record<string, unknown>
  /** True when embedded mode with list.infiniteScroll enabled */
  isInfiniteScroll: boolean
  /** Disable automatic refresh on focus/visibility change */
  disableAutoRefresh: boolean
  /** Optional callback for custom refresh logic */
  onRefreshAction?: () => Promise<void | { success: boolean }>
}

interface UseListPageDataReturn<TData> {
  /** Paginated data (standard query) */
  data: TData[]
  /** Total count (standard query) */
  total: number
  /** Loading state (standard query) */
  loading: boolean
  /** Error message (standard query) */
  error: string | undefined
  /** Infinite scroll query (only active when isInfiniteScroll) */
  infiniteQuery: UseInfiniteListQueryReturn<TData>
  /** Unified total for toolbar — works for both modes */
  effectiveTotal: number
  /** Unified loading for toolbar — works for both modes */
  effectiveLoading: boolean
  /** Unified isFetching for toolbar — works for both modes */
  effectiveIsFetching: boolean
  /** Refresh handler with cache revalidation */
  handleRefresh: () => Promise<void>
  /** The params passed to `query.queryFn` (debounced search) */
  paginationParams: PaginationParams
}

/**
 * useListPageData - Data fetching orchestration for ListPage (internal)
 *
 * Selects between the standard paginated query (useCrudQuery) and the
 * infinite scroll query (useInfiniteListQuery), provides the unified refresh
 * handler (Next.js cache revalidation + refetch + optional custom action) and
 * sets up the focus/visibility auto-refresh listeners.
 *
 * @internal Extracted from ListPage during the god-component decomposition.
 */
export function useListPageData<TData>({
  config,
  page,
  pageSize,
  search: rawSearch,
  sorting,
  allFilters,
  isInfiniteScroll,
  disableAutoRefresh,
  onRefreshAction,
}: UseListPageDataParams<TData>): UseListPageDataReturn<TData> {
  const { list } = config
  const pathname = usePathname()

  // Get cache context for revalidation
  const { revalidateAction } = useCacheContext()

  // Debounce the raw per-keystroke search so it issues one request, not one per key
  const search = useDebounce(rawSearch, 300)

  // Build pagination params for query
  const paginationParams = useMemo<PaginationParams>(
    () => ({
      page,
      pageSize,
      search,
      sortBy: sorting,
      sortOrder: undefined, // Not used with multi-sort
      filters: Object.keys(allFilters).length > 0 ? allFilters : undefined,
    }),
    [page, pageSize, search, sorting, allFilters]
  )

  // Use unified query hook (supports both v3.x and patterns)
  const {
    data,
    total,
    isLoading: loading,
    isFetching,
    error,
    refetch,
  } = useCrudQuery({
    config,
    params: paginationParams,
    enabled: !isInfiniteScroll,
  })

  // Infinite scroll query (only active when infiniteScroll mode)
  const infiniteQuery = useInfiniteListQuery({
    queryKey: config.query.queryKey,
    queryFn: config.query.queryFn,
    pageSize: list.defaultPageSize || 50,
    search,
    sortBy: sorting,
    filters: Object.keys(allFilters).length > 0 ? allFilters : undefined,
    staleTime: config.query.staleTime,
    enabled: isInfiniteScroll,
  })

  // Stable member (not the wrapper object) so handleRefresh keeps its identity
  const infiniteRefetch = infiniteQuery.refetch

  // Unified values for toolbar (counter, refresh) — works for both modes
  const effectiveTotal = isInfiniteScroll ? infiniteQuery.total : total
  const effectiveLoading = isInfiniteScroll ? infiniteQuery.isLoading : loading
  const effectiveIsFetching = isInfiniteScroll
    ? infiniteQuery.isFetching
    : isFetching

  // Simplified handleLoadData - now just calls refetch from useCrudQuery
  const handleLoadData = useCallback(async () => {
    await refetch()
  }, [refetch])

  // Update the ref whenever handleLoadData changes
  const handleLoadDataRef = useRef<(() => Promise<void>) | null>(null)
  useEffect(() => {
    handleLoadDataRef.current = handleLoadData
  }, [handleLoadData])

  // Setup focus/visibility listeners only once (unless disabled)
  useEffect(() => {
    if (disableAutoRefresh) return

    // Returning to the tab fires both `focus` and `visibilitychange`: one
    // refresh per return, not two.
    let lastRefresh = 0
    const shouldRefresh = () => {
      const now = Date.now()
      if (now - lastRefresh < 1000) return false
      lastRefresh = now
      return true
    }

    // Refresh data when page gains focus (e.g., after navigation back)
    const handleFocus = async () => {
      if (!shouldRefresh()) return
      try {
        await handleLoadDataRef.current?.()
      } catch (error) {
        logger.error('[ListPage] Error refreshing data on focus', {
          error: error instanceof Error ? error : String(error),
        })
        // Do NOT show a toast - automatic refreshes must be silent
      }
    }

    // Refresh data when page becomes visible again
    const handleVisibilityChange = async () => {
      if (!document.hidden && shouldRefresh()) {
        try {
          await handleLoadDataRef.current?.()
        } catch (error) {
          logger.error(
            '[ListPage] Error refreshing data on visibility change',
            {
              error: error instanceof Error ? error : String(error),
            }
          )
          // Do NOT show a toast - automatic refreshes must be silent
        }
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [disableAutoRefresh])

  // Refresh handler with cache revalidation
  const handleRefresh = useCallback(async () => {
    // 1. ALWAYS: revalidate the Next.js cache (if configured via AppProviders)
    if (revalidateAction) {
      await revalidateAction(pathname, 'layout')
    }

    // 2. Re-fetch data (now with a clean cache)
    if (isInfiniteScroll) {
      await infiniteRefetch()
    } else {
      await handleLoadData()
    }

    // 3. OPTIONAL: custom action (revalidate dependencies)
    if (onRefreshAction) {
      await onRefreshAction()
    }
  }, [
    revalidateAction,
    pathname,
    handleLoadData,
    onRefreshAction,
    isInfiniteScroll,
    infiniteRefetch,
  ])

  return {
    data,
    total,
    loading,
    error,
    infiniteQuery,
    effectiveTotal,
    effectiveLoading,
    effectiveIsFetching,
    handleRefresh,
    paginationParams,
  }
}
