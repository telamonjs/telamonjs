import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { markRoleHoldersStale } from '@/rbac'

type Params = { params: Promise<{ id: string; permissionId: string }> }

/** Grant (POST) or revoke (DELETE) one permission — one PermissionMatrix cell. */
async function toggle({ params }: Params, grant: boolean) {
  const currentUser = await requirePermission('roles.write')
  if (currentUser instanceof NextResponse) return currentUser

  const { id: roleId, permissionId } = await params
  const role = await prisma.role.findUnique({ where: { id: roleId } })
  if (!role) return NextResponse.json({ message: 'Role not found' }, { status: 404 })
  if (role.system) {
    return NextResponse.json({ message: 'Built-in roles cannot be changed' }, { status: 400 })
  }

  if (grant) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      update: {},
      create: { roleId, permissionId },
    })
  } else {
    await prisma.rolePermission.deleteMany({ where: { roleId, permissionId } })
  }
  // Every holder's token now carries the wrong permission list
  await markRoleHoldersStale(prisma, roleId)
  return new NextResponse(null, { status: 204 })
}

export function POST(_request: NextRequest, ctx: Params) {
  return toggle(ctx, true)
}

export function DELETE(_request: NextRequest, ctx: Params) {
  return toggle(ctx, false)
}
