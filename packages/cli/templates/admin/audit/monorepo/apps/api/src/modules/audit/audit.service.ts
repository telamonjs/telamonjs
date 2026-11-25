import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { createPaginatedResponse, sanitizePaginationParams } from '@telamonjs/data'
import { PrismaService } from '../../common/prisma/prisma.service'

export interface AuditListQuery {
  page?: string
  pageSize?: string
  sortBy?: string
  sortOrder?: string
  search?: string
  entityType?: string
  entityId?: string
  userId?: string
  action?: string
  from?: string
  to?: string
}

const SORTABLE_FIELDS = new Set(['createdAt', 'action', 'entityType', 'entityId'])
const EXACT_FILTERS = ['entityType', 'entityId', 'userId', 'action'] as const

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AuditListQuery) {
    const { page, pageSize } = sanitizePaginationParams({
      page: Number(query.page) || undefined,
      pageSize: Number(query.pageSize) || undefined,
      defaultPageSize: 50,
    })
    const sortBy = query.sortBy && SORTABLE_FIELDS.has(query.sortBy) ? query.sortBy : 'createdAt'
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc'

    const where: Prisma.AuditLogWhereInput = {}
    for (const key of EXACT_FILTERS) {
      const value = query[key]
      if (value) where[key] = value
    }
    if (query.from || query.to) {
      const gte = query.from ? new Date(query.from) : undefined
      const lte = query.to ? new Date(query.to) : undefined
      if ([gte, lte].some((date) => date && Number.isNaN(date.getTime()))) {
        throw new BadRequestException('from/to must be ISO dates')
      }
      where.createdAt = { gte, lte }
    }
    if (query.search) {
      where.OR = [
        { entityType: { contains: query.search, mode: 'insensitive' } },
        { entityId: { contains: query.search } },
        { path: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const client = this.prisma.client
    const [data, total] = await Promise.all([
      client.auditLog.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      client.auditLog.count({ where }),
    ])
    return createPaginatedResponse(await this.withUsers(data), total, page, pageSize)
  }

  async getById(id: string) {
    const entry = await this.prisma.client.auditLog.findUnique({ where: { id } })
    if (!entry) throw new NotFoundException('Audit entry not found')
    const [withUser] = await this.withUsers([entry])
    return withUser
  }

  /** Entries with the name and email of the user who acted (`user`, null when deleted or anonymous). */
  private async withUsers<T extends { userId: string | null }>(entries: T[]) {
    const ids = [...new Set(entries.flatMap((entry) => (entry.userId ? [entry.userId] : [])))]
    const users = await this.prisma.client.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, email: true },
    })
    const byId = new Map(users.map((user) => [user.id, user]))
    return entries.map((entry) => ({ ...entry, user: (entry.userId && byId.get(entry.userId)) || null }))
  }
}
