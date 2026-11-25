import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { UsuariosService } from './usuarios.service'
import type { PrismaService } from '../../common/prisma/prisma.service'

function makePrisma() {
  return {
    client: {
      user: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'u2', password: 'hash', roles: [] }),
      },
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

    await expect(service.create({ name: 'A', email: 'a@a.com', password: '12345' })).rejects.toThrow(
      ConflictException
    )
  })

  it('update() blocks a user from deactivating themselves', async () => {
    const service = new UsuariosService(makePrisma())

    await expect(service.update('u1', { active: false }, 'u1')).rejects.toThrow(BadRequestException)
  })

  it('update() with roleIds replaces the roles and marks the token stale', async () => {
    const prisma = makePrisma()
    await new UsuariosService(prisma).update('u2', { roleIds: ['r1'] }, 'u1')

    const { data } = (prisma.client.user.update as jest.Mock).mock.calls[0][0]
    expect(data.roles).toEqual({ deleteMany: {}, create: [{ roleId: 'r1' }] })
    expect(data.accessChangedAt).toBeInstanceOf(Date)
  })

  it('update() deactivating another user revokes their sessions', async () => {
    const prisma = makePrisma()
    await new UsuariosService(prisma).update('u2', { active: false }, 'u1')

    const { data } = (prisma.client.user.update as jest.Mock).mock.calls[0][0]
    expect(data.active).toBe(false)
    expect(data.sessionsRevokedAt).toBeInstanceOf(Date)
  })
})
