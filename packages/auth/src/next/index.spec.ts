import { describe, it, expect } from 'vitest'
import { createAuthCallbacks, type ImpersonationCookies } from './index'
import { createImpersonationToken } from '../impersonation'
import { encodeSessionToken } from '../jwt'

const SECRET = 'test-secret-with-at-least-32-characters!!'
const tokenConfig = { secret: SECRET }

const actorRole = { id: 'r9', code: 'superadmin', name: 'SuperAdmin' }
const targetRole = { id: 'r1', code: 'agente', name: 'Agente' }

/** The logged-in actor's token, as `jwt` leaves it after login. */
function actorToken(): Record<string, unknown> {
  return {
    id: 'admin-1',
    pessoaId: 'p-admin',
    name: 'Admin',
    email: 'admin@b.c',
    role: actorRole,
    roles: [actorRole],
    permissions: ['admin.impersonate'],
    accessToken: 'ACTOR_ACCESS',
    refreshToken: 'ACTOR_REFRESH',
  }
}

const target = {
  id: 'u1',
  pessoaId: 'p1',
  name: 'Alvo',
  email: 'alvo@b.c',
  role: targetRole,
  permissions: ['produtos.read'],
}

async function impersonationToken(maxAge?: number, actorId = 'admin-1') {
  return createImpersonationToken(
    {
      target,
      actor: {
        id: actorId,
        name: 'Admin',
        email: 'admin@b.c',
        role: actorRole,
      },
      logId: 'log-1',
      maxAge,
    },
    tokenConfig
  )
}

/** Callbacks with a mutable "cookie jar" in place of next/headers. */
function setup(jar: ImpersonationCookies) {
  const callbacks = createAuthCallbacks({
    tokenConfig,
    getImpersonationCookies: async () => jar,
    clearImpersonationCookies: () => {
      delete jar.token
      delete jar.logId
    },
  })
  return {
    jar,
    jwt: (token: Record<string, unknown>, user?: unknown) =>
      callbacks.jwt({ token, user }),
    session: (token: Record<string, unknown>) =>
      callbacks.session({ session: { user: {} }, token }),
  }
}

describe('createAuthCallbacks — backwards compatibility', () => {
  it('without impersonation config, jwt does not touch the token', async () => {
    const base = createAuthCallbacks()
    const token = { ...actorToken(), impersonatedUserId: 'u1' }
    expect(await base.jwt({ token })).toEqual(token)
  })

  it('copies the user claims on login (2.0 behavior)', async () => {
    const base = createAuthCallbacks()
    const token = await base.jwt({
      token: {},
      user: {
        id: 'admin-1',
        email: 'admin@b.c',
        role: actorRole,
        permissions: ['x'],
        accessToken: 'A',
      },
    })
    expect(token.roles).toEqual([actorRole])
    expect(token.accessToken).toBe('A')
  })

  it('keeps the login sid on the token and across renewals', async () => {
    const base = createAuthCallbacks()
    const user = {
      id: 'u',
      email: 'u@b.c',
      role: actorRole,
      permissions: [],
      sid: 'login-1',
    }
    const token = await base.jwt({ token: {}, user })
    expect(token.sid).toBe('login-1')
    // renewal: no user, token carries over
    expect((await base.jwt({ token })).sid).toBe('login-1')
  })

  it('session without impersonation: flags false, originalUser undefined', () => {
    const s = createAuthCallbacks().session({
      session: { user: {} },
      token: actorToken(),
    })
    expect(s.isImpersonating).toBe(false)
    expect(s.impersonationExpired).toBe(false)
    expect(s.originalUser).toBeUndefined()
  })
})

describe('createAuthCallbacks — session times', () => {
  const user = {
    id: 'u',
    email: 'u@b.c',
    role: actorRole,
    permissions: [],
  }

  it('login stamps authTime and accessAt with the same instant', async () => {
    const before = Date.now()
    const token = await createAuthCallbacks().jwt({ token: {}, user })
    expect(token.authTime).toBeGreaterThanOrEqual(before)
    expect(token.accessAt).toBe(token.authTime)
  })

  it('a renewal (no user) does not restamp', async () => {
    const base = createAuthCallbacks()
    const token = await base.jwt({
      token: { ...actorToken(), authTime: 1, accessAt: 2 },
    })
    expect(token.authTime).toBe(1)
    expect(token.accessAt).toBe(2)
  })

  it('starting impersonation does not restamp', async () => {
    const { jwt } = setup({ token: await impersonationToken(), logId: 'log-1' })
    const token = await jwt({ ...actorToken(), authTime: 1, accessAt: 2 })
    expect(token.isImpersonating).toBe(true)
    expect(token.authTime).toBe(1)
    expect(token.accessAt).toBe(2)
  })

  it("stopping restores the actor's accessAt with the actor's permissions", async () => {
    const ctx = setup({ token: await impersonationToken(), logId: 'log-1' })
    const impersonated = await ctx.jwt({ ...actorToken(), authTime: 1, accessAt: 2 })
    // the app refreshed the target's claims while impersonating
    impersonated.accessAt = 999
    delete ctx.jar.token
    const restored = await ctx.jwt(impersonated)
    expect(restored.permissions).toEqual(['admin.impersonate'])
    expect(restored.accessAt).toBe(2)
    expect(restored.authTime).toBe(1)
  })
})

