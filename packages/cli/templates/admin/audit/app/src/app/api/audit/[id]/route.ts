import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { withUsers } from '@/lib/audit'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await requirePermission('audit.read')
  if (currentUser instanceof NextResponse) return currentUser

  const entry = await prisma.auditLog.findUnique({ where: { id: (await params).id } })
  if (!entry) {
    return NextResponse.json({ message: 'Audit entry not found' }, { status: 404 })
  }

  const [withUser] = await withUsers([entry])
  return NextResponse.json(withUser)
}
