import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
  type Type,
} from '@nestjs/common'
import { Injectable, Logger } from '@nestjs/common'
import type { Reflector } from '@nestjs/core'
import { createJwtAuthGuard } from './jwt-auth.guard'
import { staticApiKey } from './api-key.guard'
import { ALLOW_SERVICE_TOKEN_KEY } from './allow-service-token.decorator'
import { createJwtAuthGuard as createFromBarrel, type RequestLike } from './index'
import { encodeSessionToken, payloadToAuthUser } from '../jwt'
import { createImpersonationToken } from '../impersonation'
import type { AuthUser, MfJwtPayload } from '../types'

const SECRET = 'test-secret-with-at-least-32-characters!!'

const payload: MfJwtPayload = {
  id: 'u1',
  email: 'a@b.c',
  role: { id: 'r1', code: 'agente', name: 'Agente' },
  permissions: ['produtos.read'],
  jti: 'session-1',
}

interface FakeRequest {
  headers: Record<string, string | undefined>
  query?: Record<string, unknown>
  cookies?: Record<string, string | undefined>
  user?: AuthUser
}

function ctx(
  request: FakeRequest | Record<string, unknown>,
  isPublic = false
): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext
}

function guard(
  options?: Parameters<typeof createJwtAuthGuard>[0],
  isPublic = false
) {
  const Guard = createJwtAuthGuard(options)
  const reflector = {
    getAllAndOverride: () => isPublic,
  } as unknown as Reflector
  return new Guard(reflector)
}

