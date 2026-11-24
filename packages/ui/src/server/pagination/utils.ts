/**
 * Utility functions for pagination system
 * Handles query building, filtering, and data transformation
 *
 * @module server/pagination
 */

import { createTranslator } from 'next-intl'
import {
  buildPrismaOrderBy,
  buildPrismaOrderByMulti,
  resolveSortPath,
} from '../prisma-helpers'
import type { SortField } from '../../types/pagination'
import type {
  FilterFieldConfig,
  FilterFieldType,
  FilterValue,
  SearchCondition,
} from './types'
import { DEFAULT_LOCALE, type TelamonjsLocale } from '../../i18n/locales'
import { telamonjsMessages } from '../../i18n/messages'

import type {
  PrismaWhereClause,
  FilterOption,
  PrismaIncludeClause,
  PrismaClient,
} from './types'

/**
 * Build search conditions for global search
 */
export function buildSearchConditions(
  search: string,
  searchFields: string[],
  mode: 'insensitive' | 'default' = 'insensitive'
): SearchCondition | undefined {
  if (!search || searchFields.length === 0) {
    return undefined
  }

  return {
    OR: searchFields.map(field => {
      // Handle nested fields (e.g., 'cliente.nome')
      const parts = field.split('.')
      if (parts.length > 1) {
        return parts.reduceRight<PrismaWhereClause>((acc, part, index) => {
          if (index === parts.length - 1) {
            return { [part]: { contains: search, mode } }
          }
          return { [part]: acc }
        }, {})
      }

      // Simple field
      return { [field]: { contains: search, mode } }
    }),
  }
}

/**
 * Parse filter configuration
 */
function parseFilterConfig(
  config: FilterFieldType | FilterFieldConfig
): FilterFieldConfig {
  if (typeof config === 'string') {
    // Simple type string, create default config
    return {
      type: config,
      operator: config === 'string' ? 'contains' : 'equals',
      mode: config === 'string' ? 'insensitive' : 'default',
    }
  }

  // Already a config object
  return {
    operator:
      config.type === 'string' && !config.operator
        ? 'contains'
        : config.operator || 'equals',
    mode:
      config.type === 'string' && !config.mode
        ? 'insensitive'
        : config.mode || 'default',
    ...config,
  }
}

/**
 * Build filter conditions from filter params
 */
export function buildFilterConditions(
  filters: Record<string, FilterValue> | undefined,
  filterConfig: Record<string, FilterFieldType | FilterFieldConfig> | undefined
): PrismaWhereClause[] {
  if (!filters || !filterConfig) {
    return []
  }

  const conditions: PrismaWhereClause[] = []

  for (const [key, value] of Object.entries(filters)) {
    // Skip undefined/null values
    if (value === undefined || value === null || value === '') {
      continue
    }

    const config = filterConfig[key]
    if (!config) {
      continue // Skip unknown filters
    }

    const parsedConfig = parseFilterConfig(config)
    const fieldName = parsedConfig.field || key
    const transformedValue = parsedConfig.transform
      ? parsedConfig.transform(value)
      : value

    // Build condition based on operator
    const condition: PrismaWhereClause = {}

    switch (parsedConfig.operator) {
      case 'contains':
        condition[fieldName] = {
          contains: transformedValue,
          ...(parsedConfig.mode === 'insensitive' && { mode: 'insensitive' }),
        }
        break

      case 'equals':
        // Handle boolean conversion
        if (parsedConfig.type === 'boolean') {
          condition[fieldName] =
            transformedValue === 'true' || transformedValue === true
        } else {
          condition[fieldName] = transformedValue
        }
        break

      case 'in':
        condition[fieldName] = {
          in: Array.isArray(transformedValue)
            ? transformedValue
            : [transformedValue],
        }
        break

      case 'not':
        condition[fieldName] = { not: transformedValue }
        break

      case 'gte':
        condition[fieldName] = { gte: transformedValue }
        break

      case 'lte':
        condition[fieldName] = { lte: transformedValue }
        break

      default:
        condition[fieldName] = transformedValue
    }

    conditions.push(condition)
  }

  return conditions
}

/**
 * Build complete where clause combining all conditions
 */
export function buildWhereClause(
  searchConditions: SearchCondition | undefined,
  filterConditions: PrismaWhereClause[],
  baseWhere?: PrismaWhereClause,
  visibilityWhere?: PrismaWhereClause
): PrismaWhereClause {
  const conditions: PrismaWhereClause[] = []

  // Add search conditions
  if (searchConditions) {
    conditions.push(searchConditions)
  }

  // Add filter conditions
  conditions.push(...filterConditions)

  // Compose, never spread: spreading lets baseWhere/visibility overwrite a
  // search AND or a shared key, and silently drops a scope rule.
  const parts = [
    conditions.length > 0 ? { AND: conditions } : undefined,
    baseWhere,
    visibilityWhere,
  ].filter(
    (part): part is PrismaWhereClause => !!part && Object.keys(part).length > 0
  )

  // A single part keeps the pre-1.0.4 shape (e.g. `{ AND: [search, ...filters] }`)
  if (parts.length === 0) return {}
  return parts.length === 1 ? parts[0] : { AND: parts }
}

const isSortOrder = (value: unknown): value is 'asc' | 'desc' =>
  value === 'asc' || value === 'desc'

