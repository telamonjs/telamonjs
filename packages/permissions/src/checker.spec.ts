import { describe, it, expect } from 'vitest'
import { createPermissionChecker } from './checker'
import type { UserWithPermissions } from './types'

const checker = createPermissionChecker({ bypassRoles: ['superadmin'] })

const superadmin: UserWithPermissions = {
  id: 'u1',
  roles: [{ id: 'r1', code: 'superadmin' }],
  permissions: []
}
const gestor: UserWithPermissions = {
  id: 'u2',
  roles: [{ id: 'r2', code: 'gestor' }],
  permissions: ['processos.read', 'processos.write']
}
const singularAdmin: UserWithPermissions = {
  id: 'u3',
  role: { id: 'r3', code: 'superadmin' },
  permissions: []
}

describe('createPermissionChecker', () => {
  it('can: denies without user or without id', () => {
    expect(checker.can(null, 'x.read')).toBe(false)
    expect(checker.can(undefined, 'x.read')).toBe(false)
    expect(checker.can({ id: '' }, 'x.read')).toBe(false)
  })

  it('can: bypass via roles[] and via singular role (fallback)', () => {
    expect(checker.can(superadmin, 'qualquer.coisa')).toBe(true)
    expect(checker.can(singularAdmin, 'qualquer.coisa')).toBe(true)
  })

  it('can: roles[] present ignores singular role', () => {
    const user: UserWithPermissions = {
      id: 'u4',
      role: { id: 'r', code: 'superadmin' },
      roles: [{ id: 'r5', code: 'agente' }],
      permissions: []
    }
    expect(checker.can(user, 'x.read')).toBe(false)
  })

  it('can: permission present/absent in the JWT array', () => {
    expect(checker.can(gestor, 'processos.read')).toBe(true)
    expect(checker.can(gestor, 'usuarios.write')).toBe(false)
  })

  it('canAny (OR) and canAll (AND)', () => {
    expect(checker.canAny(gestor, ['usuarios.write', 'processos.read'])).toBe(true)
    expect(checker.canAny(gestor, ['usuarios.write', 'usuarios.read'])).toBe(false)
    expect(checker.canAll(gestor, ['processos.read', 'processos.write'])).toBe(true)
    expect(checker.canAll(gestor, ['processos.read', 'usuarios.write'])).toBe(false)
  })

  it('canAny/canAll: an empty list denies, bypass roles included', () => {
    expect(checker.canAll(gestor, [])).toBe(false)
    expect(checker.canAny(gestor, [])).toBe(false)
    expect(checker.canAll(superadmin, [])).toBe(false)
    expect(checker.canAny(superadmin, [])).toBe(false)
    expect(checker.canAll(singularAdmin, [])).toBe(false)
  })

  it('custom bypassRoles', () => {
    const c = createPermissionChecker({ bypassRoles: ['superadmin', 'admin'] })
    const admin: UserWithPermissions = {
      id: 'u5',
      roles: [{ id: 'r6', code: 'admin' }],
      permissions: []
    }
    expect(c.can(admin, 'x.read')).toBe(true)
    expect(checker.can(admin, 'x.read')).toBe(false)
  })

  describe('rolePermissions (static role map)', () => {
    const c = createPermissionChecker({
      bypassRoles: ['superadmin'],
      rolePermissions: {
        teacher: ['classes.read', 'grades.write'],
        student: ['portal.access']
      }
    })

    it('grants the permissions of the user role, merged with the JWT array', () => {
      const user: UserWithPermissions = {
        id: 'u7',
        roles: [{ id: 'r', code: 'teacher' }],
        permissions: ['reports.read']
      }
      expect(c.can(user, 'grades.write')).toBe(true)
      expect(c.can(user, 'reports.read')).toBe(true)
      expect(c.can(user, 'portal.access')).toBe(false)
      expect(c.canAll(user, ['classes.read', 'reports.read'])).toBe(true)
      expect(c.canAny(user, ['portal.access', 'classes.read'])).toBe(true)
    })

    it('every role in roles[] counts; the singular role is the fallback', () => {
      const multi: UserWithPermissions = {
        id: 'u8',
        roles: [
          { id: 'r1', code: 'teacher' },
          { id: 'r2', code: 'student' }
        ]
      }
      expect(c.canAll(multi, ['grades.write', 'portal.access'])).toBe(true)
      expect(c.can({ id: 'u9', role: { id: 'r', code: 'student' } }, 'portal.access')).toBe(true)
      expect(
        c.can(
          { id: 'u9', role: { id: 'r', code: 'student' }, roles: [{ id: 'r', code: 'teacher' }] },
          'portal.access'
        )
      ).toBe(false)
    })

    it('unknown role, no user id or an empty list still deny', () => {
      expect(c.can({ id: 'u10', roles: [{ id: 'r', code: 'guest' }] }, 'classes.read')).toBe(false)
      expect(c.can({ id: '', roles: [{ id: 'r', code: 'teacher' }] }, 'classes.read')).toBe(false)
      expect(c.canAny({ id: 'u11', roles: [{ id: 'r', code: 'teacher' }] }, [])).toBe(false)
    })
  })

  describe('wildcard', () => {
    const c = createPermissionChecker({ bypassRoles: [], wildcard: '*' })
    const root: UserWithPermissions = { id: 'u12', permissions: ['*'] }

    it('a permission equal to the wildcard grants everything', () => {
      expect(c.can(root, 'anything.at.all')).toBe(true)
      expect(c.canAll(root, ['a.read', 'b.write'])).toBe(true)
      expect(c.canAny(root, ['a.read'])).toBe(true)
    })

    it('an empty list still denies; without the option "*" is an ordinary code', () => {
      expect(c.canAll(root, [])).toBe(false)
      expect(c.canAny(root, [])).toBe(false)
      expect(checker.can(root, 'anything')).toBe(false)
    })

    it('works through rolePermissions too', () => {
      const r = createPermissionChecker({
        bypassRoles: [],
        wildcard: '*',
        rolePermissions: { owner: ['*'] }
      })
      expect(r.can({ id: 'u13', roles: [{ id: 'r', code: 'owner' }] }, 'x.delete')).toBe(true)
    })
  })

  it('cross-package contract: AuthUser (telamonjs-auth shape) satisfies UserWithPermissions', () => {
    // Structural mirror of AuthUser from @telamonjs/auth — if the shape
    // drifts from UserWithPermissions, this block stops compiling.
    const authUserShape = {
      id: 'u6',
      email: 'a@b.c',
      role: { id: 'r', code: 'agente', name: 'Agente' },
      roles: [{ id: 'r', code: 'agente', name: 'Agente' }],
      permissions: ['x.read'],
      sessionId: 's1',
      isImpersonating: false
    } satisfies UserWithPermissions & Record<string, unknown>
    expect(checker.can(authUserShape, 'x.read')).toBe(true)
  })
})