describe('createJwtAuthGuard', () => {
  it('Bearer token in the Authorization header authenticates and attaches request.user', async () => {
    const token = await encodeSessionToken(payload, { secret: SECRET })
    const request: FakeRequest = {
      headers: { authorization: `Bearer ${token}` },
    }
    expect(await guard({ secret: SECRET }).canActivate(ctx(request))).toBe(true)
    expect(request.user?.id).toBe('u1')
    expect(request.user?.permissions).toEqual(['produtos.read'])
  })

  it('?token= (SSE) takes priority over the cookie', async () => {
    const token = await encodeSessionToken(payload, { secret: SECRET })
    const request: FakeRequest = {
      headers: {},
      query: { token },
      cookies: { 'authjs.session-token': 'token-invalido' },
    }
    expect(await guard({ secret: SECRET }).canActivate(ctx(request))).toBe(true)
  })

  it('HTTPS production: __Secure- cookie encoded with the __Secure- salt (NextAuth convention) authenticates', async () => {
    // NextAuth derives the key with salt = the cookie NAME; under
    // useSecureCookies the name (and the salt) become
    // __Secure-authjs.session-token. Regression of the 2.0.0 bug: the guard
    // decoded with the non-secure salt and 401ed production.
    const secureName = '__Secure-authjs.session-token'
    const token = await encodeSessionToken(payload, {
      secret: SECRET,
      salt: secureName,
    })
    const request: FakeRequest = {
      headers: {},
      cookies: { [secureName]: token },
    }
    expect(await guard({ secret: SECRET }).canActivate(ctx(request))).toBe(true)
    expect(request.user?.id).toBe('u1')
  })

  it('chunked cookie (name.0/name.1) is reassembled before decoding', async () => {
    const token = await encodeSessionToken(payload, { secret: SECRET })
    const cut = Math.ceil(token.length / 2)
    const request: FakeRequest = {
      headers: {},
      cookies: {
        'authjs.session-token.0': token.slice(0, cut),
        'authjs.session-token.1': token.slice(cut),
      },
    }
    expect(await guard({ secret: SECRET }).canActivate(ctx(request))).toBe(true)
  })

  it('default cookie (v5 salt) and __Secure- variant', async () => {
    const token = await encodeSessionToken(payload, { secret: SECRET })
    for (const name of [
      'authjs.session-token',
      '__Secure-authjs.session-token',
    ]) {
      const request: FakeRequest = { headers: {}, cookies: { [name]: token } }
      expect(await guard({ secret: SECRET }).canActivate(ctx(request))).toBe(
        true
      )
    }
  })

  it('custom cookieNames (legacy v4 cookie with v5 salt — real consumer app case)', async () => {
    const token = await encodeSessionToken(payload, { secret: SECRET })
    const request: FakeRequest = {
      headers: {},
      cookies: { 'next-auth.session-token': token },
    }
    const g = guard({
      secret: SECRET,
      cookieNames: [
        'next-auth.session-token',
        '__Secure-next-auth.session-token',
      ],
    })
    expect(await g.canActivate(ctx(request))).toBe(true)
    // without custom cookieNames, the legacy cookie is not read
    await expect(
      guard({ secret: SECRET }).canActivate(ctx(request))
    ).rejects.toThrow(UnauthorizedException)
  })

  it('custom salt decodes a token issued with the legacy salt', async () => {
    const salt = 'next-auth.session-token'
    const token = await encodeSessionToken(payload, { secret: SECRET, salt })
    const request: FakeRequest = {
      headers: { authorization: `Bearer ${token}` },
    }
    expect(
      await guard({ secret: SECRET, salt }).canActivate(ctx(request))
    ).toBe(true)
    await expect(
      guard({ secret: SECRET }).canActivate(ctx(request))
    ).rejects.toThrow(UnauthorizedException)
  })

  it('no token → 401; invalid token → 401 with a generic message', async () => {
    await expect(
      guard({ secret: SECRET }).canActivate(ctx({ headers: {} }))
    ).rejects.toThrow(UnauthorizedException)
    await expect(
      guard({ secret: SECRET }).canActivate(
        ctx({ headers: { authorization: 'Bearer lixo' } })
      )
    ).rejects.toThrowError(
      new UnauthorizedException('Invalid or expired token')
    )
  })

  it('@Public allows access without a token', async () => {
    expect(
      await guard({ secret: SECRET }, true).canActivate(ctx({ headers: {} }))
    ).toBe(true)
  })

  it('impersonation: request user carries originalUser', async () => {
    const token = await encodeSessionToken(
      {
        ...payload,
        impersonatedUserId: 'u1',
        originalUserId: 'admin-1',
        originalUserName: 'Admin',
        originalUserEmail: 'admin@b.c',
        originalUserRole: { id: 'r9', code: 'superadmin', name: 'SuperAdmin' },
      },
      { secret: SECRET }
    )
    const request: FakeRequest = {
      headers: { authorization: `Bearer ${token}` },
    }
    await guard({ secret: SECRET }).canActivate(ctx(request))
    expect(request.user?.isImpersonating).toBe(true)
    expect(request.user?.originalUser?.id).toBe('admin-1')
  })
})