/**
 * Sanitize a client-supplied sort: an invalid direction becomes the default
 * one, and with `sortableFields` set, fields outside it are dropped (an empty
 * result falls back to the default sort). A field passes when it is listed
 * as sent or, for a legacy TanStack id (`customer_name`), when its dotted
 * form (`customer.name`) is listed; the returned field is the listed form.
 */
export function resolveSort(
  sortBy: string | string[] | SortField[],
  sortOrder: unknown,
  defaults: {
    defaultOrderBy: string | string[]
    defaultOrderDirection: 'asc' | 'desc'
    sortableFields?: string[]
  }
): { sortBy: string | string[] | SortField[]; sortOrder: 'asc' | 'desc' } {
  const { defaultOrderBy, defaultOrderDirection, sortableFields } = defaults
  const fallback = { sortBy: defaultOrderBy, sortOrder: defaultOrderDirection }
  const resolve = (field: string) =>
    sortableFields ? resolveSortPath(field, sortableFields) : field
  const allowed = (field: string) =>
    !sortableFields || sortableFields.includes(resolve(field))
  const order = isSortOrder(sortOrder) ? sortOrder : defaultOrderDirection

  // The configured default is trusted; everything else came from the client
  if (sortBy === defaultOrderBy) return { sortBy, sortOrder: order }

  if (typeof sortBy === 'string') {
    return allowed(sortBy)
      ? { sortBy: resolve(sortBy), sortOrder: order }
      : fallback
  }

  const fields = (sortBy as unknown[])
    .filter(
      (s): s is SortField =>
        !!s &&
        typeof s === 'object' &&
        typeof (s as SortField).field === 'string' &&
        allowed((s as SortField).field)
    )
    .map(s => ({
      field: resolve(s.field),
      order: isSortOrder(s.order) ? s.order : defaultOrderDirection,
    }))
  return fields.length > 0 ? { sortBy: fields, sortOrder: order } : fallback
}

/**
 * Build orderBy clause from sortBy and sortOrder (`sortableFields`: see
 * `buildPrismaOrderBy`)
 */
export function buildOrderByClause(
  sortBy?: string | string[] | SortField[],
  sortOrder?: string,
  sortableFields?: readonly string[]
): PrismaWhereClause | PrismaWhereClause[] | undefined {
  if (!sortBy) {
    return undefined
  }

  if (Array.isArray(sortBy)) {
    return buildPrismaOrderByMulti(sortBy as SortField[], sortableFields)
  }

  return buildPrismaOrderBy(
    sortBy as string,
    (sortOrder || 'asc') as 'asc' | 'desc',
    sortableFields
  )
}

/**
 * Get unique values for filter options with counts
 * Requires prisma client to be passed as parameter
 */
export async function getFilterOptionsForField(
  prismaClient: PrismaClient,
  modelName: string,
  field: string,
  baseWhere?: PrismaWhereClause,
  visibilityWhere?: PrismaWhereClause,
  locale: TelamonjsLocale = DEFAULT_LOCALE
): Promise<FilterOption[]> {
  const t = createTranslator({
    locale,
    messages: telamonjsMessages[locale],
    namespace: 'telamonjs.business.pagination',
  })
  const model = prismaClient[modelName] as Record<string, unknown> | undefined

  if (!model || typeof model !== 'object') {
    throw new Error(`Model ${modelName} not found in Prisma client`)
  }

  // Combine where conditions
  const where = buildWhereClause(undefined, [], baseWhere, visibilityWhere)

  // Get all records with just the field we need
  const findMany = (model as Record<string, unknown>).findMany as
    ((args: unknown) => Promise<Record<string, unknown>[]>) | undefined

  if (!findMany) {
    throw new Error(`Model ${modelName} does not support findMany operation`)
  }

  const records = await findMany({
    where,
    select: {
      [field]: true,
    },
  })

  // Count unique values
  const valueMap = new Map<string, number>()

  for (const record of records) {
    const value = record[field]

    if (value !== null && value !== undefined && value !== '') {
      const stringValue = String(value)
      valueMap.set(stringValue, (valueMap.get(stringValue) || 0) + 1)
    }
  }

  // Convert to array and sort
  const options: FilterOption[] = Array.from(valueMap.entries()).map(
    ([value, count]) => ({
      value,
      label:
        value === 'true'
          ? t('active')
          : value === 'false'
            ? t('inactive')
            : value,
      count,
    })
  )

  // Sort alphabetically by label
  options.sort((a, b) => a.label.localeCompare(b.label))

  return options
}

/**
 * Build include/select clause with counts
 */
export function buildIncludeClause(
  include?: PrismaIncludeClause,
  counts?: string[]
): PrismaIncludeClause | undefined {
  const includeClause: PrismaIncludeClause = include || {}

  // Add count fields
  if (counts && counts.length > 0) {
    includeClause._count = {
      select: counts.reduce<Record<string, boolean>>((acc, field) => {
        acc[field] = true
        return acc
      }, {}),
    }
  }

  return Object.keys(includeClause).length > 0 ? includeClause : undefined
}

/**
 * Validate and sanitize page parameters
 */
export function sanitizePaginationParams(params: {
  page?: number
  pageSize?: number
  maxPageSize?: number
  defaultPageSize?: number
}) {
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
