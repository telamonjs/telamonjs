import type { SortField } from '../contract.js'
import { resolveSortPath } from '../sort.js'

/** A Prisma `orderBy` entry: nested objects ending in the direction. */
export type PrismaOrderBy = Record<string, unknown>

function toPrismaOrderBy(path: string, order: 'asc' | 'desc'): PrismaOrderBy {
  const keys = path.split('.')
  // Prisma orders by a relation count as `{ items: { _count: 'asc' } }`
  const i = keys.indexOf('_count')
  if (i >= 0 && i === keys.length - 2) {
    keys[i] = keys[i + 1]
    keys[i + 1] = '_count'
  }
  return keys.reduceRight<unknown>((acc, key) => ({ [key]: acc }), order) as PrismaOrderBy
}

/**
 * Converts a client `sortBy` to Prisma `orderBy`.
 *
 * Accepts the column's data path (`customer.name`, sent with
 * `list.sortParam: 'path'`) and the legacy TanStack column id (`customer_name`,
 * the default wire format). `_count.<relation>` orders by a relation count.
 * Pass the endpoint's `sortableFields` so a listed snake_case field
 * (`created_at`) is not mistaken for a legacy id.
 *
 * @example
 * buildPrismaOrderBy('customer.name', 'asc')   // { customer: { name: 'asc' } }
 * buildPrismaOrderBy('customer_name', 'asc')   // { customer: { name: 'asc' } }
 * buildPrismaOrderBy('_count.items', 'desc')   // { items: { _count: 'desc' } }
 * buildPrismaOrderBy('created_at', 'asc', ['created_at']) // { created_at: 'asc' }
 */
export function buildPrismaOrderBy(
  sortBy: string,
  sortOrder: 'asc' | 'desc' = 'desc',
  sortableFields?: readonly string[]
): PrismaOrderBy {
  return toPrismaOrderBy(resolveSortPath(sortBy, sortableFields), sortOrder)
}

/**
 * Multi-column version of {@link buildPrismaOrderBy}: one Prisma `orderBy`
 * entry per `SortField`, same field rules.
 *
 * @example
 * buildPrismaOrderByMulti([
 *   { field: 'category.name', order: 'asc' },
 *   { field: 'startsAt', order: 'desc' },
 * ])
 * // [{ category: { name: 'asc' } }, { startsAt: 'desc' }]
 */
export function buildPrismaOrderByMulti(
  sorting: SortField[],
  sortableFields?: readonly string[]
): PrismaOrderBy[] {
  return sorting.map(sort =>
    toPrismaOrderBy(resolveSortPath(sort.field, sortableFields), sort.order)
  )
}
