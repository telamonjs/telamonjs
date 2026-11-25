import {
  createPaginatedResponse,
  type ListQueryParams,
  type PaginatedResponse,
} from '../types/pagination'

export interface ArrayQueryFnOptions {
  /**
   * Row paths (dotted: `'team.name'`) the search looks in. Default: the row's
   * top-level string and number values.
   */
  searchFields?: string[]
  /**
   * Filter keys applied in memory. Default: every key in `params.filters`.
   * Set it when `fetchAll` itself consumes a filter (a parent id, a scope)
   * that is not a field of the rows — `[]` applies none.
   */
  filterFields?: string[]
}

const get = (row: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>(
    (value, key) =>
      value !== null && typeof value === 'object'
        ? (value as Record<string, unknown>)[key]
        : undefined,
    row
  )

/** Lowercase, accents stripped: `'Dário'` matches a search for `'dario'`. */
const fold = (value: unknown): string =>
  String(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

const isEmpty = (value: unknown): boolean =>
  value === undefined || value === null || value === ''

/** Ascending order of two non-empty values: numbers, dates, then text. */
function compare(a: unknown, b: unknown): number {
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

/**
 * A `queryFn` for an endpoint that answers a plain array, with no server
 * paging: the ListPage gets a real `PaginatedResponse`, with search, filters,
 * sort and paging done in memory.
 *
 * - **search**: case- and accent-insensitive substring over `searchFields`, or
 *   over the row's top-level string/number values.
 * - **filters**: equality per key (dotted paths work), compared as strings —
 *   toolbar values are strings, so `'true'` matches `true` and `'3'` matches `3`.
 *   `undefined`/`null`/`''` values are skipped; the toolbar's "all" choice
 *   never reaches the `queryFn` (the list drops it).
 * - **sort**: by `sortBy` (dotted paths work); numbers, dates and booleans by
 *   value, text with `localeCompare` (numeric, case-insensitive); empty values
 *   last in both directions.
 *
 * `fetchAll` gets the list params, so it can still send a scope or a search
 * the endpoint understands.
 *
 * ponytail: no cache — every page request calls `fetchAll` again. Meant for
 * small lists: with the infinite list's default page size (50) most load in
 * one request. A list that outgrows that wants server paging, not a cache here.
 *
 * @example
 * ```ts
 * query: {
 *   queryKey: ['members', teamId],
 *   queryFn: arrayQueryFn(() => api.get<Member[]>(`/teams/${teamId}/members`), {
 *     searchFields: ['name', 'email'],
 *   }),
 * }
 * ```
 */
export function arrayQueryFn<T>(
  fetchAll: (params: ListQueryParams) => Promise<T[]>,
  options: ArrayQueryFnOptions = {}
): (params: ListQueryParams) => Promise<PaginatedResponse<T>> {
  return async params => {
    let rows = await fetchAll(params)

    const filters = Object.entries(params.filters ?? {}).filter(
      ([key, value]) =>
        !isEmpty(value) &&
        (!options.filterFields || options.filterFields.includes(key))
    )
    if (filters.length > 0) {
      rows = rows.filter(row =>
        filters.every(([key, value]) => {
          const actual = get(row, key)
          return !isEmpty(actual) && String(actual) === String(value)
        })
      )
    }

    const search = fold(params.search?.trim() ?? '')
    if (search) {
      rows = rows.filter(row => {
        const values = options.searchFields
          ? options.searchFields.map(path => get(row, path))
          : Object.values(row as object).filter(
              v => typeof v === 'string' || typeof v === 'number'
            )
        return values.some(v => !isEmpty(v) && fold(v).includes(search))
      })
    }

    const { sortBy } = params
    if (sortBy) {
      const direction = params.sortOrder === 'desc' ? -1 : 1
      // toSorted would be shorter; slice().sort keeps the ES2022 lib target
      rows = rows.slice().sort((a, b) => {
        const x = get(a, sortBy)
        const y = get(b, sortBy)
        if (isEmpty(x) || isEmpty(y)) return Number(isEmpty(x)) - Number(isEmpty(y))
        return direction * compare(x, y)
      })
    }

    const start = (params.page - 1) * params.pageSize
    return createPaginatedResponse(
      rows.slice(start, start + params.pageSize),
      rows.length,
      params.page,
      params.pageSize
    )
  }
}
