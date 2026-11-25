import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { invitationStatus, serializeInvitations } from '@/lib/invitations'

type Params = { params: Promise<{ id: string }> }

/** PUT /api/invitations/:id/revoke — the link stops working; the row stays for the record. */
export async function PUT(_request: NextRequest, { params }: Params) {
  const currentUser = await requirePermission('invitations.write')
  if (currentUser instanceof NextResponse) return currentUser

  const found = await prisma.invitation.findUnique({ where: { id: (await params).id } })
  if (!found) return NextResponse.json({ message: 'Invitation not found' }, { status: 404 })
  const status = invitationStatus(found)
  if (status !== 'PENDING' && status !== 'EXPIRED') {
    return NextResponse.json({ message: 'Only pending or expired invitations can be revoked' }, { status: 409 })
  }

  const invitation = await prisma.invitation.update({ where: { id: found.id }, data: { status: 'REVOKED' } })
  const [serialized] = await serializeInvitations([invitation])
  return NextResponse.json(serialized)
}
