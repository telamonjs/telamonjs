import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { markRoleHoldersStale } from '{{scope}}/shared/rbac'
import { PrismaService } from '../../common/prisma/prisma.service'
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto'

interface ListQuery {
  page?: string
  pageSize?: string
  search?: string
  sortBy?: string
  sortOrder?: string
}

const SORTABLE_FIELDS = new Set(['name', 'code'])

const select = {
  id: true,
  name: true,
  code: true,
  description: true,
  system: true,
  _count: { select: { users: true, permissions: true } },
} as const

/**
 * Roles and their permissions. Every change that alters what a holder's token
 * says (permissions, role name/code, deletion) marks the holders stale
 * (`accessChangedAt`): apps/web refreshes the cookie and the JwtAuthGuard
 * recomputes the claims on their next request.
 */
@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListQuery) {
    const page = Number(query.page ?? '1')
    const pageSize = Number(query.pageSize ?? '10')
    const search = query.search || undefined
    const sortBy = query.sortBy && SORTABLE_FIELDS.has(query.sortBy) ? query.sortBy : 'name'
    const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc'

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { code: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined

    const client = this.prisma.client
    const [data, total] = await Promise.all([
      client.role.findMany({ where, select, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * pageSize, take: pageSize }),
      client.role.count({ where }),
    ])
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  /** Everything the PermissionMatrix needs, in one request. */
  async matrix() {
    const client = this.prisma.client
    const [roles, permissions] = await Promise.all([
      client.role.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, code: true, system: true, permissions: { select: { permissionId: true } } },
      }),
      client.permission.findMany({
        orderBy: [{ module: 'asc' }, { action: 'asc' }],
        select: { id: true, code: true, module: true, action: true, category: true, description: true },
      }),
    ])
    return {
      roles: roles.map(({ permissions: granted, ...role }) => ({
        ...role,
        permissionIds: granted.map((g) => g.permissionId),
      })),
      permissions,
    }
  }

  async getById(id: string) {
    const role = await this.prisma.client.role.findUnique({ where: { id }, select })
    if (!role) throw new NotFoundException('Role not found')
    return role
  }

  async create(dto: CreateRoleDto) {
    const client = this.prisma.client
    if (await client.role.findUnique({ where: { code: dto.code } })) {
      throw new ConflictException('This code is already in use')
    }
    return client.role.create({ data: dto, select })
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.findEditable(id)
    const client = this.prisma.client
    if (dto.code && dto.code !== role.code && (await client.role.findUnique({ where: { code: dto.code } }))) {
      throw new ConflictException('This code is already in use')
    }
    const updated = await client.role.update({ where: { id }, data: dto, select })
    // The holders' tokens carry the role's name and code (roles[])
    await markRoleHoldersStale(client, id)
    return updated
  }

  async remove(id: string) {
    await this.findEditable(id)
    const client = this.prisma.client
    // Holders lose the role's permissions: mark them before the rows go (cascade)
    await markRoleHoldersStale(client, id)
    await client.role.delete({ where: { id } })
  }

  /** Grant (`true`) or revoke one permission — one PermissionMatrix cell. */
  async setPermission(roleId: string, permissionId: string, grant: boolean) {
    await this.findEditable(roleId)
    const client = this.prisma.client
    if (grant) {
      await client.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      })
    } else {
      await client.rolePermission.deleteMany({ where: { roleId, permissionId } })
    }
    await markRoleHoldersStale(client, roleId)
  }

  private async findEditable(id: string) {
    const role = await this.prisma.client.role.findUnique({ where: { id } })
    if (!role) throw new NotFoundException('Role not found')
    if (role.system) throw new BadRequestException('Built-in roles cannot be changed')
    return role
  }
}
