/**
 * ORM-agnostic types of a paginated list service: the authenticated user a
 * visibility rule receives and the filter declarations an endpoint accepts.
 * The Prisma adapter (`@telamonjs/data/prisma`) builds on them and
 * re-exports them.
 *
 * @module data
 */

/** How a filter key is parsed and compared. */
export type FilterFieldType = 'string' | 'boolean' | 'number' | 'date' | 'enum'

/** A filter key's full declaration (the short form is a bare `FilterFieldType`). */
export interface FilterFieldConfig {
  type: FilterFieldType
  field?: string // Override field name if different from key
  operator?: 'equals' | 'contains' | 'gte' | 'lte' | 'in' | 'not' // Default: equals for most, contains for string
  mode?: 'insensitive' | 'default' // For string searches
  /**
   * Transforms the value before it is applied. A `'boolean'` filter may return
   * a where fragment (`v => (v === 'true' ? { some: {} } : { none: {} })`),
   * applied as is; its options are then a fixed Yes/No pair.
   */
  transform?: (value: FilterValue) => FilterValue | Record<string, unknown>
}

/** A filter's value, before and after `FilterFieldConfig.transform`. */
export type FilterValue =
  | string
  | number
  | boolean
  | Date
  | string[]
  | number[]
  | undefined

/** One option of a dropdown/select filter, with how many rows carry it. */
export interface FilterOption {
  value: string
  label: string
  count: number
}

/** Labels of boolean filter options (see `PaginationContext.filterLabels`). */
export interface FilterLabels {
  /** A `transform`ed boolean filter's options */
  yes: string
  no: string
  /** Values `true`/`false` found in the column */
  active: string
  inactive: string
}

/**
 * The authenticated user a visibility rule receives. `role` is either a bare
 * code or an object carrying one: the `RoleInfo` that `@telamonjs/auth` puts
 * in the session fits structurally.
 */
export interface AuthUser {
  id: string
  email?: string
  name?: string
  role?: string | { code: string }
  [key: string]: unknown
}
