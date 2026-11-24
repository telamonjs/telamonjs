import { describe, it, expect } from 'vitest'
import { resolveSort } from './sort.js'

describe('resolveSort', () => {
  const defaults = {
    defaultOrderBy: 'name',
    defaultOrderDirection: 'asc' as const,
    sortableFields: ['customer.name', 'created_at'],
  }

  it('returns the dotted form of a legacy id whose dotted form is listed', () => {
    expect(resolveSort('customer_name', 'desc', defaults)).toEqual({
      sortBy: 'customer.name',
      sortOrder: 'desc',
    })
  })

  it('returns a listed raw value as-is', () => {
    expect(resolveSort('created_at', 'desc', defaults).sortBy).toBe(
      'created_at'
    )
    expect(resolveSort('customer.name', 'desc', defaults).sortBy).toBe(
      'customer.name'
    )
  })

  it('maps SortField entries the same way', () => {
    expect(
      resolveSort(
        [{ field: 'customer_name', order: 'asc' }],
        undefined,
        defaults
      ).sortBy
    ).toEqual([{ field: 'customer.name', order: 'asc' }])
  })

  it('rejects a value whose neither form is listed', () => {
    expect(resolveSort('customer_email', 'desc', defaults)).toEqual({
      sortBy: 'name',
      sortOrder: 'asc',
    })
  })
})