describe('createJwtAuthGuard — impersonation revocation', () => {
  async function impersonationRequest(): Promise<FakeRequest> {
    const token = await createImpersonationToken(
      {
        target: {
          id: 'u1',
          email: 'a@b.c',
          role: { id: 'r1', code: 'agente', name: 'Agente' },
          permissions: ['produtos.read'],
        },
        actor: {
          id: 'admin-1',
          name: 'Admin',
          email: 'admin@b.c',
          role: { id: 'r9', code: 'superadmin', name: 'SuperAdmin' },
        },
        logId: 'log-1',
      },
      { secret: SECRET }
    )
    return { headers: { authorization: `Bearer ${token}` } }
  }

  it('hook true → passes, and receives the logId from the token', async () => {
    const seen: string[] = []
    const request = await impersonationRequest()
    const g = guard({
      secret: SECRET,
      isImpersonationActive: async logId => {
        seen.push(logId)
        return true
      },
    })
    expect(await g.canActivate(ctx(request))).toBe(true)
    expect(seen).toEqual(['log-1'])
    expect(request.user?.impersonationLogId).toBe('log-1')
  })

  it('hook false → 401 (impersonation ended in the app)', async () => {
    const request = await impersonationRequest()
    const g = guard({
      secret: SECRET,
      isImpersonationActive: async () => false,
    })
    await expect(g.canActivate(ctx(request))).rejects.toThrowError(
      new UnauthorizedException('Impersonation session is no longer active')
    )
    expect(request.user).toBeUndefined()
  })

  it('hook is not called on a normal request (no impersonation)', async () => {
    const token = await encodeSessionToken(payload, { secret: SECRET })
    let called = false
    const g = guard({
      secret: SECRET,
      isImpersonationActive: async () => {
        called = true
        return false
      },
    })
    const request: FakeRequest = {
      headers: { authorization: `Bearer ${token}` },
    }
    expect(await g.canActivate(ctx(request))).toBe(true)
    expect(called).toBe(false)
  })

  it('without the hook, impersonation passes as before (backwards compatibility)', async () => {
    const request = await impersonationRequest()
    expect(await guard({ secret: SECRET }).canActivate(ctx(request))).toBe(true)
    expect(request.user?.isImpersonating).toBe(true)
  })

  it('with the hook, an impersonation token without logId (legacy) is rejected', async () => {
    const token = await encodeSessionToken(
      { ...payload, impersonatedUserId: 'u1', originalUserId: 'admin-1' },
      { secret: SECRET }
    )
    const g = guard({ secret: SECRET, isImpersonationActive: async () => true })
    await expect(
      g.canActivate(ctx({ headers: { authorization: `Bearer ${token}` } }))
    ).rejects.toThrow(UnauthorizedException)
  })

  describe('irrevocable impersonation warning', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('without the hook, warns once through the Nest Logger on the first impersonation token', async () => {
      const warn = vi
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined)
      const g = guard({ secret: SECRET })
      const normal = await encodeSessionToken(payload, { secret: SECRET })

      // a normal session does not warn
      await g.canActivate(ctx({ headers: { authorization: `Bearer ${normal}` } }))
      expect(warn).not.toHaveBeenCalled()

      expect(await g.canActivate(ctx(await impersonationRequest()))).toBe(true)
      expect(await g.canActivate(ctx(await impersonationRequest()))).toBe(true)
      expect(warn).toHaveBeenCalledTimes(1)
      expect(String(warn.mock.calls[0]?.[0])).toMatch(/isImpersonationActive/)
    })

    it('with the hook, never warns', async () => {
      const warn = vi
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined)
      const g = guard({ secret: SECRET, isImpersonationActive: () => true })
      expect(await g.canActivate(ctx(await impersonationRequest()))).toBe(true)
      expect(warn).not.toHaveBeenCalled()
    })
  })
})

