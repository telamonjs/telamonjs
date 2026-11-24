import { describe, it, expect } from 'vitest'
import { buildSearchConditions, buildWhereClause, resolveSort } from './utils'

describe('buildWhereClause', () => {
  const search = buildSearchConditions('ana', ['name'])!

  it('returns an empty object when there are no conditions', () => {
    expect(buildWhereClause(undefined, [])).toEqual({})
  })

  it('keeps the search AND when baseWhere has its own AND', () => {
    const baseWhere = { AND: [{ tenantId: 't1' }] }

    expect(buildWhereClause(search, [], baseWhere)).toEqual({
      AND: [{ AND: [search] }, baseWhere],
    })
  })

  it('keeps every baseWhere key when visibility has a top-level OR', () => {
    const baseWhere = { deletedAt: null }
    const visibility = { OR: [{ ownerId: 'u1' }, { public: true }] }

    expect(
      buildWhereClause(search, [{ active: true }], baseWhere, visibility)
    ).toEqual({
      AND: [{ AND: [search, { active: true }] }, baseWhere, visibility],
    })
  })

  it('applies both baseWhere and visibility when they share a key', () => {
    const baseWhere = { status: 'published' }
    const visibility = { status: { in: ['draft', 'published'] } }

    expect(buildWhereClause(undefined, [], baseWhere, visibility)).toEqual({
      AND: [baseWhere, visibility],
    })
  })

  it('skips empty baseWhere and visibility objects', () => {
    // a single part keeps the previous shape, without an extra AND level
    expect(buildWhereClause(search, [], {}, {})).toEqual({ AND: [search] })
  })
})

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
