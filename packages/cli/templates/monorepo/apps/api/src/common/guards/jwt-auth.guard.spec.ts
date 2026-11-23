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
const CLAIMS = {
  id: 'u1',
  email: 'old@a.com',
  role: { id: 'USER', name: 'USER', code: 'USER' },
  permissions: [],
}

describe('JwtAuthGuard', () => {
  const prisma = { client: { user: { findUnique: jest.fn() } } }
  const guardFor = (req: FakeReq, isPublic = false) => {
    const { ctx, reflector } = createContext(req, isPublic)
    return { ctx, guard: new JwtAuthGuard(reflector, prisma as never) }
  }

  beforeEach(() => {
    delete process.env.AUTH_SECRET
    process.env.NEXTAUTH_SECRET = 'test-secret'
    prisma.client.user.findUnique.mockReset()
    prisma.client.user.findUnique.mockResolvedValue({ ativo: true, email: 'a@a.com', role: 'ADMIN' })
  })

  it('lets a @Public() route through without checking the token', async () => {
    const { ctx, guard } = guardFor({ headers: {} }, true)
    await expect(guard.canActivate(ctx)).resolves.toBe(true)
    expect(prisma.client.user.findUnique).not.toHaveBeenCalled()
  })

  it('fails as a server error (not a 401) when NEXTAUTH_SECRET is missing', async () => {
    const token = await encodeSessionToken(CLAIMS)
    delete process.env.NEXTAUTH_SECRET
    const { ctx, guard } = guardFor({ headers: { authorization: `Bearer ${token}` } })
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
    prisma.client.user.findUnique.mockResolvedValue({ ativo: false, email: 'a@a.com', role: 'USER' })
    const token = await encodeSessionToken(CLAIMS)
    const { ctx, guard } = guardFor({ headers: { authorization: `Bearer ${token}` } })
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('401 when the user no longer exists', async () => {
    prisma.client.user.findUnique.mockResolvedValue(null)
    const token = await encodeSessionToken(CLAIMS)
    const { ctx, guard } = guardFor({ headers: { authorization: `Bearer ${token}` } })
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('ok: accepts Bearer and attaches req.user with the role and email from the database', async () => {
    const token = await encodeSessionToken(CLAIMS)
    const req: FakeReq = { headers: { authorization: `Bearer ${token}` } }
    const { ctx, guard } = guardFor(req)
    await expect(guard.canActivate(ctx)).resolves.toBe(true)
    expect(prisma.client.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'u1' } }))
    const user = req.user as AuthUser
    expect(user.id).toBe('u1')
    expect(user.email).toBe('a@a.com')
    expect(user.role.code).toBe('ADMIN')
  })

  it('ok: a __Secure- cookie is decoded with its own name as the salt', async () => {
    const token = await encodeSessionToken(CLAIMS, { salt: '__Secure-authjs.session-token' })
    const req: FakeReq = { headers: {}, cookies: { '__Secure-authjs.session-token': token } }
    const { ctx, guard } = guardFor(req)
    await expect(guard.canActivate(ctx)).resolves.toBe(true)
    expect((req.user as AuthUser).id).toBe('u1')
  })
})
