/**
 * The wire contract between a TelamonJS `ListPage` and the endpoint behind it.
 *
 * @module data
 */

/** One column of a (possibly multi-column) sort. */
export interface SortField {
  field: string
  order: 'asc' | 'desc'
}

/** What a list sends to its `queryFn`, and so to the endpoint. */
export interface PaginationParams {
  page: number
  pageSize: number
  search?: string
  /** One field (with `sortOrder`) or several `SortField`s */
  sortBy?: string | SortField[]
  /** Used only when `sortBy` is a string */
  sortOrder?: 'asc' | 'desc'
  /**
   * App-defined filters (`clienteId`, `status`...). `any` on purpose: the values
   * are heterogeneous and go straight into the query layer's where clauses.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters?: Record<string, any>
}

/** What the endpoint answers: one page plus the totals the list paginates with. */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** Builds a `PaginatedResponse`, deriving `totalPages`. */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResponse<T> {
  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/**
 * Clamps client-supplied paging: `page` ≥ 1, `1 ≤ pageSize ≤ maxPageSize`
 * (default 100), both floored; a missing `pageSize` is `defaultPageSize` (10).
 */
export function sanitizePaginationParams(params: {
  page?: number
  pageSize?: number
  maxPageSize?: number
  defaultPageSize?: number
}): { page: number; pageSize: number } {
  const {
    page = 1,
    pageSize = params.defaultPageSize || 10,
    maxPageSize = 100,
  } = params

  return {
    page: Math.max(1, Math.floor(page)),
    pageSize: Math.min(maxPageSize, Math.max(1, Math.floor(pageSize))),
  }
}