describe('createJwtAuthGuard — subclass hooks', () => {
  const reflector = { getAllAndOverride: () => false } as unknown as Reflector

  interface AppUser {
    id: string
    source: string
  }

  it('resolveUser override replaces request.user and receives the payload', async () => {
    const seen: MfJwtPayload[] = []
    class AppGuard extends createJwtAuthGuard<AppUser>({ secret: SECRET }) {
      constructor(
        r: Reflector,
        private readonly source: string
      ) {
        super(r)
      }
      protected override async resolveUser(
        p: MfJwtPayload,
        _context: ExecutionContext
      ): Promise<AppUser | null> {
        seen.push(p)
        return { id: p.id, source: this.source }
      }
    }
    const token = await encodeSessionToken(payload, { secret: SECRET })
    const request: { headers: Record<string, string>; user?: unknown } = {
      headers: { authorization: `Bearer ${token}` },
    }
    expect(
      await new AppGuard(reflector, 'db').canActivate(ctx(request))
    ).toBe(true)
    expect(request.user).toEqual({ id: 'u1', source: 'db' })
    expect(seen[0]?.permissions).toEqual(['produtos.read'])
  })

  it('resolveUser returning null → 401 and no request.user', async () => {
    class AppGuard extends createJwtAuthGuard({ secret: SECRET }) {
      protected override resolveUser(): null {
        return null
      }
    }
    const token = await encodeSessionToken(payload, { secret: SECRET })
    const request: FakeRequest = {
      headers: { authorization: `Bearer ${token}` },
    }
    await expect(
      new AppGuard(reflector).canActivate(ctx(request))
    ).rejects.toThrowError(
      new UnauthorizedException('Session is no longer valid')
    )
    expect(request.user).toBeUndefined()
  })

  it('errors thrown by resolveUser propagate unchanged (not masked as an invalid token)', async () => {
    const boom = new Error('db down')
    class AppGuard extends createJwtAuthGuard({ secret: SECRET }) {
      protected override resolveUser(): never {
        throw boom
      }
    }
    const token = await encodeSessionToken(payload, { secret: SECRET })
    await expect(
      new AppGuard(reflector).canActivate(
        ctx({ headers: { authorization: `Bearer ${token}` } })
      )
    ).rejects.toBe(boom)
  })

  it('runs after the impersonation check: a revoked impersonation is 401 before resolveUser', async () => {
    let called = false
    class AppGuard extends createJwtAuthGuard({
      secret: SECRET,
      isImpersonationActive: () => false,
    }) {
      protected override resolveUser(p: MfJwtPayload): AuthUser {
        called = true
        return payloadToAuthUser(p)
      }
    }
    const token = await encodeSessionToken(
      {
        ...payload,
        impersonatedUserId: 'u1',
        impersonationLogId: 'log-1',
        originalUserId: 'admin-1',
      },
      { secret: SECRET }
    )
    await expect(
      new AppGuard(reflector).canActivate(
        ctx({ headers: { authorization: `Bearer ${token}` } })
      )
    ).rejects.toThrowError(
      new UnauthorizedException('Impersonation session is no longer active')
    )
    expect(called).toBe(false)
  })

  it('allowQueryToken=false ignores ?token= but the cookie still authenticates', async () => {
    const seen: (string | undefined)[] = []
    class NoQueryGuard extends createJwtAuthGuard({ secret: SECRET }) {
      protected override allowQueryToken(request: { path?: string }): boolean {
        seen.push(request.path)
        return false
      }
    }
    const token = await encodeSessionToken(payload, { secret: SECRET })
    const g = new NoQueryGuard(reflector)

    await expect(
      g.canActivate(ctx({ headers: {}, path: '/v1/x', query: { token } }))
    ).rejects.toThrow(UnauthorizedException)
    expect(seen).toEqual(['/v1/x'])

    const request: FakeRequest = {
      headers: {},
      query: { token },
      cookies: { 'authjs.session-token': token },
    }
    expect(await g.canActivate(ctx(request))).toBe(true)
    expect(request.user?.id).toBe('u1')
  })

  it('the default factory keeps working as a plain Type<CanActivate>', async () => {
    const Guard: Type<CanActivate> = createJwtAuthGuard({ secret: SECRET })
    const token = await encodeSessionToken(payload, { secret: SECRET })
    const request: FakeRequest = { headers: {}, query: { token } }
    expect(await new Guard(reflector).canActivate(ctx(request))).toBe(true)
    expect(request.user).toMatchObject({
      id: 'u1',
      email: 'a@b.c',
      permissions: ['produtos.read'],
    })
  })
})

// Consumer scenario: an EXPORTED subclass in a project compiled with
// `declaration: true` (this package's tsconfig). Before JwtAuthGuardBase,
// JwtAuthGuardClass and RequestLike were exported, this declaration failed
// `pnpm type-check` with TS4094/TS4020 — keep it at module level and exported.
interface SessionUser {
  id: string
  version: number
}

class UsersStore {
  version(id: string): number | null {
    return id === 'u1' ? 7 : null
  }
}

@Injectable()
export class ConsumerAppGuard extends createFromBarrel<SessionUser>({
  secret: SECRET,
}) {
  constructor(
    reflector: Reflector,
    private readonly users: UsersStore
  ) {
    super(reflector)
  }

  protected override allowQueryToken(request: RequestLike): boolean {
    return request.path?.startsWith('/sse/') ?? false
  }

  protected override async resolveUser(
    p: MfJwtPayload
  ): Promise<SessionUser | null> {
    const version = this.users.version(p.id)
    return version === null ? null : { id: p.id, version }
  }
}

