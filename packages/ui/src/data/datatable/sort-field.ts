import type { ColumnDef } from '@tanstack/react-table'

/**
 * TanStack derives a nested accessor's column id by swapping dots for
 * underscores (`customer.name` → `customer_name`). The sort field sent to the
 * server keeps the dotted accessorKey instead, so a snake_case column
 * (`created_at`) is never mistaken for a nested path. Columns with an explicit
 * `id` keep sorting by that id.
 */
export function sortFieldMapping<TData, TValue>(
  columns: ColumnDef<TData, TValue>[]
): {
  toField: (columnId: string) => string
  toColumnId: (field: string) => string
} {
  const fieldById = new Map<string, string>()
  for (const column of columns) {
    const { accessorKey, id } = column as {
      accessorKey?: unknown
      id?: unknown
    }
    if (
      id === undefined &&
      typeof accessorKey === 'string' &&
      accessorKey.includes('.')
    ) {
      fieldById.set(accessorKey.replace(/\./g, '_'), accessorKey)
    }
  }
  const idByField = new Map([...fieldById].map(([id, field]) => [field, id]))
  return {
    toField: columnId => fieldById.get(columnId) ?? columnId,
    toColumnId: field => idByField.get(field) ?? field,
  }
}
