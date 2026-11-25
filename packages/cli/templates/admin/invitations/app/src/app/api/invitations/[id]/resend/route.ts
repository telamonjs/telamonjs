import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { invitationStatus, newToken, sendInvitation, serializeInvitations } from '@/lib/invitations'

type Params = { params: Promise<{ id: string }> }

/** POST /api/invitations/:id/resend — a new link (the old one stops working) and a new expiry. */
export async function POST(_request: NextRequest, { params }: Params) {
  const currentUser = await requirePermission('invitations.write')
  if (currentUser instanceof NextResponse) return currentUser

  const found = await prisma.invitation.findUnique({ where: { id: (await params).id } })
  if (!found) return NextResponse.json({ message: 'Invitation not found' }, { status: 404 })
  const status = invitationStatus(found)
  if (status !== 'PENDING' && status !== 'EXPIRED') {
    return NextResponse.json({ message: 'Only pending or expired invitations can be resent' }, { status: 409 })
  }

  const { token, tokenHash, expiresAt } = await newToken()
  const invitation = await prisma.invitation.update({
    where: { id: found.id },
    data: { tokenHash, expiresAt, resendCount: { increment: 1 } },
  })
  await sendInvitation(invitation, token)

  const [serialized] = await serializeInvitations([invitation])
  return NextResponse.json(serialized)
}
