import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common'
import { AdminGuard } from './admin.guard'

function ctxWithUser(user: unknown): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => ({ user }) }) } as unknown as ExecutionContext
}

describe('AdminGuard', () => {
  const guard = new AdminGuard()

  it('401 without a user on the request', () => {
    expect(() => guard.canActivate(ctxWithUser(undefined))).toThrow(UnauthorizedException)
  })

  it('403 when the role is insufficient (USER)', () => {
    expect(() => guard.canActivate(ctxWithUser({ id: 'u1', role: 'USER' }))).toThrow(ForbiddenException)
  })

  it('ok when ADMIN', () => {
    expect(guard.canActivate(ctxWithUser({ id: 'u1', role: 'ADMIN' }))).toBe(true)
  })
})