describe('createJwtAuthGuard — exported subclass (declaration: true consumer)', () => {
  const reflector = { getAllAndOverride: () => false } as unknown as Reflector
  const appGuard = () => new ConsumerAppGuard(reflector, new UsersStore())

  it('resolveUser uses the injected dependency to build request.user', async () => {
    const token = await encodeSessionToken(payload, { secret: SECRET })
    const request: Record<string, unknown> = {
      headers: { authorization: `Bearer ${token}` },
    }
    expect(await appGuard().canActivate(ctx(request))).toBe(true)
    expect(request.user).toEqual({ id: 'u1', version: 7 })
  })

  it('resolveUser returning null (unknown user) → 401', async () => {
    const token = await encodeSessionToken(
      { ...payload, id: 'gone' },
      { secret: SECRET }
    )
    await expect(
      appGuard().canActivate(
        ctx({ headers: { authorization: `Bearer ${token}` } })
      )
    ).rejects.toThrowError(
      new UnauthorizedException('Session is no longer valid')
    )
  })

  it('allowQueryToken: ?token= works only on the SSE routes', async () => {
    const token = await encodeSessionToken(payload, { secret: SECRET })
    await expect(
      appGuard().canActivate(
        ctx({ headers: {}, path: '/v1/users', query: { token } })
      )
    ).rejects.toThrow(UnauthorizedException)
    expect(
      await appGuard().canActivate(
        ctx({ headers: {}, path: '/sse/events', query: { token } })
      )
    ).toBe(true)
  })
})

describe('createJwtAuthGuard — secret resolved per request', () => {
  it('a sync function is called per request, so a value set after module load is used', async () => {
    let current: string | undefined
    const g = guard({ secret: () => current })
    current = SECRET // e.g. env loaded by Nest after the guard module was imported
    const token = await encodeSessionToken(payload, { secret: SECRET })
    const request: FakeRequest = {
      headers: { authorization: `Bearer ${token}` },
    }
    expect(await g.canActivate(ctx(request))).toBe(true)
    expect(request.user?.id).toBe('u1')

    // rotated secret: the next request decodes with the new value
    current = 'another-secret-with-at-least-32-characters'
    await expect(g.canActivate(ctx(request))).rejects.toThrowError(
      new UnauthorizedException('Invalid or expired token')
    )
  })

  it('an async function is awaited', async () => {
    const g = guard({ secret: async () => SECRET })
    const token = await encodeSessionToken(payload, { secret: SECRET })
    expect(
      await g.canActivate(ctx({ headers: { authorization: `Bearer ${token}` } }))
    ).toBe(true)
  })

  it('is resolved once per request, not once per candidate/salt', async () => {
    let calls = 0
    const g = guard({
      secret: () => {
        calls++
        return SECRET
      },
    })
    const token = await encodeSessionToken(payload, { secret: SECRET })
    // two invalid candidates before the valid cookie
    expect(
      await g.canActivate(
        ctx({
          headers: { authorization: 'Bearer lixo' },
          query: { token: 'lixo' },
          cookies: { 'authjs.session-token': token },
        })
      )
    ).toBe(true)
    expect(calls).toBe(1)
  })

  it('works through a subclass (resolveUser override)', async () => {
    const reflector = { getAllAndOverride: () => false } as unknown as Reflector
    class AppGuard extends createJwtAuthGuard({ secret: () => SECRET }) {
      protected override resolveUser(p: MfJwtPayload): AuthUser {
        return { ...payloadToAuthUser(p), name: 'from-subclass' }
      }
    }
    const token = await encodeSessionToken(payload, { secret: SECRET })
    const request: FakeRequest = {
      headers: { authorization: `Bearer ${token}` },
    }
    expect(await new AppGuard(reflector).canActivate(ctx(request))).toBe(true)
    expect(request.user?.name).toBe('from-subclass')
  })
})

