import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { UsuariosService } from './usuarios.service'
import type { PrismaService } from '../../common/prisma/prisma.service'
import type { AuthUser } from '../../common/guards/jwt-auth.guard'

// Holds users.read and users.write, not the admin role
const actor = {
  id: 'u1',
  email: 'op@example.com',
  role: { id: 'r-op', code: 'operator' },
  roles: [{ id: 'r-op', code: 'operator' }],
  permissions: ['users.read', 'users.write'],
} as AuthUser

const ROLES: Record<string, { code: string; permissions: string[] }> = {
  'r-admin': { code: 'admin', permissions: ['users.read', 'users.write', 'roles.read', 'roles.write'] },
  r1: { code: 'viewer', permissions: ['users.read'] },
}

function makePrisma() {
  return {
    client: {
      user: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'u3', password: 'hash', roles: [] }),
        update: jest.fn().mockResolvedValue({ id: 'u2', password: 'hash', roles: [] }),
      },
      role: {
        findMany: jest.fn().mockImplementation(({ where }) =>
          Promise.resolve(
            where.id.in.flatMap((id: string) =>
              ROLES[id] ? [{ code: ROLES[id].code, permissions: ROLES[id].permissions.map((code) => ({ permission: { code } })) }] : []
            )
          )
        ),
      },
      permission: { findMany: jest.fn().mockResolvedValue([]) },
      // the target's current roles
      userRole: { findMany: jest.fn().mockResolvedValue([{ roleId: 'r1' }]) },
    },
  } as unknown as PrismaService
}

describe('UsuariosService', () => {
  it('list() paginates and serializes (no password, roles flattened)', async () => {
    const prisma = makePrisma()
    ;(prisma.client.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: '1',
        name: 'A',
        email: 'a@a.com',
        password: 'hash',
        active: true,
        roles: [{ role: { id: 'r1', code: 'admin', name: 'Administrator' } }],
      },
    ])
    ;(prisma.client.user.count as jest.Mock).mockResolvedValue(1)

    const service = new UsuariosService(prisma)
    const result = await service.list({})

    expect(result.total).toBe(1)
    expect(result.data[0]).not.toHaveProperty('password')
    expect(result.data[0].roles).toEqual([{ id: 'r1', code: 'admin', name: 'Administrator' }])
  })

  it('getById() throws NotFoundException when missing', async () => {
    const prisma = makePrisma()
    ;(prisma.client.user.findUnique as jest.Mock).mockResolvedValue(null)
    const service = new UsuariosService(prisma)

    await expect(service.getById('missing')).rejects.toThrow(NotFoundException)
  })

  it('create() throws ConflictException on a duplicate email', async () => {
    const prisma = makePrisma()
    ;(prisma.client.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' })
    const service = new UsuariosService(prisma)

    await expect(service.create({ name: 'A', email: 'a@a.com', password: '12345' }, actor)).rejects.toThrow(
      ConflictException
    )
  })

  it('create() refuses a role beyond the actor (the admin role) and creates nothing', async () => {
    const prisma = makePrisma()
    const service = new UsuariosService(prisma)

    await expect(
      service.create({ name: 'A', email: 'a@a.com', password: '12345', roleIds: ['r-admin'] }, actor)
    ).rejects.toThrow(ForbiddenException)
    expect(prisma.client.user.create).not.toHaveBeenCalled()
  })

  it('update() blocks a user from deactivating themselves', async () => {
    const service = new UsuariosService(makePrisma())

    await expect(service.update('u1', { active: false }, actor)).rejects.toThrow(BadRequestException)
  })

  it('update() refuses to give the admin role, or to edit a user who holds it', async () => {
    const prisma = makePrisma()
    const service = new UsuariosService(prisma)
    await expect(service.update('u2', { roleIds: ['r-admin'] }, actor)).rejects.toThrow(ForbiddenException)

    ;(prisma.client.userRole.findMany as jest.Mock).mockResolvedValue([{ roleId: 'r-admin' }])
    await expect(service.update('u0', { password: 'taken-over' }, actor)).rejects.toThrow(ForbiddenException)
    expect(prisma.client.user.update).not.toHaveBeenCalled()
  })

  it('update() with roleIds replaces the roles and marks the token stale', async () => {
    const prisma = makePrisma()
    await new UsuariosService(prisma).update('u2', { roleIds: ['r1'] }, actor)

    const { data } = (prisma.client.user.update as jest.Mock).mock.calls[0][0]
    expect(data.roles).toEqual({ deleteMany: {}, create: [{ roleId: 'r1' }] })
    expect(data.accessChangedAt).toBeInstanceOf(Date)
  })

  it('update() deactivating another user revokes their sessions', async () => {
    const prisma = makePrisma()
    await new UsuariosService(prisma).update('u2', { active: false }, actor)

    const { data } = (prisma.client.user.update as jest.Mock).mock.calls[0][0]
    expect(data.active).toBe(false)
    expect(data.sessionsRevokedAt).toBeInstanceOf(Date)
  })

  it('update() with a new password revokes the user sessions', async () => {
    const prisma = makePrisma()
    await new UsuariosService(prisma).update('u2', { password: 'new-secret' }, actor)

    const { data } = (prisma.client.user.update as jest.Mock).mock.calls[0][0]
    expect(data.password).not.toBe('new-secret')
    expect(data.sessionsRevokedAt).toBeInstanceOf(Date)
  })
})
