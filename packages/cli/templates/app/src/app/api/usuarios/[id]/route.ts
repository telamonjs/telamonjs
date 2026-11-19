import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(5, 'Senha deve ter no mínimo 5 caracteres').optional(),
  role: z.enum(['ADMIN', 'USER']).optional(),
  ativo: z.boolean().optional(),
})

function serialize<T extends { password: string }>({ password: _password, ...rest }: T) {
  return rest
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params
  const usuario = await prisma.user.findUnique({ where: { id } })
  if (!usuario) {
    return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 })
  }

  return NextResponse.json(serialize(usuario))
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

  // Users can't deactivate themselves
  if (currentUser.id === id && parsed.data.ativo === false) {
    return NextResponse.json(
      { message: 'Você não pode desativar seu próprio usuário' },
      { status: 400 }
    )
  }

  if (parsed.data.email) {
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
    if (existing && existing.id !== id) {
      return NextResponse.json(
        { message: 'Este email já está em uso por outro usuário' },
        { status: 409 }
      )
    }
  }

  const { password, ...rest } = parsed.data
  const usuario = await prisma.user.update({
    where: { id },
    data: { ...rest, ...(password ? { password: await bcrypt.hash(password, 10) } : {}) },
  })

  return NextResponse.json(serialize(usuario))
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

  // Users can't deactivate themselves
  if (currentUser.id === id) {
    return NextResponse.json(
      { message: 'Você não pode desativar seu próprio usuário' },
      { status: 400 }
    )
  }

  // Soft delete: deactivate instead of removing the row
  await prisma.user.update({ where: { id }, data: { ativo: false } })
  return new NextResponse(null, { status: 204 })
}
