import { describe, it, expect } from 'vitest'
import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext
} from '@nestjs/common'
import type { Reflector } from '@nestjs/core'
import {
  createPermissionsGuard,
  type PermissionDeniedContext,
  type PermissionsGuardOptions
} from './permissions.guard'
import { Reflector as RealReflector } from '@nestjs/core'
import {
  IS_PUBLIC_KEY,
  PERMISSIONS_KEY,
  Permissions,
  Public,
  RequirePermission
} from './permissions.decorator'
import type { PermissionClause, UserWithPermissions } from '../types'

function ctx(
  user?: UserWithPermissions,
  request: Record<string, unknown> = { user }
): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request })
  } as unknown as ExecutionContext
}

function guardWith(
  clauses: PermissionClause[] | undefined,
  options?: PermissionsGuardOptions,
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
  })

  describe('empty permission metadata', () => {
    it('denies (403) an empty clause list, even without failClosed', () => {
      expect(() => guardWith([]).canActivate(ctx(gestor))).toThrowError(
        new ForbiddenException('Insufficient permissions')
      )
    })

    it('denies (403) an empty list for a bypass role too', () => {
      expect(() => guardWith([]).canActivate(ctx(superadmin))).toThrow(
        ForbiddenException
      )
      expect(() => guardWith([[]]).canActivate(ctx(superadmin))).toThrow(
        ForbiddenException
      )
    })

    it('denies (403) an empty list on a @Public() route', () => {
      expect(() =>
        guardWith([], { failClosed: true }, true).canActivate(ctx())
      ).toThrow(ForbiddenException)
    })
  })

  describe('@Permissions() decorator', () => {
    it('throws at decoration time when given no clause', () => {
      expect(() => Permissions()).toThrow(/at least one permission/)
      expect(() => RequirePermission()).toThrow(/at least one permission/)
    })

    it('throws at decoration time when an AND clause is empty', () => {
      expect(() => Permissions([])).toThrow(/empty/)
      expect(() => Permissions('a.read', [])).toThrow(/empty/)
    })

    it('still declares non-empty clauses', () => {
      class Controller {
        @Permissions('a.read', ['b.read', 'b.write'])
        handler() {}
      }
      expect(
        new RealReflector().get(PERMISSIONS_KEY, Controller.prototype.handler)
      ).toEqual(['a.read', ['b.read', 'b.write']])
    })
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

  describe('createException (linked package)', () => {
    // Stands in for the host's own HttpException subclasses
    class HostException extends Error {
      constructor(
        readonly status: number,
        message: string
      ) {
        super(message)
      }
    }
    const createException = (status: 401 | 403, message: string) =>
      new HostException(status, message)

    it('403 (insufficient permissions) uses the host exception', () => {
      expect(() =>
        guardWith(['usuarios.write'], { createException }).canActivate(
          ctx(semPermissao)
        )
      ).toThrowError(new HostException(403, 'Insufficient permissions'))
    })

    it('403 (failClosed, no decorator) uses the host exception', () => {
      expect(() =>
        guardWith(undefined, { failClosed: true, createException }).canActivate(
          ctx(gestor)
        )
      ).toThrow(HostException)
    })

    it('401 (no user) uses the host exception', () => {
      let thrown: unknown
      try {
        guardWith(['usuarios.write'], { createException }).canActivate(ctx())
      } catch (e) {
        thrown = e
      }
      expect(thrown).toBeInstanceOf(HostException)
      expect(thrown).toMatchObject({
        status: 401,
        message: 'User not authenticated'
      })
    })
  })

  describe('onDenied', () => {
    function recorder() {
      const calls: PermissionDeniedContext[] = []
      return { calls, onDenied: (c: PermissionDeniedContext) => calls.push(c) }
    }

    it('is called before the 403 with user, required clauses and request', () => {
      const { calls, onDenied } = recorder()
      const request = { user: semPermissao, url: '/admin' }
      const clauses: PermissionClause[] = ['usuarios.write', ['a', 'b']]
      expect(() =>
        guardWith(clauses, { onDenied }).canActivate(ctx(semPermissao, request))
      ).toThrowError(new ForbiddenException('Insufficient permissions'))
      expect(calls).toEqual([
        { user: semPermissao, required: clauses, request }
      ])
    })

    it('is called on a failClosed denial with required = []', () => {
      const { calls, onDenied } = recorder()
      expect(() =>
        guardWith(undefined, { failClosed: true, onDenied }).canActivate(
          ctx(gestor)
        )
      ).toThrow(ForbiddenException)
      expect(calls).toHaveLength(1)
      expect(calls[0]?.required).toEqual([])
      expect(calls[0]?.user).toBe(gestor)
    })

    it('is not called when access is allowed, nor on a 401', () => {
      const { calls, onDenied } = recorder()
      expect(
        guardWith(['processos.read'], { onDenied }).canActivate(ctx(gestor))
      ).toBe(true)
      expect(
        guardWith(['x'], { onDenied }).canActivate(ctx(superadmin))
      ).toBe(true)
      expect(() =>
        guardWith(['x'], { onDenied }).canActivate(ctx())
      ).toThrow(UnauthorizedException)
      expect(calls).toHaveLength(0)
    })
  })
})
