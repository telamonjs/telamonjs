import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(5, 'Password must be at least 5 characters'),
  roleIds: z.array(z.string()).default([]),
  active: z.boolean().default(true),
})

const SORTABLE_FIELDS = new Set(['name', 'email', 'active', 'createdAt', 'updatedAt'])

const include = { roles: { select: { role: { select: { id: true, code: true, name: true } } } } }

function serialize({
  password: _password,
  roles,
  ...rest
}: Prisma.UserGetPayload<{ include: typeof include }>) {
  return { ...rest, roles: roles.map(({ role }) => role) }
}

export async function GET(request: NextRequest) {
  const currentUser = await requirePermission('users.read')
  if (currentUser instanceof NextResponse) return currentUser

  const { searchParams } = new URL(request.url)
  const page = Number(searchParams.get('page') ?? '1')
  const pageSize = Number(searchParams.get('pageSize') ?? '10')
  const search = searchParams.get('search') || undefined
  const sortByParam = searchParams.get('sortBy')
  const sortBy = sortByParam && SORTABLE_FIELDS.has(sortByParam) ? sortByParam : 'createdAt'
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : undefined

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({
    data: data.map(serialize),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}

export async function POST(request: NextRequest) {
  const currentUser = await requirePermission('users.write')
  if (currentUser instanceof NextResponse) return currentUser

  const parsed = createSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Invalid data' },
      { status: 400 }
    )
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) {
    return NextResponse.json({ message: 'This email is already in use' }, { status: 409 })
  }

  const { roleIds, password, ...data } = parsed.data
  const usuario = await prisma.user.create({
    data: {
      ...data,
      password: await bcrypt.hash(password, 10),
      roles: { create: roleIds.map((roleId) => ({ roleId })) },
    },
    include,
  })

  return NextResponse.json(serialize(usuario), { status: 201 })
}
