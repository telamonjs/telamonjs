import { NextRequest, NextResponse } from 'next/server'
import { hashApiKey } from '@telamonjs/auth'
import { prisma } from '@/lib/prisma'
import { invitationStatus } from '@/lib/invitations'

type Params = { params: Promise<{ token: string }> }

/**
 * GET /api/invitations/by-token/:token — no session: what the accept page
 * shows. Holding the token is the proof, so only a PENDING invitation reveals
 * its email and name; the others answer their status alone. An unknown token
 * is a 404 with no detail.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const found = await prisma.invitation.findUnique({
    where: { tokenHash: await hashApiKey((await params).token) },
  })
  if (!found) return NextResponse.json({ message: 'Invitation not found' }, { status: 404 })

  const status = invitationStatus(found)
  if (status !== 'PENDING') return NextResponse.json({ status })
  return NextResponse.json({ status, email: found.email, name: found.name, expiresAt: found.expiresAt })
}
