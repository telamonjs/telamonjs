/**
 * Types and interfaces for the server-side pagination system
 * Provides type-safe pagination with minimal boilerplate
 *
 * @module server/pagination
 */

import { PaginationParams } from '../../types/pagination'
import type { TelamonjsLocale } from '../../i18n/locales'

/**
 * Configuration for filter fields
 */
export type FilterFieldType = 'string' | 'boolean' | 'number' | 'date' | 'enum'

export interface FilterFieldConfig {
  type: FilterFieldType
  field?: string // Override field name if different from key
  operator?: 'equals' | 'contains' | 'gte' | 'lte' | 'in' | 'not' // Default: equals for most, contains for string
  mode?: 'insensitive' | 'default' // For string searches
  transform?: (value: FilterValue) => FilterValue // Transform value before applying
}

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
 * Filter option for dropdown/select filters
 */
export interface FilterOption {
  value: string
  label: string
  count: number
}

/**
 * User object from authentication
 */
export interface AuthUser {
  id: string
  email?: string
  name?: string
  role?: string
  [key: string]: unknown
}

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
   * Fields the client may sort by (as sent in `sortBy`, e.g. `'customer.name'`).
   * When set, any other `sortBy` is ignored and the default sort applies.
   * When absent, any field is accepted.
   */
  sortableFields?: string[]

  // Visibility/permission rules
  visibility?: (user: AuthUser) => PrismaWhereClause // Returns Prisma where clause

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
  list: (params?: PaginationParams) => Promise<{
    data: T[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }>

  // Get filter options for dynamic filters
  getFilterOptions?: (
    locale?: TelamonjsLocale
  ) => Promise<Record<string, FilterOption[]>>

  // Get raw config (for debugging/extension)
  getConfig: () => PaginatedServiceConfig<string>
}

/**
 * Utility type for filter value extraction
 */
export type FilterValue =
  | string
  | number
  | boolean
  | Date
  | string[]
  | number[]
  | undefined

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
