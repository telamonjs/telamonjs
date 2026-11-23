import { describe, it, expect } from 'vitest'
import type { ColumnDef } from '@tanstack/react-table'
import { sortFieldMapping } from './sort-field'

type Row = Record<string, unknown>

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'customer.name', header: 'Customer' },
  { accessorKey: 'created_at', header: 'Created' },
  { accessorKey: 'owner.name', id: 'ownerId', header: 'Owner' },
  { id: 'actions', header: '' },
]

describe('sortFieldMapping', () => {
  const { toField, toColumnId } = sortFieldMapping(columns)

  it('maps a nested column id back to its dotted accessorKey', () => {
    expect(toField('customer_name')).toBe('customer.name')
    expect(toColumnId('customer.name')).toBe('customer_name')
  })

  it('leaves snake_case columns untouched', () => {
    expect(toField('created_at')).toBe('created_at')
    expect(toColumnId('created_at')).toBe('created_at')
  })

  it('keeps an explicit column id as the sort field', () => {
    expect(toField('ownerId')).toBe('ownerId')
    expect(toColumnId('ownerId')).toBe('ownerId')
  })
})