describe('createJwtAuthGuard — createException (linked package)', () => {
  // Stands in for the host's own UnauthorizedException class
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
  const reflector = { getAllAndOverride: () => false } as unknown as Reflector

  it('no/invalid token → the host exception', async () => {
    const rejected = guard({ secret: SECRET, createException }).canActivate(
      ctx({ headers: {} })
    )
    await expect(rejected).rejects.toBeInstanceOf(HostException)
    await expect(rejected).rejects.toMatchObject({
      status: 401,
      message: 'Invalid or expired token',
    })
  })

  it('resolveUser → null → the host exception', async () => {
    class NullGuard extends createJwtAuthGuard({
      secret: SECRET,
      createException,
    }) {
      protected override resolveUser(): null {
        return null
      }
    }
    const token = await encodeSessionToken(payload, { secret: SECRET })
    await expect(
      new NullGuard(reflector).canActivate(
        ctx({ headers: { authorization: `Bearer ${token}` } })
      )
    ).rejects.toMatchObject({
      constructor: HostException,
      status: 401,
      message: 'Session is no longer valid',
    })
  })

  it('revoked impersonation → the host exception', async () => {
    const token = await encodeSessionToken(
      { ...payload, impersonatedUserId: 'u1', originalUserId: 'admin-1' },
      { secret: SECRET }
    )
    await expect(
      guard({
        secret: SECRET,
        createException,
        isImpersonationActive: () => true,
      }).canActivate(ctx({ headers: { authorization: `Bearer ${token}` } }))
    ).rejects.toMatchObject({
      constructor: HostException,
      status: 401,
      message: 'Impersonation session is no longer active',
    })
  })
})

