import type { SortField } from './contract.js'

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
 * @example
 * resolveSortPath('customer.name')                 // 'customer.name'
 * resolveSortPath('customer_name')                 // 'customer.name'
 * resolveSortPath('created_at', ['created_at'])    // 'created_at'
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

const isSortOrder = (value: unknown): value is 'asc' | 'desc' =>
  value === 'asc' || value === 'desc'

/**
 * Sanitizes a client-supplied sort: an invalid direction becomes the default
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
    sortableFields?: readonly string[]
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
