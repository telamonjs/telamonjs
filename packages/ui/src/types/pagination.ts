/**
 * Types for server-side pagination
 */

/**
 * Sort field for multi-column sorting
 */
export interface SortField {
  field: string
  order: 'asc' | 'desc'
}

export interface PaginationParams {
  page: number
  pageSize: number
  search?: string
  sortBy?: string | SortField[] // Suporta single ou multi-column sorting
  sortOrder?: 'asc' | 'desc' // Used only when sortBy is a string
  // `any` kept intentionally: consumer-defined filter values are heterogeneous
  // and get spread directly into query-layer where clauses (e.g. Prisma).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters?: Record<string, any> // Filtros customizados (ex: clienteId, status, etc)
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Helper para criar resposta paginada
 */
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
