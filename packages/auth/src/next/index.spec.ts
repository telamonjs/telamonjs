import { describe, it, expect } from 'vitest'
import { createAuthCallbacks, type ImpersonationCookies } from './index'
import { createImpersonationToken } from '../impersonation'

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

async function impersonationToken(maxAge?: number) {
  return createImpersonationToken(
    {
      target: {
        id: 'u1',
        pessoaId: 'p1',
        name: 'Alvo',
        email: 'alvo@b.c',
        role: targetRole,
        permissions: ['produtos.read'],
      },
      actor: {
        id: 'admin-1',
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
    jwt: (token: Record<string, unknown>) => callbacks.jwt({ token }),
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

  it('invalid orphan cookie with no active impersonation is ignored', async () => {
    const ctx = setup({ token: 'lixo', logId: 'log-1' })
    const token = await ctx.jwt(actorToken())
    expect(token).toEqual(actorToken())
    expect(ctx.session(token).impersonationExpired).toBe(false)
  })
})
