import { describe, it, expect, vi } from 'vitest'
import {
  buildFilterConditions,
  buildIncludeClause,
  buildSearchConditions,
  buildWhereClause,
  getFilterOptionsForField,
} from './where.js'

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

describe('buildIncludeClause', () => {
  it("adds _count without mutating the caller's include", () => {
    const include = { owner: true }
    const result = buildIncludeClause(include, ['orders'])

    expect(result).toEqual({ owner: true, _count: { select: { orders: true } } })
    expect(include).toEqual({ owner: true })
  })

  it('returns undefined when there is nothing to include', () => {
    expect(buildIncludeClause(undefined, [])).toBeUndefined()
  })
})

describe('getFilterOptionsForField', () => {
  const labels = { active: 'Active', inactive: 'Inactive' }

  it('counts distinct values with groupBy instead of loading every row', async () => {
    const findMany = vi.fn()
    const groupBy = vi.fn().mockResolvedValue([
      { state: 'SP', _count: { _all: 3 } },
      { state: 'BA', _count: { _all: 1 } },
      { state: null, _count: { _all: 2 } },
      { state: '', _count: { _all: 5 } },
    ])

    const options = await getFilterOptionsForField(
      { customer: { findMany, groupBy } },
      'customer',
      'state',
      { deletedAt: null },
      undefined,
      labels
    )

    expect(groupBy).toHaveBeenCalledWith({
      by: ['state'],
      where: { deletedAt: null },
      _count: { _all: true },
    })
    expect(findMany).not.toHaveBeenCalled()
    expect(options).toEqual([
      { value: 'BA', label: 'BA', count: 1 },
      { value: 'SP', label: 'SP', count: 3 },
    ])
  })

  it('labels boolean groups as active/inactive', async () => {
    const groupBy = vi.fn().mockResolvedValue([
      { active: false, _count: { _all: 4 } },
      { active: true, _count: { _all: 6 } },
    ])

    const options = await getFilterOptionsForField(
      { user: { groupBy } },
      'user',
      'active',
      undefined,
      undefined,
      labels
    )

    expect(options).toEqual([
      { value: 'true', label: 'Active', count: 6 },
      { value: 'false', label: 'Inactive', count: 4 },
    ])
  })
})

describe('buildFilterConditions', () => {
  it('turns a boolean filter value into a boolean', () => {
    expect(buildFilterConditions({ active: 'true' }, { active: 'boolean' })).toEqual([
      { active: true },
    ])
    expect(buildFilterConditions({ active: 'false' }, { active: 'boolean' })).toEqual([
      { active: false },
    ])
  })

  it('keeps the relation filter a boolean transform returns', () => {
    const filters = {
      hasOrders: {
        type: 'boolean' as const,
        transform: (v: unknown) => (v === 'true' ? { some: {} } : { none: {} }),
      },
    }

    expect(buildFilterConditions({ hasOrders: 'true' }, filters)).toEqual([
      { hasOrders: { some: {} } },
    ])
    expect(buildFilterConditions({ hasOrders: 'false' }, filters)).toEqual([
      { hasOrders: { none: {} } },
    ])
  })
})
