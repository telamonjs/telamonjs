/**
 * Access rules of the generated single app, run against the template files
 * themselves: the users/roles Route Handlers and the session callback
 * (templates/app), the invitations and audit modules of the admin kit
 * (templates/admin). Prisma, the session and the packages the CLI doesn't
 * install are faked; `src/rbac.ts` is the template's own.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

type Actor = { id: string; email: string; roles: { id: string; code: string }[]; permissions: string[] }

const state = vi.hoisted(() => {
  const roles = [
    { id: 'r-admin', code: 'admin', permissions: ['users.read', 'users.write', 'roles.read', 'roles.write', 'invitations.read', 'invitations.write'] },
    { id: 'r-viewer', code: 'viewer', permissions: ['users.read'] },
    { id: 'r-editor', code: 'editor', permissions: ['users.read', 'roles.write'] },
  ]
  const permissions = [
    { id: 'p-users-read', code: 'users.read' },
    { id: 'p-users-write', code: 'users.write' },
  ]
  const inIds = (where: { id: { in: string[] } }) => where.id.in
  const prisma = {
    role: {
      count: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    permission: { findMany: vi.fn(), findUnique: vi.fn() },
    rolePermission: { upsert: vi.fn(), deleteMany: vi.fn() },
    userRole: { findMany: vi.fn() },
    user: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    invitation: { findFirst: vi.fn(), create: vi.fn(), delete: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  }
  const reset = () => {
    prisma.role.count.mockImplementation(({ where }) =>
      Promise.resolve(roles.filter((r) => inIds(where).includes(r.id)).length)
    )
    prisma.role.findUnique.mockResolvedValue({ id: 'r-editor', code: 'editor', name: 'Editor', system: false })
    prisma.role.findMany.mockImplementation(({ where }) =>
      Promise.resolve(
        roles
          .filter((r) => inIds(where).includes(r.id))
          .map((r) => ({ code: r.code, permissions: r.permissions.map((code) => ({ permission: { code } })) }))
      )
    )
    prisma.role.delete.mockResolvedValue({})
    prisma.permission.findMany.mockImplementation(({ where }) =>
      Promise.resolve(permissions.filter((p) => inIds(where).includes(p.id)).map(({ code }) => ({ code })))
    )
    prisma.permission.findUnique.mockResolvedValue({ code: 'users.write' })
    prisma.rolePermission.upsert.mockResolvedValue({})
    prisma.rolePermission.deleteMany.mockResolvedValue({ count: 1 })
    prisma.userRole.findMany.mockResolvedValue([])
    prisma.user.findUnique.mockResolvedValue(null)
    prisma.user.findFirst.mockResolvedValue(null)
    prisma.user.create.mockImplementation(({ data }) => Promise.resolve({ id: 'u-new', ...data, roles: [] }))
    prisma.user.update.mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data, roles: [] }))
    prisma.user.updateMany.mockResolvedValue({ count: 1 })
    prisma.invitation.findFirst.mockResolvedValue(null)
    prisma.invitation.create.mockImplementation(({ data }) => Promise.resolve({ id: 'i1', ...data }))
    prisma.auditLog.create.mockResolvedValue({})
    prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma))
  }
  return { prisma, reset, actor: undefined as unknown as Actor, authConfig: undefined as unknown as AuthConfig }
})

type JwtCallback = (args: { token: Record<string, unknown>; user?: object }) => Promise<Record<string, unknown> | null>
type AuthConfig = { callbacks: { jwt: JwtCallback } }

vi.mock('@/lib/prisma', () => ({ prisma: state.prisma }))
vi.mock('@/lib/auth', () => ({ requirePermission: vi.fn(async () => state.actor) }))
vi.mock('@/rbac', async () => await import('../../templates/app/src/rbac'))
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn(async () => 'hashed') } }))
vi.mock('@telamonjs/data', () => ({
  computeDiff: (_before: object, changes: object) => changes,
  redactPayload: (payload: object) => payload,
}))
vi.mock('@/lib/invitations', () => ({
  newToken: vi.fn(async () => ({ token: 't', tokenHash: 'h', expiresAt: new Date() })),
  sendInvitation: vi.fn(async () => undefined),
  serializeInvitations: vi.fn(async (rows: unknown[]) => rows),
}))

// src/auth.ts: NextAuth captures the config, so the jwt callback runs as is
vi.mock('next-auth', () => ({
  default: (config: AuthConfig) => {
    state.authConfig = config
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }
  },
}))
vi.mock('next-auth/providers/credentials', () => ({ default: (options: object) => options }))
vi.mock('@auth/prisma-adapter', () => ({ PrismaAdapter: () => ({}) }))
vi.mock('react', () => ({ cache: <T>(fn: T) => fn }))
vi.mock('@telamonjs/auth', async () => await import('../../../auth/src/index'))
vi.mock('@telamonjs/auth/next', async () => await import('../../../auth/src/next/index'))

const { canGrant } = await import('../../templates/app/src/rbac')
await import('../../templates/app/src/auth')
const usuarios = await import('../../templates/app/src/app/api/usuarios/route')
const usuario = await import('../../templates/app/src/app/api/usuarios/[id]/route')
const role = await import('../../templates/app/src/app/api/roles/[id]/route')
const rolePermission = await import('../../templates/app/src/app/api/roles/[id]/permissions/[permissionId]/route')
const invitations = await import('../../templates/admin/invitations/app/src/app/api/invitations/route')
const { audit } = await import('../../templates/admin/audit/app/src/lib/audit')

const { prisma } = state
const json = (method: string, body?: unknown, headers?: Record<string, string>) =>
  new NextRequest('http://app.test/api/x', {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
const params = <T extends object>(value: T) => ({ params: Promise.resolve(value) })

/** users.write, roles.write and invitations.write, but no admin role and no roles.read/users.write-free power. */
const operator: Actor = {
  id: 'u-op',
  email: 'op@app.test',
  roles: [{ id: 'r-op', code: 'operator' }],
  permissions: ['users.read', 'users.write', 'roles.write', 'invitations.write'],
}

