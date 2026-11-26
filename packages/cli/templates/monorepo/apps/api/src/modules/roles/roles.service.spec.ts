import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { RolesService } from './roles.service'
import type { PrismaService } from '../../common/prisma/prisma.service'
import type { AuthUser } from '../../common/guards/jwt-auth.guard'

// Holds roles.write and users.read, not the admin role
const actor = {
  id: 'u1',
  email: 'op@example.com',
  role: { id: 'r-op', code: 'operator' },
  roles: [{ id: 'r-op', code: 'operator' }],
  permissions: ['roles.write', 'users.read'],
} as AuthUser

function makePrisma(role: unknown = { id: 'r1', code: 'editor', system: false }) {
  const client = {
    role: {
      findUnique: jest.fn().mockResolvedValue(role),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      delete: jest.fn(),
    },
    // p1 is users.read; anything else is users.write
    permission: {
      findMany: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve(where.id.in.map((id: string) => ({ code: id === 'p1' ? 'users.read' : 'users.write' })))
      ),
    },
    rolePermission: { upsert: jest.fn(), deleteMany: jest.fn() },
    userRole: { findMany: jest.fn().mockResolvedValue([{ userId: 'u2' }]) },
    user: { updateMany: jest.fn() },
    $transaction: jest.fn(),
  }
  client.$transaction.mockImplementation((fn: (tx: typeof client) => unknown) => fn(client))
  return { client } as unknown as PrismaService
}

const staleMark = (prisma: PrismaService) => (prisma.client.user.updateMany as jest.Mock).mock.calls[0]?.[0]

describe('RolesService', () => {
  it('matrix() lists every role with the ids of its permissions', async () => {
    const prisma = makePrisma()
    ;(prisma.client.role.findMany as jest.Mock).mockResolvedValue([
      { id: 'r1', name: 'Editor', code: 'editor', system: false, permissions: [{ permissionId: 'p1' }] },
    ])
    ;(prisma.client.permission.findMany as jest.Mock).mockResolvedValue([{ id: 'p1', code: 'users.read' }])

    const result = await new RolesService(prisma).matrix()

    expect(result.roles).toEqual([{ id: 'r1', name: 'Editor', code: 'editor', system: false, permissionIds: ['p1'] }])
    expect(result.permissions).toHaveLength(1)
  })

  it('setPermission() grants and marks every holder of the role stale', async () => {
    const prisma = makePrisma()
    await new RolesService(prisma).setPermission('r1', 'p1', true, actor)

    expect(prisma.client.rolePermission.upsert).toHaveBeenCalled()
    expect(staleMark(prisma)).toEqual({
      where: { roles: { some: { roleId: 'r1' } } },
      data: { accessChangedAt: expect.any(Date) },
    })
  })

  it('setPermission() revokes and marks the holders stale', async () => {
    const prisma = makePrisma()
    await new RolesService(prisma).setPermission('r1', 'p1', false, actor)

    expect(prisma.client.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: 'r1', permissionId: 'p1' } })
    expect(staleMark(prisma)).toBeDefined()
  })

  it('setPermission() refuses to grant a permission the actor does not hold', async () => {
    const prisma = makePrisma()
    await expect(new RolesService(prisma).setPermission('r1', 'p2', true, actor)).rejects.toThrow(ForbiddenException)

    expect(prisma.client.rolePermission.upsert).not.toHaveBeenCalled()
    expect(staleMark(prisma)).toBeUndefined()
  })

  it('a built-in role cannot be changed, granted or deleted', async () => {
    const service = new RolesService(makePrisma({ id: 'r0', code: 'admin', system: true }))

    await expect(service.setPermission('r0', 'p1', false, actor)).rejects.toThrow(BadRequestException)
    await expect(service.update('r0', { name: 'X' })).rejects.toThrow(BadRequestException)
    await expect(service.remove('r0')).rejects.toThrow(BadRequestException)
  })

  it('remove() marks the holders stale after deleting, in one transaction', async () => {
    const prisma = makePrisma()
    await new RolesService(prisma).remove('r1')

    expect(prisma.client.$transaction).toHaveBeenCalled()
    expect(prisma.client.role.delete).toHaveBeenCalledWith({ where: { id: 'r1' } })
    expect(staleMark(prisma)).toEqual({ where: { id: { in: ['u2'] } }, data: { accessChangedAt: expect.any(Date) } })
    const deleted = (prisma.client.role.delete as jest.Mock).mock.invocationCallOrder[0]
    const stamped = (prisma.client.user.updateMany as jest.Mock).mock.invocationCallOrder[0]
    expect(deleted).toBeLessThan(stamped)
  })

  it('404 for an unknown role', async () => {
    await expect(new RolesService(makePrisma(null)).remove('nope')).rejects.toThrow(NotFoundException)
  })
})
