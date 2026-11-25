/**
 * The list wire contract. It lives in `@telamonjs/data`, the package a
 * backend installs, so the front and the endpoint share one definition.
 */
import type { PaginatedResponse, PaginationParams } from '@telamonjs/data'

export type { SortField, PaginationParams, PaginatedResponse } from '@telamonjs/data'
export { createPaginatedResponse } from '@telamonjs/data'

/**
 * What a ListPage passes to `query.queryFn`: the page, the search, the active
 * filters and ONE sort column — the list reduces its `SortField[]` sort to the
 * first field, so `sortBy` is always a string. A client typed
 * `(params: { page?: number; sortBy?: string; ... })` is a valid `queryFn` as is.
 *
 * A type alias, not an interface, so a client typed `(params: Record<string, unknown>)`
 * accepts it too.
 */
export type ListQueryParams = {
  page: number
  pageSize: number
  search?: string
  /** One column: the column id or its data path (`list.sortParam`) */
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  /** Toolbar, column and URL filters, by key */
  filters?: PaginationParams['filters']
}

/** A list query as the `queryFn` gets it: a `SortField[]` sort becomes its first field. */
export function toListQueryParams(params: PaginationParams): ListQueryParams {
  if (!Array.isArray(params.sortBy)) return { ...params, sortBy: params.sortBy }
  const [first] = params.sortBy
  return { ...params, sortBy: first?.field, sortOrder: first?.order }
}

/**
 * Casts a function to the `queryFn` shape `CrudConfig.query` expects, without
 * checking its params or its result.
 *
 * Not needed for a client whose params take a string `sortBy`: `queryFn` takes
 * `ListQueryParams`, so pass it directly (`queryFn: usersApi.list`). Left for
 * the rare client that does not fit (a required param the list never sends, a
 * result typed differently from `PaginatedResponse<T>`) — where fixing that
 * type is still the better fix.
 *
 * @example
 * ```ts
 * query: { queryKey: ['users'], queryFn: asQueryFn<User>(legacyApi.list) }
 * ```
 */
export function asQueryFn<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberate unchecked bridge; see comment above.
  fn: (...args: any[]) => Promise<any>
): (params: PaginationParams) => Promise<PaginatedResponse<T>> {
  return fn as unknown as (
    params: PaginationParams
  ) => Promise<PaginatedResponse<T>>
}
