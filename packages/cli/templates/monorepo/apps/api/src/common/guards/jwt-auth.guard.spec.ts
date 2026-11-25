import { ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { encodeSessionToken, type AuthUser } from '@telamonjs/auth'
import { JwtAuthGuard } from './jwt-auth.guard'

interface FakeReq {
  headers: Record<string, string | undefined>
  cookies?: Record<string, string>
  user?: unknown
}

function createContext(req: FakeReq, isPublic = false): { ctx: ExecutionContext; reflector: Reflector } {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(isPublic) } as unknown as Reflector
  const ctx = {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext
  return { ctx, reflector }
}

// What apps/web's authorize() + createAuthCallbacks() put in the token.
const EDITOR = { id: 'r1', name: 'Editor', code: 'editor' }
const CLAIMS = {
  id: 'u1',
  email: 'a@a.com',
  role: EDITOR,
  roles: [EDITOR],
  permissions: ['users.read'],
}
const HOUR = 3_600_000

describe('JwtAuthGuard', () => {
  const prisma = { client: { user: { findUnique: jest.fn() }, userRole: { findMany: jest.fn() } } }
  const guardFor = (req: FakeReq, isPublic = false) => {
    const { ctx, reflector } = createContext(req, isPublic)
    return { ctx, guard: new JwtAuthGuard(reflector, prisma as never) }
  }
  const bearer = async (claims: object = CLAIMS): Promise<FakeReq> => ({
    headers: { authorization: `Bearer ${await encodeSessionToken(claims as typeof CLAIMS)}` },
  })

  beforeEach(() => {
    delete process.env.AUTH_SECRET
    process.env.NEXTAUTH_SECRET = 'test-secret'
    prisma.client.user.findUnique.mockReset()
    prisma.client.user.findUnique.mockResolvedValue({ active: true, accessChangedAt: null, sessionsRevokedAt: null })
    prisma.client.userRole.findMany.mockReset()
  })

  it('lets a @Public() route through without checking the token', async () => {
    const { ctx, guard } = guardFor({ headers: {} }, true)
    await expect(guard.canActivate(ctx)).resolves.toBe(true)
    expect(prisma.client.user.findUnique).not.toHaveBeenCalled()
  })

  it('fails as a server error (not a 401) when NEXTAUTH_SECRET is missing', async () => {
    const req = await bearer()
    delete process.env.NEXTAUTH_SECRET
    const { ctx, guard } = guardFor(req)
    const error = await guard.canActivate(ctx).catch((err: unknown) => err)
    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(UnauthorizedException)
  })

  it('401 without a cookie/token', async () => {
    const { ctx, guard } = guardFor({ headers: {} })
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('401 with an invalid cookie', async () => {
    const { ctx, guard } = guardFor({ headers: {}, cookies: { 'authjs.session-token': 'bad' } })
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('401 when the user is inactive', async () => {
    prisma.client.user.findUnique.mockResolvedValue({ active: false, accessChangedAt: null, sessionsRevokedAt: null })
    const { ctx, guard } = guardFor(await bearer())
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('401 when the user no longer exists', async () => {
    prisma.client.user.findUnique.mockResolvedValue(null)
    const { ctx, guard } = guardFor(await bearer())
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('401 when the sessions were revoked after the login', async () => {
    prisma.client.user.findUnique.mockResolvedValue({ active: true, accessChangedAt: null, sessionsRevokedAt: new Date() })
    const { ctx, guard } = guardFor(await bearer({ ...CLAIMS, authTime: Date.now() - HOUR, accessAt: Date.now() - HOUR }))
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('fresh token: req.user carries the claims of the token, no access query', async () => {
    const req = await bearer()
    const { ctx, guard } = guardFor(req)
    await expect(guard.canActivate(ctx)).resolves.toBe(true)
    expect(prisma.client.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'u1' } }))
    expect(prisma.client.userRole.findMany).not.toHaveBeenCalled()
    const user = req.user as AuthUser
    expect(user.id).toBe('u1')
    expect(user.permissions).toEqual(['users.read'])
  })

  it('stale token: roles and permissions are recomputed from the database', async () => {
    prisma.client.user.findUnique.mockResolvedValue({ active: true, accessChangedAt: new Date(), sessionsRevokedAt: null })
    prisma.client.userRole.findMany.mockResolvedValue([
      { role: { id: 'r2', code: 'admin', name: 'Administrator', permissions: [{ permission: { code: 'users.write' } }] } },
    ])
    const req = await bearer({ ...CLAIMS, authTime: Date.now() - HOUR, accessAt: Date.now() - HOUR })
    const { ctx, guard } = guardFor(req)
    await expect(guard.canActivate(ctx)).resolves.toBe(true)
    const user = req.user as AuthUser
    expect(user.permissions).toEqual(['users.write'])
    expect(user.roles?.map((r) => r.code)).toEqual(['admin'])
    expect(user.role.code).toBe('admin')
  })

  it('ok: a __Secure- cookie is decoded with its own name as the salt', async () => {
    const token = await encodeSessionToken(CLAIMS, { salt: '__Secure-authjs.session-token' })
    const req: FakeReq = { headers: {}, cookies: { '__Secure-authjs.session-token': token } }
    const { ctx, guard } = guardFor(req)
    await expect(guard.canActivate(ctx)).resolves.toBe(true)
    expect((req.user as AuthUser).id).toBe('u1')
  })
})
