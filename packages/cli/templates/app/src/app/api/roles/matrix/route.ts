import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

/** Everything the PermissionMatrix needs, in one request. */
export async function GET() {
  const currentUser = await requirePermission('roles.read')
  if (currentUser instanceof NextResponse) return currentUser

  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        system: true,
        permissions: { select: { permissionId: true } },
      },
    }),
    prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
      select: { id: true, code: true, module: true, action: true, category: true, description: true },
    }),
  ])

  return NextResponse.json({
    roles: roles.map(({ permissions: granted, ...role }) => ({
      ...role,
      permissionIds: granted.map((g) => g.permissionId),
    })),
    permissions,
  })
}