beforeEach(() => {
  vi.clearAllMocks()
  state.reset()
  state.actor = operator
})

describe('privilege ceiling — canGrant (src/rbac.ts)', () => {
  it('grants roles and permissions within the actor\'s own permissions', async () => {
    expect(await canGrant(prisma as never, operator, { roleIds: ['r-viewer'] })).toBe(true)
    expect(await canGrant(prisma as never, operator, { permissionIds: ['p-users-read'] })).toBe(true)
    expect(await canGrant(prisma as never, operator, {})).toBe(true)
  })

  it('refuses a role or a permission the actor does not hold', async () => {
    const viewer: Actor = { ...operator, permissions: ['users.read', 'users.write'] }
    expect(await canGrant(prisma as never, viewer, { roleIds: ['r-editor'] })).toBe(false)
    expect(await canGrant(prisma as never, { ...viewer, permissions: ['users.read'] }, { permissionIds: ['p-users-write'] })).toBe(false)
  })

  it('refuses the built-in admin role to a non-admin, even one holding every permission', async () => {
    const everything: Actor = { ...operator, permissions: ['users.read', 'users.write', 'roles.read', 'roles.write', 'invitations.read', 'invitations.write'] }
    expect(await canGrant(prisma as never, everything, { roleIds: ['r-admin'] })).toBe(false)
    expect(await canGrant(prisma as never, { ...everything, roles: [{ id: 'r-admin', code: 'admin' }] }, { roleIds: ['r-admin'] })).toBe(true)
  })
})

