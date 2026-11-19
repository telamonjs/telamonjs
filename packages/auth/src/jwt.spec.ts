import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  encodeSessionToken,
  decodeSessionToken,
  payloadToAuthUser,
  resolveTokenConfig,
  DEFAULT_SALT,
} from './jwt'
import type { MfJwtPayload } from './types'

const SECRET = 'test-secret-with-at-least-32-characters!!'

const basePayload: MfJwtPayload = {
  id: 'u1',
  email: 'a@b.c',
  role: { id: 'r1', code: 'agente', name: 'Agente' },
  roles: [{ id: 'r1', code: 'agente', name: 'Agente' }],
  permissions: ['produtos.read'],
  jti: 'session-1',
}

describe('encode/decodeSessionToken', () => {
  const savedEnv = { ...process.env }
  beforeEach(() => {
    delete process.env.AUTH_SECRET
    delete process.env.NEXTAUTH_SECRET
  })
  afterEach(() => {
    process.env.AUTH_SECRET = savedEnv.AUTH_SECRET
    process.env.NEXTAUTH_SECRET = savedEnv.NEXTAUTH_SECRET
  })

  it('round-trip with the default salt (v5)', async () => {
    const token = await encodeSessionToken(basePayload, { secret: SECRET })
    const decoded = await decodeSessionToken(token, { secret: SECRET })
    expect(decoded?.id).toBe('u1')
    expect(decoded?.permissions).toEqual(['produtos.read'])
  })

  it('round-trip with the legacy v4 salt', async () => {
    const salt = 'next-auth.session-token'
    const token = await encodeSessionToken(basePayload, {
      secret: SECRET,
      salt,
    })
    expect(
      await decodeSessionToken(token, { secret: SECRET, salt })
    ).toBeTruthy()
    // wrong salt does NOT decode (the latent cross-project interoperability bug)
    expect(await decodeSessionToken(token, { secret: SECRET })).toBeNull()
  })

  it('invalid token → null (does not throw)', async () => {
    expect(await decodeSessionToken('lixo', { secret: SECRET })).toBeNull()
  })

  it('missing secret throws with the canonical message', () => {
    expect(() => resolveTokenConfig()).toThrow(
      'AUTH_SECRET or NEXTAUTH_SECRET must be defined'
    )
  })

  it('secret via AUTH_SECRET env with NEXTAUTH_SECRET fallback', () => {
    process.env.NEXTAUTH_SECRET = 'from-nextauth-env'
    expect(resolveTokenConfig().secret).toBe('from-nextauth-env')
    process.env.AUTH_SECRET = 'from-auth-env'
    expect(resolveTokenConfig().secret).toBe('from-auth-env')
    expect(resolveTokenConfig().salt).toBe(DEFAULT_SALT)
  })
})

describe('payloadToAuthUser', () => {
  it('sessionId prefers the stable sid over the rotating jti', () => {
    expect(
      payloadToAuthUser({ ...basePayload, sid: 'login-1' }).sessionId
    ).toBe('login-1')
  })

  it('maps basic claims and sessionId (jti)', () => {
    const user = payloadToAuthUser(basePayload)
    expect(user.id).toBe('u1')
    expect(user.sessionId).toBe('session-1')
    expect(user.roles).toHaveLength(1)
    expect(user.isImpersonating).toBeUndefined()
  })

  it('falls back to roles = [role] when roles[] is absent', () => {
    const { roles: _omit, ...noRoles } = basePayload
    const user = payloadToAuthUser(noRoles as MfJwtPayload)
    expect(user.roles).toEqual([basePayload.role])
  })

  it('absent permissions becomes []', () => {
    const user = payloadToAuthUser({
      ...basePayload,
      permissions: undefined as never,
    })
    expect(user.permissions).toEqual([])
  })

  it('maps the impersonation block', () => {
    const user = payloadToAuthUser({
      ...basePayload,
      impersonatedUserId: 'u1',
      originalUserId: 'admin-1',
      originalUserName: 'Admin',
      originalUserEmail: 'admin@b.c',
      originalUserRole: { id: 'r9', code: 'superadmin', name: 'SuperAdmin' },
    })
    expect(user.isImpersonating).toBe(true)
    expect(user.originalUser?.id).toBe('admin-1')
    expect(user.originalUser?.roles).toEqual([
      { id: 'r9', code: 'superadmin', name: 'SuperAdmin' },
    ])
  })
})
