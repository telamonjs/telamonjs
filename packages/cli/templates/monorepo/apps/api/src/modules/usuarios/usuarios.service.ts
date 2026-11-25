import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import bcrypt from 'bcryptjs'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../../common/prisma/prisma.service'
import { CreateUsuarioDto } from './dto/create-usuario.dto'
import { UpdateUsuarioDto } from './dto/update-usuario.dto'

interface ListQuery {
  page?: string
  pageSize?: string
  search?: string
  sortBy?: string
  sortOrder?: string
}

const SORTABLE_FIELDS = new Set(['name', 'email', 'active', 'createdAt', 'updatedAt'])

const include = { roles: { select: { role: { select: { id: true, code: true, name: true } } } } }

function serialize({ password: _password, roles, ...rest }: Prisma.UserGetPayload<{ include: typeof include }>) {
  return { ...rest, roles: roles.map(({ role }) => role) }
}

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListQuery) {
    const page = Number(query.page ?? '1')
    const pageSize = Number(query.pageSize ?? '10')
    const search = query.search || undefined
    const sortBy = query.sortBy && SORTABLE_FIELDS.has(query.sortBy) ? query.sortBy : 'createdAt'
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc'

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined

    const client = this.prisma.client
    const [data, total] = await Promise.all([
      client.user.findMany({
        where,
        include,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      client.user.count({ where }),
    ])

    return {
      data: data.map(serialize),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  async getById(id: string) {
    const usuario = await this.prisma.client.user.findUnique({ where: { id }, include })
    if (!usuario) throw new NotFoundException('User not found')
    return serialize(usuario)
  }

  async create(dto: CreateUsuarioDto) {
    const client = this.prisma.client
    const existing = await client.user.findUnique({ where: { email: dto.email } })
    if (existing) throw new ConflictException('This email is already in use')

    const { roleIds = [], password, ...data } = dto
    const usuario = await client.user.create({
      data: {
        ...data,
        password: await bcrypt.hash(password, 10),
        roles: { create: roleIds.map((roleId) => ({ roleId })) },
      },
      include,
    })
    return serialize(usuario)
  }

  async update(id: string, dto: UpdateUsuarioDto, currentUserId: string) {
    if (currentUserId === id && dto.active === false) {
      throw new BadRequestException("You can't deactivate yourself")
    }

    const client = this.prisma.client
    if (dto.email) {
      const existing = await client.user.findUnique({ where: { email: dto.email } })
      if (existing && existing.id !== id) {
        throw new ConflictException('This email is already in use by another user')
      }
    }

    const { password, roleIds, active, ...rest } = dto
    const now = new Date()
    const usuario = await client.user.update({
      where: { id },
      data: {
        ...rest,
        ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
        // New roles: the user's token goes stale and is refreshed on the next request
        ...(roleIds
          ? { roles: { deleteMany: {}, create: roleIds.map((roleId) => ({ roleId })) }, accessChangedAt: now }
          : {}),
        // Deactivated: every open session ends
        ...(active === undefined ? {} : { active, ...(active ? {} : { sessionsRevokedAt: now }) }),
      },
      include,
    })
    return serialize(usuario)
  }
}
