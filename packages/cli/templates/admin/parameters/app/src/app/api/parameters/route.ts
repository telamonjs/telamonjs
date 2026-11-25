import { NextRequest, NextResponse } from 'next/server'
import { createPaginatedResponse, sanitizePaginationParams } from '@telamonjs/data'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { invalidValue, parameterSchema } from '@/lib/parameters'

const SORTABLE_FIELDS = new Set(['key', 'type', 'group', 'public', 'updatedAt'])

export async function GET(request: NextRequest) {
  const currentUser = await requirePermission('parameters.read')
  if (currentUser instanceof NextResponse) return currentUser

  const params = new URL(request.url).searchParams
  const num = (key: string) => Number(params.get(key)) || undefined
  const { page, pageSize } = sanitizePaginationParams({ page: num('page'), pageSize: num('pageSize') })
  const sortByParam = params.get('sortBy')
  const sortBy = sortByParam && SORTABLE_FIELDS.has(sortByParam) ? sortByParam : 'key'
  const sortOrder = params.get('sortOrder') === 'desc' ? 'desc' : 'asc'
  const search = params.get('search') || undefined
  const group = params.get('group') || undefined

  const where = {
    ...(group && { group }),
    ...(search && {
      OR: [
        { key: { contains: search, mode: 'insensitive' as const } },
        { group: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [data, total] = await Promise.all([
    prisma.parameter.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.parameter.count({ where }),
  ])

  return NextResponse.json(createPaginatedResponse(data, total, page, pageSize))
}

export async function POST(request: NextRequest) {
  const currentUser = await requirePermission('parameters.write')
  if (currentUser instanceof NextResponse) return currentUser

  const parsed = parameterSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Invalid data' },
      { status: 400 }
    )
  }
  const invalid = invalidValue(parsed.data.type, parsed.data.value)
  if (invalid) return NextResponse.json({ message: invalid }, { status: 400 })

  if (await prisma.parameter.findUnique({ where: { key: parsed.data.key } })) {
    return NextResponse.json({ message: 'This key is already in use' }, { status: 409 })
  }

  const parameter = await prisma.parameter.create({ data: parsed.data })
  return NextResponse.json(parameter, { status: 201 })
}
