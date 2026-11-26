/**
 * Types of the Prisma pagination service (`createPaginationContext`).
 * The ORM-agnostic ones (`AuthUser`, the filter types) live in
 * `@telamonjs/data` and are re-exported here.
 *
 * @module data/prisma
 */

import type { PaginatedResponse, PaginationParams } from '../contract.js'
import type {
  AuthUser,
  FilterFieldConfig,
  FilterFieldType,
  FilterLabels,
  FilterOption,
} from '../types.js'

export type {
  AuthUser,
  FilterFieldConfig,
  FilterFieldType,
  FilterLabels,
  FilterOption,
  FilterValue,
} from '../types.js'

/**
 * Prisma where clause type (recursive record)
 */
export type PrismaWhereClause = Record<string, unknown>

/**
 * Prisma include/select clause type
 */
export type PrismaIncludeClause = Record<
  string,
  boolean | Record<string, unknown>
>

/**
 * Main configuration for paginated service
 */
export interface PaginatedServiceConfig<TModel extends string = string> {
  // Required: Model name (must match Prisma model)
  model: TModel

  // Search configuration
  searchFields?: string[] // Fields to search with global search
  searchMode?: 'insensitive' | 'default'

  // Filter configuration
  filters?: Record<string, FilterFieldType | FilterFieldConfig>

  // Include relations
  include?: PrismaIncludeClause

  // Select specific fields (optional, conflicts with include)
  select?: Record<string, boolean | Record<string, unknown>>

  // Default ordering
  defaultOrderBy?: string | string[]
  defaultOrderDirection?: 'asc' | 'desc'

  /**
   * Fields the client may sort by, as data paths (`'customer.name'`,
   * `'created_at'`, `'_count.items'`). A legacy TanStack column id
   * (`'customer_name'`, the default wire format) passes when its dotted form
   * is listed; a listed value always wins, so `'created_at'` stays a scalar.
   * When set, any other `sortBy` is ignored and the default sort applies.
   * When absent, any field is accepted and underscores are decoded as
   * legacy ids (`created_at` → `created.at`): list snake_case fields.
   */
  sortableFields?: string[]

  /**
   * Visibility/permission rule: the Prisma where clause this user may see.
   * With `createCachedPaginatedService` the clause is part of the cache key,
   * so it must be deterministic for a given user: not
   * `{ publishedAt: { lte: new Date() } }`, which never repeats a key.
   */
  visibility?: (user: AuthUser) => PrismaWhereClause

  // Count configuration for relations
  counts?: string[] // Relations to count (e.g., ['produtosCliente', 'unidades'])

  // Custom where conditions (always applied)
  baseWhere?: PrismaWhereClause

  // Hooks for extensibility
  beforeQuery?: (
    params: PaginationParams,
    where: PrismaWhereClause
  ) => PrismaWhereClause // Transform where before query
  afterQuery?: <T>(data: T[]) => T[] // Transform data after query

  // Custom filter options builder
  customFilterOptions?: (
    model: string,
    field: string
  ) => Promise<FilterOption[]>

  // Enable/disable features
  enableFilterOptions?: boolean // Default: true
  enableCache?: boolean // Default: false for now

  // Performance options
  maxPageSize?: number // Default: 100
  defaultPageSize?: number // Default: 10
}

/**
 * Generated service interface
 */
export interface PaginatedService<T = Record<string, unknown>> {
  // Main pagination method
  list: (params?: PaginationParams) => Promise<PaginatedResponse<T>>

  // Get filter options for dynamic filters
  /** `locale` is handed to `PaginationContext.filterLabels` */
  getFilterOptions?: (
    locale?: string
  ) => Promise<Record<string, FilterOption[]>>

  // Get raw config (for debugging/extension)
  getConfig: () => PaginatedServiceConfig<string>
}

/**
 * Search condition builder result
 */
export interface SearchCondition {
  OR?: PrismaWhereClause[]
  AND?: PrismaWhereClause[]
  [key: string]: unknown
}

/**
 * Prisma client type (flexible to accommodate different Prisma versions)
 */
export type PrismaClient = Record<string, unknown>

/**
 * Pagination context configuration
 * Used to inject project-specific dependencies
 */
export interface PaginationContext {
  /**
   * Prisma client instance from the project
   */
  prisma: PrismaClient

  /**
   * Authentication function that returns the current session
   * Should return null if not authenticated
   */
  auth: () => Promise<{ user: AuthUser } | null>

  /**
   * Labels of boolean filter options, per locale (the `locale` passed to
   * `getFilterOptions`). Default: English (`Yes`/`No`, `Active`/`Inactive`).
   */
  filterLabels?: (locale: string | undefined) => FilterLabels

  /** Receives configuration warnings. Default: `console.warn`. */
  onWarning?: (message: string) => void

  /**
   * Optional cache utilities
   */
  cache?: {
    invalidateEntity: (entity: string, id?: string) => void
    cacheEntity: <T>(
      entity: string,
      key: string,
      fetcher: () => Promise<T>
    ) => Promise<T>
  }
}
