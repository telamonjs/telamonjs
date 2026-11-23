import { describe, it, expect } from 'vitest'
import { buildSearchConditions, buildWhereClause } from './utils'

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
    expect(buildWhereClause(search, [], {}, {})).toEqual({
      AND: [{ AND: [search] }],
    })
  })
})
