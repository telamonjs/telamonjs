/**
 * Templates for the Next.js route handlers backing the API client.
 * Reference: packages/cli/templates/app/src/app/api/usuarios/{route.ts,[id]/route.ts}
 *
 * Generic hard-delete (no soft-delete/`ativo` special-casing -- usuarios has
 * that because deactivating a login is a domain rule, not a CRUD default).
 * Generated modules also don't hash `password`-type fields automatically;
 * add bcrypt hashing by hand if a generated model handles auth credentials.
 */
import { PrismaField } from '../utils/prisma-detector.js'
import { lowerFirst } from '../utils/formatters.js'
import { fieldPropName, formFields, isSensitive, zodFor } from '../utils/field-mapping.js'

export interface RouteHandlerOptions {
  name: string
  modelName: string
  fields: PrismaField[]
}

/** Field names considered credential-like -- stripped from every JSON response. */
export function sensitiveFieldNames(fields: PrismaField[]): string[] {
  return fields.filter(isSensitive).map(f => f.name)
}

function serializeBlock(sensitive: string[]): string {
  if (!sensitive.length) return ''
  return `function serialize<T extends Record<string, unknown>>(obj: T) {
  const { ${sensitive.map(s => `${s}: _${s}`).join(', ')}, ...rest } = obj
  return rest
}

`
}

/** Pagination query params, validated instead of raw `Number()` -- rejects a
 * non-numeric/negative page and caps pageSize so a client can't request the
 * whole table in one page. */
export const PAGINATION_SCHEMA_EXPR =
  'z.object({\n' +
  '  page: z.coerce.number().int().positive().default(1),\n' +
  '  pageSize: z.coerce.number().int().positive().max(100).default(10),\n' +
  '})'

/** Inline predicate embedded in generated PATCH/DELETE catch blocks to detect
 * Prisma's "record to update/delete not found" error (P2025) -- duck-typed on
 * `.code` (via `in`-narrowing, no cast needed) so the generated route doesn't
 * need an `@prisma/client` import just for the error type. */
export const RECORD_NOT_FOUND_PREDICATE =
  "error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2025'"

export function generateRouteHandler(options: RouteHandlerOptions): string {
  const { modelName, fields } = options
  const prismaModel = lowerFirst(modelName)
  const createFields = formFields(fields)
  const searchable = fields.filter(f => f.searchable)
  const sortable = fields.filter(f => f.showInTable || f.isId).map(f => f.name)
  const hasCreatedAt = fields.some(f => f.name === 'createdAt')
  if (hasCreatedAt && !sortable.includes('createdAt')) sortable.push('createdAt')
  const defaultSort = hasCreatedAt ? 'createdAt' : (fields.find(f => f.isId)?.name ?? 'id')

  const searchBlock = searchable.length
    ? `  const search = searchParams.get('search') || undefined\n`
    : ''
  const whereBlock = searchable.length
    ? `  const where = search
    ? {
        OR: [
${searchable.map(f => `          { ${f.name}: { contains: search, mode: 'insensitive' as const } },`).join('\n')}
        ],
      }
    : undefined`
    : `  const where = undefined`

  const sensitive = sensitiveFieldNames(fields)
  const listData = sensitive.length ? 'data.map(serialize)' : 'data'
  const createdResult = sensitive.length ? 'serialize(created)' : 'created'

  return `import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const paginationSchema = ${PAGINATION_SCHEMA_EXPR}

const createSchema = z.object({
${createFields.map(f => `  ${fieldPropName(f)}: ${zodFor(f)},`).join('\n')}
})

const SORTABLE_FIELDS = new Set([${sortable.map(s => `'${s}'`).join(', ')}])

${serializeBlock(sensitive)}export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const pagination = paginationSchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
  })
  if (!pagination.success) {
    return NextResponse.json({ message: 'Parâmetros de paginação inválidos' }, { status: 400 })
  }
  const { page, pageSize } = pagination.data
${searchBlock}  const sortByParam = searchParams.get('sortBy')
  const sortBy = sortByParam && SORTABLE_FIELDS.has(sortByParam) ? sortByParam : '${defaultSort}'
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

${whereBlock}

  const [data, total] = await Promise.all([
    prisma.${prismaModel}.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.${prismaModel}.count({ where }),
  ])

  return NextResponse.json({
    data: ${listData},
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

  const parsed = createSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  const created = await prisma.${prismaModel}.create({ data: parsed.data })
  return NextResponse.json(${createdResult}, { status: 201 })
}
`
}

export function generateIdRouteHandler(options: RouteHandlerOptions): string {
  const { modelName, fields } = options
  const prismaModel = lowerFirst(modelName)
  const updateFields = formFields(fields)
  const sensitive = sensitiveFieldNames(fields)
  const foundResult = sensitive.length ? 'serialize(found)' : 'found'
  const updatedResult = sensitive.length ? 'serialize(updated)' : 'updated'

  return `import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const updateSchema = z.object({
${updateFields.map(f => `  ${fieldPropName(f)}: ${zodFor(f, { forceOptional: true })},`).join('\n')}
})

${serializeBlock(sensitive)}export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params
  const found = await prisma.${prismaModel}.findUnique({ where: { id } })
  if (!found) {
    return NextResponse.json({ message: 'Registro não encontrado' }, { status: 404 })
  }

  return NextResponse.json(${foundResult})
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params
  const parsed = updateSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    )
  }

  try {
    const updated = await prisma.${prismaModel}.update({ where: { id }, data: parsed.data })
    return NextResponse.json(${updatedResult})
  } catch (error) {
    if (${RECORD_NOT_FOUND_PREDICATE}) {
      return NextResponse.json({ message: 'Registro não encontrado' }, { status: 404 })
    }
    throw error
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params
  try {
    await prisma.${prismaModel}.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (${RECORD_NOT_FOUND_PREDICATE}) {
      return NextResponse.json({ message: 'Registro não encontrado' }, { status: 404 })
    }
    throw error
  }
}
`
}
