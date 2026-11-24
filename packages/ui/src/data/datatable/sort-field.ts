import type { SortField } from '../../types/pagination'

/** Structural view of a column: TanStack's `ColumnDef` union and `CrudColumnDef` both fit */
interface SortableColumn {
  id?: string
  accessorKey?: unknown
}

const accessorKeyOf = (column: SortableColumn): string | undefined =>
  typeof column.accessorKey === 'string' ? column.accessorKey : undefined

// TanStack 8 derives the id of a dotted accessorKey with every '.' → '_'
const columnIdOf = (column: SortableColumn): string | undefined =>
  column.id ?? accessorKeyOf(column)?.replace(/\./g, '_')

// ponytail: top-level columns only; group columns (`columns: [...]`) are not
// sortable lists in this framework today — recurse here if that changes
function findColumn(
  field: string,
  columns: readonly unknown[]
): SortableColumn | undefined {
  return (columns as readonly SortableColumn[]).find(
    column => columnIdOf(column) === field || accessorKeyOf(column) === field
  )
}

/**
 * The TanStack column id a stored sort field points at. Accepts both forms:
 * the column id (`customer_name`, what a header click stores) and the data
 * path (`customer.name`, from `defaultSortBy`, a saved view or a `'path'` wire).
 * Unknown fields come back as-is.
 */
export function resolveSortColumnId(
  field: string,
  columns: readonly unknown[]
): string {
  const column = findColumn(field, columns)
  return (column && columnIdOf(column)) ?? field
}

/**
 * The stored sort as the list sends it to `query.queryFn` (`list.sortParam`).
 * `'id'` (default) sends the stored field unchanged; `'path'` sends the
 * column's `accessorKey` (dots kept), or its id when it has no accessorKey.
 */
export function toSortParam(
  sorting: SortField[],
  columns: readonly unknown[],
  mode: 'id' | 'path' = 'id'
): SortField[] {
  if (mode !== 'path') return sorting
  return sorting.map(sort => {
    const column = findColumn(sort.field, columns)
    const path = column && (accessorKeyOf(column) ?? columnIdOf(column))
    return path && path !== sort.field ? { ...sort, field: path } : sort
  })
}
