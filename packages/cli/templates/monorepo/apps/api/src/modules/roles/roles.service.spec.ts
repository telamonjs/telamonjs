import { BadRequestException, NotFoundException } from '@nestjs/common'
import { RolesService } from './roles.service'
import type { PrismaService } from '../../common/prisma/prisma.service'

function makePrisma(role: unknown = { id: 'r1', code: 'editor', system: false }) {
  return {
    client: {
      role: {
        findUnique: jest.fn().mockResolvedValue(role),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      permission: { findMany: jest.fn() },
      rolePermission: { upsert: jest.fn(), deleteMany: jest.fn() },
      user: { updateMany: jest.fn() },
    },
  } as unknown as PrismaService
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
    await new RolesService(prisma).setPermission('r1', 'p1', true)

    expect(prisma.client.rolePermission.upsert).toHaveBeenCalled()
    expect(staleMark(prisma)).toEqual({
      where: { roles: { some: { roleId: 'r1' } } },
      data: { accessChangedAt: expect.any(Date) },
    })
  })

  it('setPermission() revokes and marks the holders stale', async () => {
    const prisma = makePrisma()
    await new RolesService(prisma).setPermission('r1', 'p1', false)

    expect(prisma.client.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: 'r1', permissionId: 'p1' } })
    expect(staleMark(prisma)).toBeDefined()
  })

  it('a built-in role cannot be changed, granted or deleted', async () => {
    const service = new RolesService(makePrisma({ id: 'r0', code: 'admin', system: true }))

    await expect(service.setPermission('r0', 'p1', false)).rejects.toThrow(BadRequestException)
    await expect(service.update('r0', { name: 'X' })).rejects.toThrow(BadRequestException)
    await expect(service.remove('r0')).rejects.toThrow(BadRequestException)
  })

  it('remove() marks the holders stale before deleting', async () => {
    const prisma = makePrisma()
    await new RolesService(prisma).remove('r1')

    expect(staleMark(prisma)).toBeDefined()
    expect(prisma.client.role.delete).toHaveBeenCalledWith({ where: { id: 'r1' } })
  })

  it('404 for an unknown role', async () => {
    await expect(new RolesService(makePrisma(null)).remove('nope')).rejects.toThrow(NotFoundException)
  })
})
