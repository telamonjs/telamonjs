import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { createPaginatedResponse, sanitizePaginationParams } from '@telamonjs/data'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { withUsers } from '@/lib/audit'

const SORTABLE_FIELDS = new Set(['createdAt', 'action', 'entityType', 'entityId'])
const EXACT_FILTERS = ['entityType', 'entityId', 'userId', 'action'] as const

/**
 * GET /api/audit — read-only: entries are written by `audit()` (src/lib/audit.ts).
 * Filters: entityType, entityId, userId, action (exact), from/to (ISO dates,
 * inclusive), search (entity, record id or path).
 */
export async function GET(request: NextRequest) {
  const currentUser = await requirePermission('audit.read')
  if (currentUser instanceof NextResponse) return currentUser

  const params = new URL(request.url).searchParams
  const num = (key: string) => Number(params.get(key)) || undefined
  const { page, pageSize } = sanitizePaginationParams({
    page: num('page'),
    pageSize: num('pageSize'),
    defaultPageSize: 50,
  })
  const sortByParam = params.get('sortBy')
  const sortBy = sortByParam && SORTABLE_FIELDS.has(sortByParam) ? sortByParam : 'createdAt'
  const sortOrder = params.get('sortOrder') === 'asc' ? 'asc' : 'desc'

  const where: Prisma.AuditLogWhereInput = {}
  for (const key of EXACT_FILTERS) {
    const value = params.get(key)
    if (value) where[key] = value
  }
  const from = params.get('from')
  const to = params.get('to')
  if (from || to) {
    const gte = from ? new Date(from) : undefined
    const lte = to ? new Date(to) : undefined
    if ([gte, lte].some((date) => date && Number.isNaN(date.getTime()))) {
      return NextResponse.json({ message: 'from/to must be ISO dates' }, { status: 400 })
    }
    where.createdAt = { gte, lte }
  }
  const search = params.get('search')
  if (search) {
    where.OR = [
      { entityType: { contains: search, mode: 'insensitive' } },
      { entityId: { contains: search } },
      { path: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ])

  return NextResponse.json(createPaginatedResponse(await withUsers(data), total, page, pageSize))
}
