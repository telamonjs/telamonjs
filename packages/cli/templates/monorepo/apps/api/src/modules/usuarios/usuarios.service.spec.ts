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
        update: jest.fn(),
      },
    },
  } as unknown as PrismaService
}

describe('UsuariosService', () => {
  it('list() paginates and serializes (no password field)', async () => {
    const prisma = makePrisma()
    ;(prisma.client.user.findMany as jest.Mock).mockResolvedValue([
      { id: '1', name: 'A', email: 'a@a.com', password: 'hash', ativo: true },
    ])
    ;(prisma.client.user.count as jest.Mock).mockResolvedValue(1)

    const service = new UsuariosService(prisma)
    const result = await service.list({})

    expect(result.total).toBe(1)
    expect(result.data[0]).not.toHaveProperty('password')
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

    await expect(
      service.create({ name: 'A', email: 'a@a.com', password: '12345' })
    ).rejects.toThrow(ConflictException)
  })

  it('update() blocks a user from deactivating themselves', async () => {
    const prisma = makePrisma()
    const service = new UsuariosService(prisma)

    await expect(service.update('u1', { ativo: false }, 'u1')).rejects.toThrow(BadRequestException)
  })

  it('remove() blocks a user from removing themselves', async () => {
    const prisma = makePrisma()
    const service = new UsuariosService(prisma)

    await expect(service.remove('u1', 'u1')).rejects.toThrow(BadRequestException)
  })

  it('remove() soft-deletes (sets ativo: false) another user', async () => {
    const prisma = makePrisma()
    const service = new UsuariosService(prisma)

    await service.remove('u2', 'u1')

    expect(prisma.client.user.update).toHaveBeenCalledWith({
      where: { id: 'u2' },
      data: { ativo: false },
    })
  })
})
