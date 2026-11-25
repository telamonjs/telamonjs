import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { hashApiKey } from '@telamonjs/auth'
import { prisma } from '@/lib/prisma'
import { invitationStatus } from '@/lib/invitations'

const acceptSchema = z.object({
  token: z.string().min(1),
  name: z.string().trim().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

class Gone extends Error {}

/**
 * POST /api/invitations/accept — no session. Creates the user (active, with
 * the invited roles) and marks the invitation ACCEPTED in one transaction.
 * Every unusable token (unknown, used, revoked, expired) gets the same 410.
 */
export async function POST(request: NextRequest) {
  const parsed = acceptSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Invalid data' },
      { status: 400 }
    )
  }
  const { token, name, password } = parsed.data
  const tokenHash = await hashApiKey(token)
  const gone = () =>
    NextResponse.json({ message: 'This invitation is invalid or has expired' }, { status: 410 })

  // Cheap check first: no bcrypt work for a token that can't be used
  const pending = await prisma.invitation.findUnique({ where: { tokenHash }, select: { status: true, expiresAt: true } })
  if (!pending || invitationStatus(pending) !== 'PENDING') return gone()
  const passwordHash = await bcrypt.hash(password, 10)

  try {
    const user = await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({ where: { tokenHash } })
      if (!invitation || invitationStatus(invitation) !== 'PENDING') throw new Gone()
      if (await tx.user.findFirst({ where: { email: { equals: invitation.email, mode: 'insensitive' } } })) {
        return null
      }
      // Roles deleted since the invitation are skipped
      const roles = await tx.role.findMany({ where: { id: { in: invitation.roleIds } }, select: { id: true } })
      const created = await tx.user.create({
        data: {
          name,
          email: invitation.email,
          password: passwordHash,
          active: true,
          // The link reached this inbox
          emailVerified: new Date(),
          roles: { create: roles.map(({ id }) => ({ roleId: id })) },
        },
        select: { id: true, email: true },
      })
      // Conditional: a concurrent accept of the same token rolls this one back
      const { count } = await tx.invitation.updateMany({
        where: { id: invitation.id, status: 'PENDING' },
        data: { status: 'ACCEPTED', acceptedAt: new Date(), userId: created.id },
      })
      if (count !== 1) throw new Gone()
      return created
    })
    if (!user) {
      return NextResponse.json(
        { message: 'An account with this email already exists: sign in instead' },
        { status: 409 }
      )
    }
    return NextResponse.json({ email: user.email }, { status: 201 })
  } catch (error) {
    if (error instanceof Gone) return gone()
    throw error
  }
}
