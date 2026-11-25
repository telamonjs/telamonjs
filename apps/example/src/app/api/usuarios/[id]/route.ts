import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(5, 'Password must be at least 5 characters').optional(),
  roleIds: z.array(z.string()).optional(),
  active: z.boolean().optional(),
})

const include = { roles: { select: { role: { select: { id: true, code: true, name: true } } } } }

function serialize({
  password: _password,
  roles,
  ...rest
}: Prisma.UserGetPayload<{ include: typeof include }>) {
  return { ...rest, roles: roles.map(({ role }) => role) }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await requirePermission('users.read')
  if (currentUser instanceof NextResponse) return currentUser

  const { id } = await params
  const usuario = await prisma.user.findUnique({ where: { id }, include })
  if (!usuario) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 })
  }

  return NextResponse.json(serialize(usuario))
}

// Edit, (de)activate and role assignment. There is no DELETE: deactivating
// keeps the user's history and ends their sessions.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await requirePermission('users.write')
  if (currentUser instanceof NextResponse) return currentUser

  const { id } = await params
  const parsed = updateSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Invalid data' },
      { status: 400 }
    )
  }

  if (currentUser.id === id && parsed.data.active === false) {
    return NextResponse.json({ message: "You can't deactivate yourself" }, { status: 400 })
  }

  if (parsed.data.email) {
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
    if (existing && existing.id !== id) {
      return NextResponse.json(
        { message: 'This email is already in use by another user' },
        { status: 409 }
      )
    }
  }

  const { password, roleIds, active, ...rest } = parsed.data
  const now = new Date()
  const usuario = await prisma.user.update({
    where: { id },
    data: {
      ...rest,
      ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
      // New roles: the user's token goes stale and is refreshed on the next request
      ...(roleIds
        ? {
            roles: { deleteMany: {}, create: roleIds.map((roleId) => ({ roleId })) },
            accessChangedAt: now,
          }
        : {}),
      // Deactivated: every open session ends
      ...(active === undefined ? {} : { active, ...(active ? {} : { sessionsRevokedAt: now }) }),
    },
    include,
  })

  return NextResponse.json(serialize(usuario))
}
