import { describe, it, expect } from 'vitest'
import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext
} from '@nestjs/common'
import type { Reflector } from '@nestjs/core'
import { createPermissionsGuard } from './permissions.guard'
import { Reflector as RealReflector } from '@nestjs/core'
import { IS_PUBLIC_KEY, PERMISSIONS_KEY, Public } from './permissions.decorator'
import type { PermissionClause, UserWithPermissions } from '../types'

function ctx(user?: UserWithPermissions): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) })
  } as unknown as ExecutionContext
}

function guardWith(
  clauses: PermissionClause[] | undefined,
  options?: { bypassRoles?: readonly string[]; failClosed?: boolean },
  isPublic?: boolean
) {
  const Guard = createPermissionsGuard(options)
  const metadata: Record<string, unknown> = {
    [PERMISSIONS_KEY]: clauses,
    [IS_PUBLIC_KEY]: isPublic
  }
  const reflector = {
    getAllAndOverride: (key: string) => metadata[key]
  } as unknown as Reflector
  return new Guard(reflector)
}

const superadmin: UserWithPermissions = {
  id: 'u1',
  roles: [{ id: 'r1', code: 'superadmin' }],
  permissions: []
}
const gestor: UserWithPermissions = {
  id: 'u2',
  roles: [{ id: 'r2', code: 'gestor' }],
  permissions: ['processos.read']
}
const semPermissao: UserWithPermissions = {
  id: 'u3',
  roles: [{ id: 'r3', code: 'agente' }],
  permissions: []
}

describe('createPermissionsGuard', () => {
  // ported from a consumer app's guard
  it('allows when the handler requires no permission', () => {
    expect(guardWith(undefined).canActivate(ctx())).toBe(true)
    expect(guardWith([]).canActivate(ctx())).toBe(true)
  })

  it('allows a bypass role even without the permission in the list', () => {
    expect(guardWith(['usuarios.write']).canActivate(ctx(superadmin))).toBe(true)
  })

  it('bypass via singular role (fallback)', () => {
    const singular: UserWithPermissions = {
      id: 'u4',
      role: { id: 'r', code: 'superadmin' },
      permissions: []
    }
    expect(guardWith(['usuarios.write']).canActivate(ctx(singular))).toBe(true)
  })

  it('allows when the user has the required permission', () => {
    expect(guardWith(['processos.read']).canActivate(ctx(gestor))).toBe(true)
  })

  it('denies (403) with a generic message that does not leak the required codes', () => {
    expect(() =>
      guardWith(['usuarios.write']).canActivate(ctx(semPermissao))
    ).toThrowError(new ForbiddenException('Insufficient permissions'))
  })

  it('denies (401) when there is no user on the request', () => {
    expect(() => guardWith(['usuarios.write']).canActivate(ctx(undefined))).toThrow(
      UnauthorizedException
    )
  })

  describe('failClosed', () => {
    it('denies (403) a route without @Permissions', () => {
      expect(() =>
        guardWith(undefined, { failClosed: true }).canActivate(ctx(gestor))
      ).toThrow(ForbiddenException)
      expect(() =>
        guardWith([], { failClosed: true }).canActivate(ctx(gestor))
      ).toThrow(ForbiddenException)
    })

    it('allows a route without @Permissions when it is marked public', () => {
      expect(
        guardWith(undefined, { failClosed: true }, true).canActivate(ctx())
      ).toBe(true)
    })

    it('still checks @Permissions normally', () => {
      const g = guardWith(['processos.read'], { failClosed: true })
      expect(g.canActivate(ctx(gestor))).toBe(true)
      expect(() => g.canActivate(ctx(semPermissao))).toThrow(ForbiddenException)
    })

    it('Public() uses the same metadata key as @telamonjs/auth Public()', () => {
      expect(IS_PUBLIC_KEY).toBe('isPublic')
      @Public()
      class Controller {}
      expect(new RealReflector().get(IS_PUBLIC_KEY, Controller)).toBe(true)
    })
  })

  // OR semantics between string clauses (dominant pattern in consumers)
  it('string clauses are OR: one is enough', () => {
    const g = guardWith(['usuarios.write', 'processos.read'])
    expect(g.canActivate(ctx(gestor))).toBe(true)
  })

  // ported from a consumer app: array = AND
  it('array clause requires ALL permissions (AND)', () => {
    const both: UserWithPermissions = {
      id: 'u5',
      permissions: ['users.read', 'users.write']
    }
    const onlyRead: UserWithPermissions = { id: 'u6', permissions: ['users.read'] }
    const g = guardWith([['users.read', 'users.write']])
    expect(g.canActivate(ctx(both))).toBe(true)
    expect(() => g.canActivate(ctx(onlyRead))).toThrow(ForbiddenException)
  })

  it('OR of ANDs: [[a,b], c] allows with c alone or with a+b', () => {
    const g = guardWith([['users.read', 'users.write'], 'admin.access'])
    expect(g.canActivate(ctx({ id: 'u7', permissions: ['admin.access'] }))).toBe(true)
    expect(
      g.canActivate(ctx({ id: 'u8', permissions: ['users.read', 'users.write'] }))
    ).toBe(true)
    expect(() =>
      g.canActivate(ctx({ id: 'u9', permissions: ['users.read'] }))
    ).toThrow(ForbiddenException)
  })

  it('custom bypassRoles', () => {
    const admin: UserWithPermissions = {
      id: 'u10',
      roles: [{ id: 'r', code: 'admin' }],
      permissions: []
    }
    expect(
      guardWith(['x.write'], { bypassRoles: ['superadmin', 'admin'] }).canActivate(
        ctx(admin)
      )
    ).toBe(true)
    expect(() => guardWith(['x.write']).canActivate(ctx(admin))).toThrow(
      ForbiddenException
    )
  })

  it('class metadata is considered (getAllAndOverride receives handler and class)', () => {
    const Guard = createPermissionsGuard()
    const calls: unknown[] = []
    const reflector = {
      getAllAndOverride: (_key: string, targets: unknown[]) => {
        calls.push(...targets)
        return undefined
      }
    } as unknown as Reflector
    new Guard(reflector).canActivate(ctx())
    expect(calls).toHaveLength(2)
  })
})
