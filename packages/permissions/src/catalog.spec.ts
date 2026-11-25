import { describe, it, expect } from 'vitest'
import { diffPermissionCatalog, type PermissionRow } from './catalog'

const row = (over: Partial<PermissionRow> & { code: string }): PermissionRow => ({
  id: `id-${over.code}`,
  module: over.code.split('.')[0],
  action: over.code.split('.')[1],
  category: null,
  description: null,
  ...over
})

describe('diffPermissionCatalog', () => {
  it('creates codes missing from the database, deriving module and action', () => {
    const diff = diffPermissionCatalog(
      [{ code: 'users.read', category: 'Records', description: 'View users' }],
      []
    )
    expect(diff.toCreate).toEqual([
      {
        code: 'users.read',
        module: 'users',
        action: 'read',
        category: 'Records',
        description: 'View users'
      }
    ])
    expect(diff).toMatchObject({ toUpdate: [], toDelete: [], unchanged: [] })
  })

  it('splits at the last dot and keeps explicit module/action', () => {
    const diff = diffPermissionCatalog(
      [
        { code: 'reports.sales.export' },
        { code: 'admin', module: 'system', action: 'admin' }
      ],
      []
    )
    expect(diff.toCreate).toEqual([
      { code: 'reports.sales.export', module: 'reports.sales', action: 'export', category: null, description: null },
      { code: 'admin', module: 'system', action: 'admin', category: null, description: null }
    ])
  })

  it('updates rows whose description or category changed', () => {
    const db = [row({ code: 'users.read', category: 'Records', description: 'Old' })]
    const diff = diffPermissionCatalog(
      [{ code: 'users.read', category: 'Records', description: 'View users' }],
      db
    )
    expect(diff.toUpdate).toEqual([
      {
        id: 'id-users.read',
        code: 'users.read',
        module: 'users',
        action: 'read',
        category: 'Records',
        description: 'View users'
      }
    ])
    expect(diff.unchanged).toEqual([])
  })

  it('deletes rows that are no longer in the catalog', () => {
    const stale = row({ code: 'legacy.read' })
    const diff = diffPermissionCatalog([], [stale])
    expect(diff.toDelete).toEqual([stale])
    expect(diff.toDelete[0]).toBe(stale)
  })

  it('treats undefined and null as equal, and ignores module/action differences', () => {
    const same = row({ code: 'users.write', action: 'WRITE' })
    const diff = diffPermissionCatalog([{ code: 'users.write' }], [same])
    expect(diff.unchanged).toEqual([same])
    expect(diff.toUpdate).toEqual([])
  })

  it('clears a description the catalog no longer sets', () => {
    const diff = diffPermissionCatalog(
      [{ code: 'users.read' }],
      [row({ code: 'users.read', description: 'View users' })]
    )
    expect(diff.toUpdate).toHaveLength(1)
    expect(diff.toUpdate[0]?.description).toBeNull()
  })

  it('never mutates its inputs', () => {
    const catalog = Object.freeze([Object.freeze({ code: 'users.read' })])
    const rows = Object.freeze([Object.freeze(row({ code: 'users.read', description: 'x' }))])
    expect(() => diffPermissionCatalog(catalog, rows)).not.toThrow()
    expect(rows[0]?.description).toBe('x')
  })

  it('throws on a duplicate code in the catalog', () => {
    expect(() =>
      diffPermissionCatalog([{ code: 'users.read' }, { code: 'users.read' }], [])
    ).toThrow(/duplicate.*users\.read/i)
  })

  it('throws when module/action cannot be derived from the code', () => {
    expect(() => diffPermissionCatalog([{ code: 'users' }], [])).toThrow(/module\.action/)
    expect(() => diffPermissionCatalog([{ code: 'users.' }], [])).toThrow(/module\.action/)
  })
})
