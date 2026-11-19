import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import bcrypt from 'bcryptjs'
import type { User } from '@prisma/client'
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

const SORTABLE_FIELDS = new Set(['name', 'email', 'role', 'ativo', 'createdAt', 'updatedAt'])

function serialize({ password: _password, ...rest }: User) {
  return rest
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
    const usuario = await this.prisma.client.user.findUnique({ where: { id } })
    if (!usuario) throw new NotFoundException('Usuário não encontrado')
    return serialize(usuario)
  }

  async create(dto: CreateUsuarioDto) {
    const client = this.prisma.client
    const existing = await client.user.findUnique({ where: { email: dto.email } })
    if (existing) throw new ConflictException('Este email já está em uso')

    const usuario = await client.user.create({
      data: { ...dto, password: await bcrypt.hash(dto.password, 10) },
    })
    return serialize(usuario)
  }

  async update(id: string, dto: UpdateUsuarioDto, currentUserId: string) {
    // A user can't deactivate themselves.
    if (currentUserId === id && dto.ativo === false) {
      throw new BadRequestException('Você não pode desativar seu próprio usuário')
    }

    const client = this.prisma.client
    if (dto.email) {
      const existing = await client.user.findUnique({ where: { email: dto.email } })
      if (existing && existing.id !== id) {
        throw new ConflictException('Este email já está em uso por outro usuário')
      }
    }

    const { password, ...rest } = dto
    const usuario = await client.user.update({
      where: { id },
      data: { ...rest, ...(password ? { password: await bcrypt.hash(password, 10) } : {}) },
    })
    return serialize(usuario)
  }

  async remove(id: string, currentUserId: string) {
    // A user can't deactivate themselves.
    if (currentUserId === id) {
      throw new BadRequestException('Você não pode desativar seu próprio usuário')
    }
    // Soft delete: deactivate instead of removing the row.
    await this.prisma.client.user.update({ where: { id }, data: { ativo: false } })
  }
}
