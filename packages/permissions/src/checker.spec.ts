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
