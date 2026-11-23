import { describe, it, expect } from 'vitest'
import {
  createImpersonationToken,
  DEFAULT_IMPERSONATION_MAX_AGE,
} from './impersonation'
import { decodeSessionToken, payloadToAuthUser } from './jwt'
import { sessionState } from './session'

const SECRET = 'test-secret-with-at-least-32-characters!!'

const target = {
  id: 'u1',
  pessoaId: 'p1',
  name: 'Alvo',
  email: 'alvo@b.c',
  role: { id: 'r1', code: 'agente', name: 'Agente' },
  permissions: ['produtos.read'],
}

const actor = {
  id: 'admin-1',
  name: 'Admin',
  email: 'admin@b.c',
  role: { id: 'r9', code: 'superadmin', name: 'SuperAdmin' },
  permissions: ['admin.impersonate', 'tudo.write'],
}

describe('createImpersonationToken', () => {
  it('round-trip: top-level claims are the ones payloadToAuthUser reads', async () => {
    const token = await createImpersonationToken(
      { target, actor, logId: 'log-1' },
      { secret: SECRET }
    )
    const payload = await decodeSessionToken(token, { secret: SECRET })
    expect(payload).toBeTruthy()

    // contract shape — top-level claims, not a nested object
    expect(payload?.impersonatedUserId).toBe('u1')
    expect(payload?.impersonationLogId).toBe('log-1')
    expect(payload?.originalUserId).toBe('admin-1')
    expect(payload?.originalUserRole).toEqual(actor.role)

    const user = payloadToAuthUser(payload!)
    expect(user.id).toBe('u1')
    expect(user.pessoaId).toBe('p1')
    expect(user.permissions).toEqual(['produtos.read'])
    expect(user.isImpersonating).toBe(true)
    expect(user.impersonationLogId).toBe('log-1')
    expect(user.originalUser).toEqual({
      id: 'admin-1',
      name: 'Admin',
      email: 'admin@b.c',
      role: actor.role,
      roles: [actor.role],
    })
  })

  it('roles[] falls back to [role] on both sides', async () => {
    const token = await createImpersonationToken(
      { target, actor, logId: 'log-1' },
      { secret: SECRET }
    )
    const payload = await decodeSessionToken(token, { secret: SECRET })
    expect(payload?.roles).toEqual([target.role])
    expect(payload?.originalUserRoles).toEqual([actor.role])
  })

  it('originalPermissions excluded by default, included on demand', async () => {
    const config = { secret: SECRET }
    const semPerms = await decodeSessionToken(
      await createImpersonationToken({ target, actor, logId: 'l' }, config),
      config
    )
    expect(semPerms?.originalPermissions).toBeUndefined()

    const comPerms = await decodeSessionToken(
      await createImpersonationToken(
        { target, actor, logId: 'l', includeOriginalPermissions: true },
        config
      ),
      config
    )
    expect(comPerms?.originalPermissions).toEqual(actor.permissions)
  })

  it('default 1h TTL comes from maxAge (exp/iat are written by @auth/core, not the payload)', async () => {
    const token = await createImpersonationToken(
      { target, actor, logId: 'l' },
      { secret: SECRET }
    )
    const payload = await decodeSessionToken(token, { secret: SECRET })
    const ttl = (payload!.exp as number) - (payload!.iat as number)
    expect(ttl).toBe(DEFAULT_IMPERSONATION_MAX_AGE)

    const curto = await decodeSessionToken(
      await createImpersonationToken(
        { target, actor, logId: 'l', maxAge: 120 },
        { secret: SECRET }
      ),
      { secret: SECRET }
    )
    expect((curto!.exp as number) - (curto!.iat as number)).toBe(120)
  })

  it('is fresh against marks set before it was issued', async () => {
    const marks = { revokedAt: Date.now() - 1, accessChangedAt: Date.now() - 1 }
    const payload = await decodeSessionToken(
      await createImpersonationToken(
        { target, actor, logId: 'l' },
        { secret: SECRET }
      ),
      { secret: SECRET }
    )
    expect(sessionState(payload!, marks)).toBe('fresh')
  })

  it('expired token does not decode (time-based revocation)', async () => {
    const token = await createImpersonationToken(
      { target, actor, logId: 'l', maxAge: -60 },
      { secret: SECRET }
    )
    expect(await decodeSessionToken(token, { secret: SECRET })).toBeNull()
  })
})
