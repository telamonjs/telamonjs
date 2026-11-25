import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { invalidValue, parameterSchema } from '@/lib/parameters'

type Params = { params: Promise<{ id: string }> }

const updateSchema = parameterSchema.partial()

export async function GET(_request: NextRequest, { params }: Params) {
  const currentUser = await requirePermission('parameters.read')
  if (currentUser instanceof NextResponse) return currentUser

  const parameter = await prisma.parameter.findUnique({ where: { id: (await params).id } })
  if (!parameter) return NextResponse.json({ message: 'Parameter not found' }, { status: 404 })
  return NextResponse.json(parameter)
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const currentUser = await requirePermission('parameters.write')
  if (currentUser instanceof NextResponse) return currentUser

  const parsed = updateSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Invalid data' },
      { status: 400 }
    )
  }
  const found = await prisma.parameter.findUnique({ where: { id: (await params).id } })
  if (!found) return NextResponse.json({ message: 'Parameter not found' }, { status: 404 })

  // The value must still parse once type and value are merged with the row
  const invalid = invalidValue(parsed.data.type ?? found.type, parsed.data.value ?? found.value)
  if (invalid) return NextResponse.json({ message: invalid }, { status: 400 })

  if (parsed.data.key && parsed.data.key !== found.key) {
    if (await prisma.parameter.findUnique({ where: { key: parsed.data.key } })) {
      return NextResponse.json({ message: 'This key is already in use' }, { status: 409 })
    }
  }

  const parameter = await prisma.parameter.update({ where: { id: found.id }, data: parsed.data })
  return NextResponse.json(parameter)
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const currentUser = await requirePermission('parameters.write')
  if (currentUser instanceof NextResponse) return currentUser

  const { count } = await prisma.parameter.deleteMany({ where: { id: (await params).id } })
  if (!count) return NextResponse.json({ message: 'Parameter not found' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
