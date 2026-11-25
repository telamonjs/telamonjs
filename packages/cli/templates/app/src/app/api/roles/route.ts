import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().regex(/^[a-z][a-z0-9_-]*$/, 'Code: lowercase letters, digits, - and _'),
  description: z.string().optional(),
})

const SORTABLE_FIELDS = new Set(['name', 'code'])

const select = {
  id: true,
  name: true,
  code: true,
  description: true,
  system: true,
  _count: { select: { users: true, permissions: true } },
} as const

export async function GET(request: NextRequest) {
  // users.write too: the user form lists the roles to assign
  const currentUser = await requirePermission('roles.read', 'users.write')
  if (currentUser instanceof NextResponse) return currentUser

  const { searchParams } = new URL(request.url)
  const page = Number(searchParams.get('page') ?? '1')
  const pageSize = Number(searchParams.get('pageSize') ?? '10')
  const search = searchParams.get('search') || undefined
  const sortByParam = searchParams.get('sortBy')
  const sortBy = sortByParam && SORTABLE_FIELDS.has(sortByParam) ? sortByParam : 'name'
  const sortOrder = searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc'

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { code: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : undefined

  const [data, total] = await Promise.all([
    prisma.role.findMany({
      where,
      select,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.role.count({ where }),
  ])

  return NextResponse.json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
}

export async function POST(request: NextRequest) {
  const currentUser = await requirePermission('roles.write')
  if (currentUser instanceof NextResponse) return currentUser

  const parsed = createSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Invalid data' },
      { status: 400 }
    )
  }

  if (await prisma.role.findUnique({ where: { code: parsed.data.code } })) {
    return NextResponse.json({ message: 'This code is already in use' }, { status: 409 })
  }

  const role = await prisma.role.create({ data: parsed.data, select })
  return NextResponse.json(role, { status: 201 })
}
