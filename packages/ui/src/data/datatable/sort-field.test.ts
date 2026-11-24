import { describe, it, expect } from 'vitest'
import type { ColumnDef } from '@tanstack/react-table'
import { resolveSortColumnId, toSortParam } from './sort-field'

type Row = Record<string, unknown>

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'customer.name', header: 'Customer' },
  { accessorKey: '_count.items', header: 'Items' },
  { accessorKey: 'created_at', header: 'Created' },
  { accessorKey: 'owner.name', id: 'owner', header: 'Owner' },
  { id: 'total', accessorFn: row => row.total, header: 'Total' },
]

describe('resolveSortColumnId', () => {
  it('resolves a data path to the TanStack column id', () => {
    expect(resolveSortColumnId('customer.name', columns)).toBe('customer_name')
    expect(resolveSortColumnId('_count.items', columns)).toBe('_count_items')
    expect(resolveSortColumnId('owner.name', columns)).toBe('owner')
  })

  it('keeps resolving a legacy column id', () => {
    expect(resolveSortColumnId('customer_name', columns)).toBe('customer_name')
    expect(resolveSortColumnId('owner', columns)).toBe('owner')
    expect(resolveSortColumnId('created_at', columns)).toBe('created_at')
  })

  it('returns an unknown field as-is', () => {
    expect(resolveSortColumnId('missing.field', columns)).toBe('missing.field')
  })
})

describe('toSortParam', () => {
  const stored = [
    { field: 'customer_name', order: 'asc' as const },
    { field: '_count_items', order: 'desc' as const },
    { field: 'owner', order: 'asc' as const },
    { field: 'total', order: 'desc' as const },
    { field: 'created_at', order: 'asc' as const },
  ]

  it("'id' (default) sends the stored fields unchanged", () => {
    expect(toSortParam(stored, columns)).toBe(stored)
    expect(toSortParam(stored, columns, 'id')).toBe(stored)
  })

  it("'path' sends the accessorKey, or the id of a column without one", () => {
    expect(toSortParam(stored, columns, 'path').map(s => s.field)).toEqual([
      'customer.name',
      '_count.items',
      'owner.name',
      'total',
      'created_at',
    ])
  })

  it("'path' accepts a stored data path and an unknown field", () => {
    expect(
      toSortParam(
        [
          { field: 'customer.name', order: 'asc' },
          { field: 'gone', order: 'asc' },
        ],
        columns,
        'path'
      ).map(s => s.field)
    ).toEqual(['customer.name', 'gone'])
  })
})