describe('createJwtAuthGuard — validateUser', () => {
  const reflector = { getAllAndOverride: () => false } as unknown as Reflector
  type Verdict = boolean | string | Promise<boolean | string>
  type Check = (
    user: AuthUser,
    payload: MfJwtPayload,
    context: ExecutionContext
  ) => Verdict

  function checked(
    check: Check,
    options?: Parameters<typeof createJwtAuthGuard>[0]
  ) {
    const spy = vi.fn(check)
    class AppGuard extends createJwtAuthGuard({ secret: SECRET, ...options }) {
      protected override validateUser(
        user: AuthUser,
        p: MfJwtPayload,
        context: ExecutionContext
      ): Verdict {
        return spy(user, p, context)
      }
    }
    return { g: new AppGuard(reflector), spy }
  }

  async function bearer(extra: Partial<MfJwtPayload> = {}) {
    const token = await encodeSessionToken(
      { ...payload, ...extra },
      { secret: SECRET }
    )
    return (): FakeRequest => ({ headers: { authorization: `Bearer ${token}` } })
  }

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('true → passes; receives the resolved user, the payload and the context', async () => {
    const { g, spy } = checked(() => true)
    const request = (await bearer())()
    const context = ctx(request)
    expect(await g.canActivate(context)).toBe(true)
    expect(request.user?.id).toBe('u1')
    const [user, p, c] = spy.mock.calls[0] ?? []
    expect(user).toBe(request.user)
    expect(p?.permissions).toEqual(['produtos.read'])
    expect(c).toBe(context)
  })

  it('false → 401 with the generic message, no request.user, rejection logged', async () => {
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined)
    const { g } = checked(() => false)
    const request = (await bearer())()
    await expect(g.canActivate(ctx(request))).rejects.toThrowError(
      new UnauthorizedException('Session is no longer valid')
    )
    expect(request.user).toBeUndefined()
    expect(String(warn.mock.calls[0]?.[0])).toMatch(/u1/)
  })

  it('a reason string → 401 whose message does not leak the reason; the reason is logged', async () => {
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined)
    const { g } = checked(() => 'account suspended')
    const rejected = g.canActivate(ctx((await bearer())()))
    await expect(rejected).rejects.toThrowError(
      new UnauthorizedException('Session is no longer valid')
    )
    expect(String(warn.mock.calls[0]?.[0])).toMatch(/account suspended/)
  })

  it('a thrown error propagates unchanged (an outage is a 5xx, not a 401)', async () => {
    const boom = new Error('db down')
    const { g } = checked(() => {
      throw boom
    })
    await expect(g.canActivate(ctx((await bearer())()))).rejects.toBe(boom)
  })

  it('a rejected promise propagates too', async () => {
    const boom = new Error('timeout')
    const { g } = checked(() => Promise.reject(boom))
    await expect(g.canActivate(ctx((await bearer())()))).rejects.toBe(boom)
  })

  it('runs after resolveUser: gets its user, and is skipped when it returns null', async () => {
    const seen: unknown[] = []
    class AppGuard extends createJwtAuthGuard<{ id: string }>({
      secret: SECRET,
    }) {
      protected override resolveUser(p: MfJwtPayload): { id: string } | null {
        return p.id === 'gone' ? null : { id: `db:${p.id}` }
      }
      protected override validateUser(user: { id: string }): boolean {
        seen.push(user)
        return true
      }
    }
    const g = new AppGuard(reflector)
    expect(await g.canActivate(ctx((await bearer())()))).toBe(true)
    await expect(
      g.canActivate(ctx((await bearer({ id: 'gone' }))()))
    ).rejects.toThrow(UnauthorizedException)
    expect(seen).toEqual([{ id: 'db:u1' }])
  })

  it('a rejection goes through createException (linked package)', async () => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    class HostException extends Error {}
    const { g } = checked(() => false, {
      createException: (_status, message) => new HostException(message),
    })
    await expect(g.canActivate(ctx((await bearer())()))).rejects.toBeInstanceOf(
      HostException
    )
  })

  it('without validateUserCacheTtlMs it runs on every request', async () => {
    const { g, spy } = checked(() => true)
    const request = await bearer()
    await g.canActivate(ctx(request()))
    await g.canActivate(ctx(request()))
    expect(spy).toHaveBeenCalledTimes(2)
  })

  describe('validateUserCacheTtlMs', () => {
    it('caches the verdict per token: a second request is a hit', async () => {
      const { g, spy } = checked(() => true, { validateUserCacheTtlMs: 30_000 })
      const request = await bearer()
      expect(await g.canActivate(ctx(request()))).toBe(true)
      const second = request()
      expect(await g.canActivate(ctx(second))).toBe(true)
      expect(second.user?.id).toBe('u1')
      expect(spy).toHaveBeenCalledTimes(1)
    })

    it('caches a rejection too', async () => {
      vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
      const { g, spy } = checked(() => false, { validateUserCacheTtlMs: 30_000 })
      const request = await bearer()
      await expect(g.canActivate(ctx(request()))).rejects.toThrow(
        UnauthorizedException
      )
      await expect(g.canActivate(ctx(request()))).rejects.toThrow(
        UnauthorizedException
      )
      expect(spy).toHaveBeenCalledTimes(1)
    })

    it('another token of the same user is a miss (a new login is not held by an old verdict)', async () => {
      vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
      const { g, spy } = checked((_user, p) => p['generation'] !== 'old', {
        validateUserCacheTtlMs: 30_000,
      })
      await expect(
        g.canActivate(ctx((await bearer({ generation: 'old' }))()))
      ).rejects.toThrow(UnauthorizedException)
      expect(
        await g.canActivate(ctx((await bearer({ generation: 'new' }))()))
      ).toBe(true)
      expect(spy).toHaveBeenCalledTimes(2)
    })

    it('expires after the TTL', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      const { g, spy } = checked(() => true, { validateUserCacheTtlMs: 30_000 })
      const request = await bearer()
      await g.canActivate(ctx(request()))
      vi.advanceTimersByTime(29_000)
      await g.canActivate(ctx(request()))
      expect(spy).toHaveBeenCalledTimes(1)
      vi.advanceTimersByTime(2_000)
      await g.canActivate(ctx(request()))
      expect(spy).toHaveBeenCalledTimes(2)
    })

    it('never caches a thrown error', async () => {
      let calls = 0
      const { g } = checked(
        () => {
          calls++
          if (calls === 1) throw new Error('db down')
          return true
        },
        { validateUserCacheTtlMs: 30_000 }
      )
      const request = await bearer()
      await expect(g.canActivate(ctx(request()))).rejects.toThrow('db down')
      expect(await g.canActivate(ctx(request()))).toBe(true)
      expect(calls).toBe(2)
    })

    it('is bounded: past 1000 tokens the oldest entry is evicted', async () => {
      const { g, spy } = checked(() => true, { validateUserCacheTtlMs: 60_000 })
      const first = await bearer({ n: 0 })
      await g.canActivate(ctx(first()))
      for (let n = 1; n <= 1000; n++) {
        await g.canActivate(ctx((await bearer({ n }))()))
      }
      expect(spy).toHaveBeenCalledTimes(1001)
      await g.canActivate(ctx(first()))
      expect(spy).toHaveBeenCalledTimes(1002)
    })
  })
})

