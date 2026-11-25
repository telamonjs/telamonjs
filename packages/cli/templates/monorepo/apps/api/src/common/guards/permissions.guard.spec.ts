import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PermissionsGuard } from './permissions.guard'

function ctx(user: unknown, required?: unknown[]): { context: ExecutionContext; guard: InstanceType<typeof PermissionsGuard> } {
  // The metadata @Permissions(...) / @Public() would set on the handler
  const reflector = {
    getAllAndOverride: jest.fn((key: string) => (key === 'permissions' ? required : undefined)),
  } as unknown as Reflector
  const context = {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext
  return { context, guard: new PermissionsGuard(reflector) }
}

const user = (permissions: string[]) => ({ id: 'u1', roles: [{ id: 'r1', code: 'editor' }], permissions })

describe('PermissionsGuard', () => {
  it('a route without @Permissions only needs the session', () => {
    const { context, guard } = ctx(user([]))
    expect(guard.canActivate(context)).toBe(true)
  })

  it('401 without a user on the request', () => {
    const { context, guard } = ctx(undefined, ['users.write'])
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException)
  })

  it('403 without the permission', () => {
    const { context, guard } = ctx(user(['users.read']), ['users.write'])
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
  })

  it('ok with the permission (any clause grants)', () => {
    const { context, guard } = ctx(user(['users.write']), ['roles.read', 'users.write'])
    expect(guard.canActivate(context)).toBe(true)
  })

  it('no role bypasses the check, not even admin', () => {
    const { context, guard } = ctx({ id: 'u1', roles: [{ id: 'r', code: 'admin' }], permissions: [] }, ['users.write'])
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
  })
})
