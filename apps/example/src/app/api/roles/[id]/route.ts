import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { markRoleHoldersStale } from '@/rbac'

// Permissions are checked by permission code, never by role code, so a
// custom role's code can change. Built-in roles (`system`) are locked.
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z
    .string()
    .regex(/^[a-z][a-z0-9_-]*$/, 'Code: lowercase letters, digits, - and _')
    .optional(),
  description: z.string().optional(),
})

const select = {
  id: true,
  name: true,
  code: true,
  description: true,
  system: true,
  _count: { select: { users: true, permissions: true } },
} as const

type Params = { params: Promise<{ id: string }> }

/** The role, or the response to return: 404, or 400 for a built-in role. */
async function findEditable(id: string) {
  const role = await prisma.role.findUnique({ where: { id } })
  if (!role) return NextResponse.json({ message: 'Role not found' }, { status: 404 })
  if (role.system) {
    return NextResponse.json({ message: 'Built-in roles cannot be changed' }, { status: 400 })
  }
  return role
}

export async function GET(_request: NextRequest, { params }: Params) {
  const currentUser = await requirePermission('roles.read')
  if (currentUser instanceof NextResponse) return currentUser

  const role = await prisma.role.findUnique({ where: { id: (await params).id }, select })
  if (!role) return NextResponse.json({ message: 'Role not found' }, { status: 404 })
  return NextResponse.json(role)
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const currentUser = await requirePermission('roles.write')
  if (currentUser instanceof NextResponse) return currentUser

  const parsed = updateSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Invalid data' },
      { status: 400 }
    )
  }
  const found = await findEditable((await params).id)
  if (found instanceof NextResponse) return found

  if (parsed.data.code && parsed.data.code !== found.code) {
    if (await prisma.role.findUnique({ where: { code: parsed.data.code } })) {
      return NextResponse.json({ message: 'This code is already in use' }, { status: 409 })
    }
  }

  const role = await prisma.role.update({ where: { id: found.id }, data: parsed.data, select })
  // The holders' tokens carry the role's name and code (roles[])
  await markRoleHoldersStale(prisma, found.id)
  return NextResponse.json(role)
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const currentUser = await requirePermission('roles.write')
  if (currentUser instanceof NextResponse) return currentUser

  const found = await findEditable((await params).id)
  if (found instanceof NextResponse) return found

  // Holders lose the role's permissions: mark them before the rows go (cascade)
  await markRoleHoldersStale(prisma, found.id)
  await prisma.role.delete({ where: { id: found.id } })
  return new NextResponse(null, { status: 204 })
}
