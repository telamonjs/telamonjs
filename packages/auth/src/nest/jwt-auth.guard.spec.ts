import { describe, it, expect } from 'vitest'
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common'
import type { Reflector } from '@nestjs/core'
import { createJwtAuthGuard } from './jwt-auth.guard'
import { encodeSessionToken } from '../jwt'
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

function ctx(request: FakeRequest, isPublic = false): ExecutionContext {
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
})
