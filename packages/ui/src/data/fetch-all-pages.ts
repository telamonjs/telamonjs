import {
  toListQueryParams,
  type ListQueryParams,
  type PaginatedResponse,
  type PaginationParams,
} from '../types/pagination'

export interface FetchAllPagesOptions<T> {
  /** The list's own `query.queryFn` */
  queryFn: (params: ListQueryParams) => Promise<PaginatedResponse<T>>
  /** The list's current query (search, filters, sort); `page`/`pageSize` are replaced */
  params: PaginationParams
  /** Rows per request */
  pageSize: number
  /** Stop once this many rows are collected */
  maxRows: number
  /** Aborting stops before the next request (the one in flight cannot be cancelled) */
  signal?: AbortSignal
  /** After each page: rows collected so far, and the target (`min(total, maxRows)`) */
  onProgress?: (loaded: number, target: number) => void
}

function assertNotAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError')
}

/**
 * Every row matching a list query, fetched page by page through its `queryFn`
 * — what "Export all" of a ListPage with `list.exportAll` exports.
 *
 * Sequential on purpose: one request at a time keeps the load on the backend
 * the same as scrolling the list. Stops at `totalPages`, at `maxRows`, or on an
 * empty page (a backend whose `totalPages` is wrong cannot loop forever).
 * Rows repeated across pages (same `id`) are dropped, as in the infinite list.
 *
 * ponytail: sequential pages; fetch a few in parallel if large exports get slow.
 */
export async function fetchAllPages<T>({
  queryFn,
  params,
  pageSize,
  maxRows,
  signal,
  onProgress,
}: FetchAllPagesOptions<T>): Promise<{ rows: T[]; total: number }> {
  // Same serialization as the list's own queries (useCrudQuery/useInfiniteListQuery)
  const query = toListQueryParams(params)

  const rows: T[] = []
  const seen = new Set<string>()
  let total = 0
  for (let page = 1; ; page++) {
    assertNotAborted(signal)
    const result = await queryFn({ ...query, page, pageSize })
    assertNotAborted(signal)
    total = result.total
    for (const row of result.data) {
      const id = (row as { id?: { toString(): string } } | null)?.id?.toString()
      if (id !== undefined) {
        if (seen.has(id)) continue
        seen.add(id)
      }
      rows.push(row)
    }
    const target = Math.min(total, maxRows)
    onProgress?.(Math.min(rows.length, target), target)
    if (
      rows.length >= maxRows ||
      page >= result.totalPages ||
      result.data.length === 0
    )
      break
  }
  return { rows: rows.slice(0, maxRows), total }
}