describe('POST /api/usuarios', () => {
  it('403 for a users.write holder assigning the admin role; no user is created', async () => {
    const res = await usuarios.POST(json('POST', { name: 'X', email: 'x@app.test', password: '12345', roleIds: ['r-admin'] }))
    expect(res.status).toBe(403)
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('creates the user with a role inside the ceiling', async () => {
    const res = await usuarios.POST(json('POST', { name: 'X', email: 'x@app.test', password: '12345', roleIds: ['r-viewer'] }))
    expect(res.status).toBe(201)
  })
})

describe('PATCH /api/usuarios/[id]', () => {
  it('403 when the new roles exceed the actor (admin role)', async () => {
    const res = await usuario.PATCH(json('PATCH', { roleIds: ['r-admin'] }), params({ id: 'u-target' }))
    expect(res.status).toBe(403)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('403 when the target already has access the actor lacks (no password reset of an admin)', async () => {
    prisma.userRole.findMany.mockResolvedValue([{ roleId: 'r-admin' }])
    const res = await usuario.PATCH(json('PATCH', { password: 'taken-over' }), params({ id: 'u-admin' }))
    expect(res.status).toBe(403)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('edits a user whose access is within the ceiling', async () => {
    prisma.userRole.findMany.mockResolvedValue([{ roleId: 'r-viewer' }])
    const res = await usuario.PATCH(json('PATCH', { name: 'Renamed', roleIds: ['r-viewer'] }), params({ id: 'u-viewer' }))
    expect(res.status).toBe(200)
    expect(prisma.user.update).toHaveBeenCalled()
  })
})

describe('POST/DELETE /api/roles/[id]/permissions/[permissionId]', () => {
  it('403 for a roles.write holder granting a permission it lacks; nothing is written', async () => {
    state.actor = { ...operator, permissions: ['roles.write'] }
    const res = await rolePermission.POST(json('POST'), params({ id: 'r-editor', permissionId: 'p-users-write' }))
    expect(res.status).toBe(403)
    expect(prisma.rolePermission.upsert).not.toHaveBeenCalled()
  })

  it('grants a permission the actor holds, and revoking needs no ceiling', async () => {
    expect((await rolePermission.POST(json('POST'), params({ id: 'r-editor', permissionId: 'p-users-read' }))).status).toBe(204)
    state.actor = { ...operator, permissions: ['roles.write'] }
    expect((await rolePermission.DELETE(json('DELETE'), params({ id: 'r-editor', permissionId: 'p-users-write' }))).status).toBe(204)
  })
})

describe('POST /api/invitations (admin kit)', () => {
  it('403 for an invitations.write holder inviting with the admin role; no invitation is stored', async () => {
    const res = await invitations.POST(json('POST', { email: 'new@app.test', roleIds: ['r-admin'] }))
    expect(res.status).toBe(403)
    expect(prisma.invitation.create).not.toHaveBeenCalled()
  })

  it('invites with a role inside the ceiling', async () => {
    const res = await invitations.POST(json('POST', { email: 'new@app.test', roleIds: ['r-viewer'] }))
    expect(res.status).toBe(201)
  })
})

describe('DELETE /api/roles/[id]', () => {
  it('stamps the holders stale after the role is gone, in one transaction', async () => {
    state.actor = { ...operator, permissions: ['roles.write'] }
    prisma.userRole.findMany.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }])

    const res = await role.DELETE(json('DELETE'), params({ id: 'r-editor' }))

    expect(res.status).toBe(204)
    expect(prisma.$transaction).toHaveBeenCalled()
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['u1', 'u2'] } },
      data: { accessChangedAt: expect.any(Date) },
    })
    const deleted = prisma.role.delete.mock.invocationCallOrder[0]
    const stamped = prisma.user.updateMany.mock.invocationCallOrder[0]
    expect(deleted).toBeLessThan(stamped)
  })
})

describe('session refresh — src/auth.ts jwt callback', () => {
  const jwt: JwtCallback = (args) => state.authConfig.callbacks.jwt(args)

  it('a fresh login counts its claims as older than any access mark', async () => {
    const token = await jwt({ token: {}, user: { id: 'u1', email: 'a@app.test', roles: [], permissions: ['users.read'] } })
    expect(token?.accessAt).toBe(0)
    expect(token?.authTime).toEqual(expect.any(Number))
  })

  it('a recompute is as new as the mark it read, never the clock', async () => {
    const mark = new Date(Date.now() - 60_000)
    prisma.user.findUnique.mockResolvedValue({ active: true, accessChangedAt: mark, sessionsRevokedAt: null })
    const token = await jwt({ token: { id: 'u1', authTime: 1, accessAt: 1, permissions: ['users.write'] } })
    expect(token).toMatchObject({ accessAt: mark.getTime(), permissions: [] })
  })
})

describe('audit() ipAddress (admin kit)', () => {
  const ipFor = async (forwardedFor: string) => {
    prisma.auditLog.create.mockClear()
    await audit(json('POST', undefined, { 'x-forwarded-for': forwardedFor }), { id: 'u1' }, { action: 'CREATE', entityType: 'usuarios' })
    return prisma.auditLog.create.mock.calls[0]?.[0].data.ipAddress
  }

  afterEach(() => {
    delete process.env.TRUSTED_PROXY_HOPS
  })

  it('takes the hop the trusted proxy appended, never the client-supplied leftmost one', async () => {
    expect(await ipFor('198.51.100.23, 203.0.113.7')).toBe('203.0.113.7')
    expect(await ipFor('203.0.113.7')).toBe('203.0.113.7')
  })

  it('counts TRUSTED_PROXY_HOPS from the right; 0 (reached directly) trusts no header', async () => {
    process.env.TRUSTED_PROXY_HOPS = '2'
    expect(await ipFor('198.51.100.23, 203.0.113.7, 10.0.0.2')).toBe('203.0.113.7')
    expect(await ipFor('10.0.0.2')).toBeNull()
    process.env.TRUSTED_PROXY_HOPS = '0'
    expect(await ipFor('198.51.100.23')).toBeNull()
  })
})