describe('createJwtAuthGuard — apiKey option (@AllowServiceToken)', () => {
  const KEY = 'k-0123456789abcdef'
  const apiKey = { verify: staticApiKey(KEY) }

  /** Reflector that answers per metadata key, like the real one. */
  function keyedGuard(
    options: Parameters<typeof createJwtAuthGuard>[0],
    metadata: Record<string, boolean>
  ) {
    const Guard = createJwtAuthGuard(options)
    const reflector = {
      getAllAndOverride: (key: string) => metadata[key],
    } as unknown as Reflector
    return new Guard(reflector)
  }
  const marked = { [ALLOW_SERVICE_TOKEN_KEY]: true }

  it('marked route + valid key → passes, attaches servicePrincipal, no request.user', async () => {
    const request: FakeRequest & { servicePrincipal?: unknown } = {
      headers: { 'x-api-key': KEY },
    }
    const g = keyedGuard({ secret: SECRET, apiKey }, marked)
    expect(await g.canActivate(ctx(request))).toBe(true)
    expect(request.servicePrincipal).toEqual({ name: 'service' })
    expect(request.user).toBeUndefined()
  })

  it('marked route + valid session (no key) → the JWT flow still authenticates', async () => {
    const token = await encodeSessionToken(payload, { secret: SECRET })
    const request: FakeRequest = {
      headers: { authorization: `Bearer ${token}` },
    }
    const g = keyedGuard({ secret: SECRET, apiKey }, marked)
    expect(await g.canActivate(ctx(request))).toBe(true)
    expect(request.user?.id).toBe('u1')
  })

  it('bearer: true + session JWE as Bearer → the key misses, the session authenticates', async () => {
    const token = await encodeSessionToken(payload, { secret: SECRET })
    const request: FakeRequest = {
      headers: { authorization: `Bearer ${token}` },
    }
    const g = keyedGuard(
      { secret: SECRET, apiKey: { ...apiKey, bearer: true } },
      marked
    )
    expect(await g.canActivate(ctx(request))).toBe(true)
    expect(request.user?.id).toBe('u1')
  })

  it('marked route + wrong key and no session → 401', async () => {
    const g = keyedGuard({ secret: SECRET, apiKey }, marked)
    await expect(
      g.canActivate(ctx({ headers: { 'x-api-key': 'wrong' } }))
    ).rejects.toThrow(UnauthorizedException)
  })

  it('unmarked route ignores a valid key (opt-in per route)', async () => {
    const verify = vi.fn(staticApiKey(KEY))
    const g = keyedGuard({ secret: SECRET, apiKey: { verify } }, {})
    await expect(
      g.canActivate(ctx({ headers: { 'x-api-key': KEY } }))
    ).rejects.toThrow(UnauthorizedException)
    expect(verify).not.toHaveBeenCalled()
  })

  it('marked route without the apiKey option → session only', async () => {
    const g = keyedGuard({ secret: SECRET }, marked)
    await expect(
      g.canActivate(ctx({ headers: { 'x-api-key': KEY } }))
    ).rejects.toThrow(UnauthorizedException)
  })

  it('a thrown verifier error propagates (5xx), it does not fall back to the session', async () => {
    const outage = new Error('db down')
    const g = keyedGuard(
      { secret: SECRET, apiKey: { verify: () => Promise.reject(outage) } },
      marked
    )
    await expect(
      g.canActivate(ctx({ headers: { 'x-api-key': KEY } }))
    ).rejects.toBe(outage)
  })
})
