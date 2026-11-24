import { SortField } from '../types/pagination'

/**
 * Decodes a TanStack column id back to the dotted path it came from.
 * TanStack 8 derives the id of a dotted `accessorKey` with every `.` → `_`
 * (`customer.name` → `customer_name`, `_count.items` → `_count_items`); an
 * underscore that starts a segment belongs to the name, so `_count` survives.
 */
function decodeColumnId(id: string): string {
  let path = ''
  let segmentStart = true
  for (const ch of id) {
    if (ch === '_' && !segmentStart) {
      path += '.'
      segmentStart = true
    } else {
      path += ch
      segmentStart = false
    }
  }
  return path
}

/**
 * The dotted data path a client sort field names.
 *
 * - A value with a dot is a data path (`list.sortParam: 'path'`): used as-is.
 * - A value listed in `sortableFields` is used as-is (`created_at` stays a scalar).
 * - Otherwise an underscored value is a legacy TanStack id (`customer_name`) and is
 *   decoded — with `sortableFields`, only when the decoded path is listed.
 *
 * @internal shared by the orderBy builders and `resolveSort`
 */
export function resolveSortPath(
  field: string,
  sortableFields?: readonly string[]
): string {
  if (field.includes('.') || !field.includes('_')) return field
  if (sortableFields?.includes(field)) return field
  const decoded = decodeColumnId(field)
  return !sortableFields || sortableFields.includes(decoded) ? decoded : field
}

function toPrismaOrderBy(path: string, order: 'asc' | 'desc') {
  const keys = path.split('.')
  // Prisma orders by a relation count as `{ items: { _count: 'asc' } }`
  const i = keys.indexOf('_count')
  if (i >= 0 && i === keys.length - 2) {
    keys[i] = keys[i + 1]
    keys[i + 1] = '_count'
  }
  // `any` kept intentionally: recursive accumulator builds an arbitrarily
  // nested object; callers (buildOrderByClause) declare the real return type
  // (PrismaWhereClause), `unknown` here breaks that inferred assignability.
  return keys.reduceRight(
    (acc, key) => ({ [key]: acc }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    order as any
  )
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
) {
  return toPrismaOrderBy(resolveSortPath(sortBy, sortableFields), sortOrder)
}

/**
 * Multi-column version of {@link buildPrismaOrderBy}: one Prisma `orderBy`
 * entry per `SortField`, same field rules.
 *
 * @example
 * buildPrismaOrderByMulti([
 *   { field: 'categoria.nome', order: 'asc' },
 *   { field: 'vigenciaInicio', order: 'desc' },
 * ])
 * // [{ categoria: { nome: 'asc' } }, { vigenciaInicio: 'desc' }]
 */
export function buildPrismaOrderByMulti(
  sorting: SortField[],
  sortableFields?: readonly string[]
) {
  return sorting.map(sort =>
    toPrismaOrderBy(resolveSortPath(sort.field, sortableFields), sort.order)
  )
}