describe('createAuthCallbacks — impersonation', () => {
  it('swaps identity AND accessToken; refreshToken remains the actor one', async () => {
    const impToken = await impersonationToken()
    const { jwt, session } = setup({ token: impToken, logId: 'log-1' })

    const token = await jwt(actorToken())

    expect(token.id).toBe('u1')
    expect(token.pessoaId).toBe('p1')
    expect(token.email).toBe('alvo@b.c')
    expect(token.role).toEqual(targetRole)
    expect(token.permissions).toEqual(['produtos.read'])
    // the central point: the API credential becomes the target's
    expect(token.accessToken).toBe(impToken)
    expect(token.refreshToken).toBe('ACTOR_REFRESH')

    // actor preserved
    expect(token.originalUserId).toBe('admin-1')
    expect(token.originalAccessToken).toBe('ACTOR_ACCESS')
    expect(token.impersonationLogId).toBe('log-1')

    const s = session(token)
    expect(s.isImpersonating).toBe(true)
    expect(s.user.accessToken).toBe(impToken)
    expect(s.originalUser).toMatchObject({ id: 'admin-1', roles: [actorRole] })
  })

  it('repeated passes do not overwrite the stored actor', async () => {
    const { jwt } = setup({ token: await impersonationToken(), logId: 'log-1' })
    const token = await jwt(await jwt(actorToken()))
    expect(token.originalUserId).toBe('admin-1')
    expect(token.originalAccessToken).toBe('ACTOR_ACCESS')
  })

  it('removed cookie (stop-impersonate) restores everything, accessToken included', async () => {
    const ctx = setup({ token: await impersonationToken(), logId: 'log-1' })
    const impersonated = await ctx.jwt(actorToken())
    expect(impersonated.accessToken).not.toBe('ACTOR_ACCESS')

    delete ctx.jar.token
    delete ctx.jar.logId
    const token = await ctx.jwt(impersonated)

    expect(token).toEqual(actorToken())
    const s = ctx.session(token)
    expect(s.isImpersonating).toBe(false)
    expect(s.impersonationExpired).toBe(false)
  })

  it('expired: restores, clears cookies, and the flag lives exactly one cycle', async () => {
    const ctx = setup({ token: await impersonationToken(), logId: 'log-1' })
    const impersonated = await ctx.jwt(actorToken())

    // expired token in place of the valid one
    ctx.jar.token = await impersonationToken(-60)
    const restored = await ctx.jwt(impersonated)

    expect(restored.id).toBe('admin-1')
    expect(restored.accessToken).toBe('ACTOR_ACCESS')
    expect(restored.originalUserId).toBeUndefined()
    expect(ctx.jar.token).toBeUndefined() // clearImpersonationCookies ran
    expect(ctx.session(restored).impersonationExpired).toBe(true)

    // next pass: flag cleared (the toast does not repeat forever)
    const next = await ctx.jwt(restored)
    expect(ctx.session(next).impersonationExpired).toBe(false)
    expect(next).toEqual(actorToken())
  })

  it("another user's login does not inherit the actor's leftover impersonation cookie", async () => {
    const { jwt, session } = setup({
      token: await impersonationToken(),
      logId: 'log-1',
    })
    const token = await jwt(
      {},
      { id: 'low-b', email: 'b@b.c', role: targetRole, permissions: [] }
    )
    expect(token.id).toBe('low-b')
    expect(token.permissions).toEqual([])
    expect(token.impersonatedUserId).toBeUndefined()
    expect(token.originalUserId).toBeUndefined()
    expect(session(token).isImpersonating).toBe(false)
  })

  it('a plain session token in the impersonation cookie is not applied', async () => {
    const plain = await encodeSessionToken(
      { ...target, id: 'u-d', permissions: ['finance.write'] },
      tokenConfig
    )
    const { jwt } = setup({ token: plain, logId: 'client-chosen-log' })
    expect(await jwt(actorToken())).toEqual(actorToken())
  })

  it('an impersonation token without its own log id is not applied', async () => {
    const logless = await encodeSessionToken(
      { ...target, impersonatedUserId: 'u1', originalUserId: 'admin-1' },
      tokenConfig
    )
    const { jwt } = setup({ token: logless, logId: 'active-log' })
    expect(await jwt(actorToken())).toEqual(actorToken())
  })

  it("a cookie swapped for another actor's token ends the impersonation", async () => {
    const ctx = setup({ token: await impersonationToken(), logId: 'log-1' })
    const impersonated = await ctx.jwt(actorToken())
    ctx.jar.token = await impersonationToken(undefined, 'admin-2')
    const restored = await ctx.jwt(impersonated)
    expect(restored.id).toBe('admin-1')
    expect(restored.accessToken).toBe('ACTOR_ACCESS')
    expect(restored.impersonatedUserId).toBeUndefined()
    expect(ctx.jar.token).toBeUndefined() // clearImpersonationCookies ran
  })

  it('invalid orphan cookie with no active impersonation is ignored', async () => {
    const ctx = setup({ token: 'lixo', logId: 'log-1' })
    const token = await ctx.jwt(actorToken())
    expect(token).toEqual(actorToken())
    expect(ctx.session(token).impersonationExpired).toBe(false)
  })
})

describe('session callback typing', () => {
  // next-auth's Session/DefaultSession are interfaces without an index
  // signature; `base.session` must plug into `callbacks.session` as-is.
  interface AppSession {
    user?: { name?: string | null; email?: string | null }
    expires: string
  }
  type NextAuthSessionCallback = (params: {
    session: AppSession
    token: Record<string, unknown>
  }) => AppSession

  it('is assignable to a next-auth style session callback and keeps expires', () => {
    const callback: NextAuthSessionCallback = createAuthCallbacks().session
    const out = callback({
      session: { user: { name: 'Ana' }, expires: '2030-01-01' },
      token: { id: 'u1', permissions: ['a'] },
    })
    expect(out.expires).toBe('2030-01-01')
    expect(out.user).toMatchObject({ name: 'Ana', id: 'u1', permissions: ['a'] })
  })
})
