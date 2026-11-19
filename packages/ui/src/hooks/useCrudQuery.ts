/**
 * useCrudQuery - React Query integration for CrudConfig
 *
 * This hook provides unified data fetching using React Query pattern.
 *
 * @example
 * pattern (React Query):
 * ```tsx
 * const { data, isLoading, error, refetch } = useCrudQuery({
 *   config,
 *   params: { page, pageSize, search, sortBy, filters }
 * })
 * // Uses useQuery with automatic caching and invalidation
 * ```
 */

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import type { CrudConfig } from '../types/crud'
import type { PaginationParams } from '../types/pagination'
import { LIB_QUERY_META } from '../utils/query-meta'

interface UseCrudQueryParams<T, TFormData = T> {
  /** CrudConfig with query */
  config: CrudConfig<T, TFormData>
  /** Pagination parameters */
  params: PaginationParams
  /** Enable query (default: true) */
  enabled?: boolean
}

interface UseCrudQueryReturn<T> {
  /** Paginated data */
  data: T[]
  /** Total count for pagination */
  total: number
  /** Loading state */
  isLoading: boolean
  /** True during background refetch */
  isFetching: boolean
  /** Error state */
  error: string | undefined
  /** Refetch function */
  refetch: () => Promise<void>
}

/**
 * Unified data fetching hook for CrudConfig
 *
 * Uses React Query pattern with automatic caching and invalidation.
 */
export function useCrudQuery<T>({
  config,
  params,
  enabled = true,
}: UseCrudQueryParams<T>): UseCrudQueryReturn<T> {
  const { query } = config

  if (!query) {
    throw new Error(
      '[useCrudQuery] Invalid CrudConfig: missing required "query" field'
    )
  }

  // Stabilize params to prevent unnecessary cache invalidation
  const filtersKey = JSON.stringify(params.filters)

  const stableParams = useMemo(
    () => ({
      page: params.page,
      pageSize: params.pageSize,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      search: params.search,
      filters: params.filters,
    }),
    // `params.filters` is depended on by value (filtersKey, stringified), not
    // identity: callers often pass a fresh object each render, which would bust
    // the memo and invalidate the React Query cache key on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      params.page,
      params.pageSize,
      params.sortBy,
      params.sortOrder,
      params.search,
      filtersKey,
    ]
  )

  // Build stable query key with memoized params
  const queryKey = useMemo(
    () =>
      Array.isArray(query.queryKey)
        ? [...query.queryKey, stableParams]
        : [query.queryKey, stableParams],
    [query.queryKey, stableParams]
  )

  // Use React Query
  const queryResult = useQuery({
    meta: LIB_QUERY_META,
    queryKey,
    queryFn: () => {
      // Serialize SortField[] to sortBy+sortOrder strings for API clients
      const sortBy = Array.isArray(params.sortBy)
        ? params.sortBy[0]?.field
        : params.sortBy
      const sortOrder = Array.isArray(params.sortBy)
        ? params.sortBy[0]?.order
        : params.sortOrder
      return query.queryFn({ ...params, sortBy, sortOrder })
    },
    staleTime: query.staleTime ?? 5_000, // Default 5s
    refetchInterval: query.refetchInterval ?? false,
    enabled,
    // Keep showing the previous result while a new key (search/page) loads
    placeholderData: keepPreviousData,
    ...query.options,
  })

  // Depend on the stable member, not the per-render result object
  const { refetch: rqRefetch } = queryResult
  const refetch = useCallback(async () => {
    await rqRefetch()
  }, [rqRefetch])

  return {
    data: queryResult.data?.data || [],
    total: queryResult.data?.total || 0,
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error?.message,
    refetch,
  }
}
