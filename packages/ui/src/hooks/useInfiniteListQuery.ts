import {
  keepPreviousData,
  useInfiniteQuery,
  type QueryKey,
} from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import {
  toListQueryParams,
  type ListQueryParams,
  type PaginatedResponse,
  type SortField,
} from '../types/pagination'
import { LIB_QUERY_META } from '../utils/query-meta'

interface UseInfiniteListQueryParams<T> {
  queryKey: QueryKey
  queryFn: (params: ListQueryParams) => Promise<PaginatedResponse<T>>
  pageSize: number
  search?: string
  sortBy?: string | SortField[]
  filters?: Record<string, unknown>
  staleTime?: number
  enabled?: boolean
}

export interface UseInfiniteListQueryReturn<T> {
  /** Flattened data from all loaded pages */
  data: T[]
  /** Total count from server */
  total: number
  /** True on initial load */
  isLoading: boolean
  /** True while loading next page */
  isFetchingNextPage: boolean
  /** True during any background refetch */
  isFetching: boolean
  /** Whether more pages exist */
  hasNextPage: boolean
  /** Load next page */
  fetchNextPage: () => void
  /** Re-fetch all loaded pages */
  refetch: () => Promise<void>
  /** Error message */
  error: string | undefined
}

export function useInfiniteListQuery<T>({
  queryKey,
  queryFn,
  pageSize,
  search,
  sortBy,
  filters,
  staleTime = 5_000,
  enabled = true,
}: UseInfiniteListQueryParams<T>): UseInfiniteListQueryReturn<T> {
  const filtersKey = JSON.stringify(filters)
  const sortByKey = JSON.stringify(sortBy)

  const stableParams = useMemo(
    () => ({
      pageSize,
      search,
      sortBy,
      filters,
    }),
    // `sortBy`/`filters` are depended on by value (sortByKey/filtersKey stringified),
    // not identity: fresh objects per render must not bust the query key memo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pageSize, search, sortByKey, filtersKey]
  )

  const fullQueryKey = useMemo(
    () => [
      ...(Array.isArray(queryKey) ? queryKey : [queryKey]),
      'infinite',
      stableParams,
    ],
    [queryKey, stableParams]
  )

  const result = useInfiniteQuery({
    meta: LIB_QUERY_META,
    queryKey: fullQueryKey,
    // SortField[] → one sortBy/sortOrder pair, what API clients take
    queryFn: ({ pageParam }) =>
      queryFn(
        toListQueryParams({ page: pageParam, pageSize, search, sortBy, filters })
      ),
    initialPageParam: 1,
    getNextPageParam: lastPage => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1
      }
      return undefined
    },
    staleTime,
    enabled,
    // Keep the current rows while a new search/sort/filter key loads (same as
    // the paginated useCrudQuery) instead of flashing the skeleton.
    placeholderData: keepPreviousData,
  })

  // Stable identities: consumers (IntersectionObserver effect, memoized
  // handlers) depend on these; react-query's own fns are stable.
  const { fetchNextPage: rqFetchNextPage, refetch: rqRefetch } = result
  const fetchNextPage = useCallback(() => {
    void rqFetchNextPage()
  }, [rqFetchNextPage])
  const refetch = useCallback(async () => {
    await rqRefetch()
  }, [rqRefetch])

  const data = useMemo(() => {
    const all = result.data?.pages.flatMap(page => page.data) ?? []
    // Deduplicate by id to prevent React key collisions from pagination overlap
    const seen = new Set<string>()
    return all.filter(item => {
      const id = (item as { id?: { toString(): string } })?.id?.toString()
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })
  }, [result.data?.pages])

  const total = result.data?.pages[0]?.total ?? 0

  return {
    data,
    total,
    isLoading: result.isLoading,
    isFetchingNextPage: result.isFetchingNextPage,
    isFetching: result.isFetching,
    hasNextPage: result.hasNextPage,
    fetchNextPage,
    refetch,
    error: result.error?.message,
  }
}
