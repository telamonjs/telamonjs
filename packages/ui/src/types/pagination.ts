/**
 * The list wire contract. It lives in `@telamonjs/data`, the package a
 * backend installs, so the front and the endpoint share one definition.
 */
import type { PaginatedResponse, PaginationParams } from '@telamonjs/data'

export type { SortField, PaginationParams, PaginatedResponse } from '@telamonjs/data'
export { createPaginatedResponse } from '@telamonjs/data'

/**
 * Adapts a query function to the `queryFn` shape `CrudConfig.query` expects.
 *
 * Many consumer HTTP clients type their own list params with `sortBy?:
 * string` (single-column sort only) — a subtype of this module's
 * `PaginationParams` (`sortBy?: string | SortField[]`), so passing such a
 * function directly where `queryFn` is expected fails structurally. This
 * adapter is the official bridge, so consumers stop hand-rolling the same
 * cast locally. `PaginationParams` itself stays untouched — a consumer that
 * DOES handle `SortField[]` keeps full type safety by not using this helper.
 *
 * @example
 * ```ts
 * query: { queryKey: ['users'], queryFn: asQueryFn(usersApi.list) }
 * ```
 */
export function asQueryFn<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberate bridge between a narrower client fn and the generic queryFn; see comment above.
  fn: (...args: any[]) => Promise<any>
): (params: PaginationParams) => Promise<PaginatedResponse<T>> {
  return fn as unknown as (
    params: PaginationParams
  ) => Promise<PaginatedResponse<T>>
}
