import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(5, 'Senha deve ter no mínimo 5 caracteres'),
  role: z.enum(['ADMIN', 'USER']).default('USER'),
  ativo: z.boolean().default(true),
})

const SORTABLE_FIELDS = new Set(['name', 'email', 'role', 'ativo', 'createdAt', 'updatedAt'])

function serialize<T extends { password: string }>({ password: _password, ...rest }: T) {
  return rest
}

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

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
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }
  if (currentUser.role.code !== 'ADMIN') {
    return NextResponse.json(
      { message: 'Apenas administradores podem criar usuários' },
      { status: 403 }
    )
  }

  const parsed = createSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) {
    return NextResponse.json({ message: 'Este email já está em uso' }, { status: 409 })
  }

  const usuario = await prisma.user.create({
    data: { ...parsed.data, password: await bcrypt.hash(parsed.data.password, 10) },
  })

  return NextResponse.json(serialize(usuario), { status: 201 })
}
