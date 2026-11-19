import { ExecutionContext, UnauthorizedException, InternalServerErrorException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { decode } from '@auth/core/jwt'
import { JwtAuthGuard } from './jwt-auth.guard'

jest.mock('@auth/core/jwt')
const mockedDecode = decode as jest.MockedFunction<typeof decode>

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

const PAYLOAD = { id: 'u1' }

describe('JwtAuthGuard', () => {
  const prisma = { client: { user: { findUnique: jest.fn() } } }
  let guard: JwtAuthGuard

  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = 'test-secret'
    mockedDecode.mockResolvedValue(PAYLOAD as never)
    prisma.client.user.findUnique.mockResolvedValue({ ativo: true, email: 'a@a.com', role: 'USER' })
    guard = new JwtAuthGuard(prisma as never, {} as Reflector)
  })

  it('lets a @Public() route through without checking the token', async () => {
    const { ctx, reflector } = createContext({ headers: {} }, true)
    guard = new JwtAuthGuard(prisma as never, reflector)
    await expect(guard.canActivate(ctx)).resolves.toBe(true)
    expect(mockedDecode).not.toHaveBeenCalled()
  })

  it('500 when NEXTAUTH_SECRET is missing', async () => {
    delete process.env.NEXTAUTH_SECRET
    const { ctx, reflector } = createContext({ headers: {} })
    guard = new JwtAuthGuard(prisma as never, reflector)
    await expect(guard.canActivate(ctx)).rejects.toThrow(InternalServerErrorException)
  })

  it('401 without a cookie/token', async () => {
    const { ctx, reflector } = createContext({ headers: {} })
    guard = new JwtAuthGuard(prisma as never, reflector)
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('401 with an invalid cookie (decode throws)', async () => {
    mockedDecode.mockRejectedValue(new Error('expired'))
    const { ctx, reflector } = createContext({ headers: {}, cookies: { 'authjs.session-token': 'bad' } })
    guard = new JwtAuthGuard(prisma as never, reflector)
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('401 when the user is inactive', async () => {
    prisma.client.user.findUnique.mockResolvedValue({ ativo: false, email: 'a@a.com', role: 'USER' })
    const { ctx, reflector } = createContext({ headers: { authorization: 'Bearer tok' } })
    guard = new JwtAuthGuard(prisma as never, reflector)
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('401 when the user no longer exists', async () => {
    prisma.client.user.findUnique.mockResolvedValue(null)
    const { ctx, reflector } = createContext({ headers: { authorization: 'Bearer tok' } })
    guard = new JwtAuthGuard(prisma as never, reflector)
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException)
  })

  it('ok: accepts Bearer and attaches req.user', async () => {
    const req: FakeReq = { headers: { authorization: 'Bearer tok-123' } }
    const { ctx, reflector } = createContext(req)
    guard = new JwtAuthGuard(prisma as never, reflector)
    await expect(guard.canActivate(ctx)).resolves.toBe(true)
    expect(mockedDecode).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'tok-123', salt: 'authjs.session-token' })
    )
    expect((req.user as { id: string }).id).toBe('u1')
  })

  it('ok: a __Secure- cookie uses the secure salt', async () => {
    const req: FakeReq = { headers: {}, cookies: { '__Secure-authjs.session-token': 'sec-tok' } }
    const { ctx, reflector } = createContext(req)
    guard = new JwtAuthGuard(prisma as never, reflector)
    await guard.canActivate(ctx)
    expect(mockedDecode).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'sec-tok', salt: '__Secure-authjs.session-token' })
    )
  })
})
