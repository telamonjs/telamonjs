/**
 * Invitations: an admin invites an email with roles; the invitee opens
 * /convite/<token>, picks a password and becomes a user. Server-only (Prisma).
 *
 * The token is a random 32-byte key (`generateApiKey`); only its sha256
 * (`hashApiKey`) is stored, so a database leak hands out no usable link.
 */
import { generateApiKey, hashApiKey } from '@telamonjs/auth'
import type { Invitation } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sendMail } from '@/lib/mail'

/** How long a link stays valid, from its creation or its last resend. */
export const INVITATION_TTL_DAYS = 7

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'

/** The stored status, with a PENDING row past its expiry read as EXPIRED. */
export function invitationStatus(row: Pick<Invitation, 'status' | 'expiresAt'>): InvitationStatus {
  if (row.status === 'PENDING' && row.expiresAt.getTime() <= Date.now()) return 'EXPIRED'
  return row.status as InvitationStatus
}

/** A fresh token, its hash (what the row stores) and the expiry it carries. */
export async function newToken() {
  const token = generateApiKey()
  return {
    token,
    tokenHash: await hashApiKey(token),
    expiresAt: new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000),
  }
}

/**
 * The public URL of the app: the accept link must not come from the request's
 * Host header. NEXTAUTH_URL is already required in production (src/auth.ts).
 */
function appUrl(): string {
  const url = process.env.NEXTAUTH_URL
  if (!url) throw new Error('Set NEXTAUTH_URL: invitation links are built from it')
  return url.replace(/\/+$/, '')
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/**
 * The invitation email. Edit the copy here (language, branding); the link is
 * the only part the flow depends on.
 */
export function invitationEmail(invitation: Pick<Invitation, 'name' | 'expiresAt'>, token: string) {
  const link = `${appUrl()}/convite/${encodeURIComponent(token)}`
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'the app'
  const greeting = invitation.name ? `Hello ${invitation.name},` : 'Hello,'
  const expires = invitation.expiresAt.toISOString().slice(0, 10)
  return {
    subject: `You're invited to ${appName}`,
    text: `${greeting}\n\nYou have been invited to ${appName}. Choose your password here:\n${link}\n\nThe link expires on ${expires}. If you weren't expecting it, ignore this email.`,
    html: `<p>${escapeHtml(greeting)}</p><p>You have been invited to ${escapeHtml(appName)}.</p><p><a href="${escapeHtml(link)}">Choose your password</a></p><p>The link expires on ${expires}. If you weren't expecting it, ignore this email.</p>`,
  }
}

export function sendInvitation(invitation: Pick<Invitation, 'email' | 'name' | 'expiresAt'>, token: string) {
  return sendMail({ to: invitation.email, ...invitationEmail(invitation, token) })
}

/** API rows: no token hash; role names and the inviter resolved (two queries). */
export async function serializeInvitations(rows: Invitation[]) {
  const [roles, inviters] = await Promise.all([
    prisma.role.findMany({
      where: { id: { in: [...new Set(rows.flatMap((row) => row.roleIds))] } },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { id: { in: [...new Set(rows.map((row) => row.invitedById))] } },
      select: { id: true, name: true, email: true },
    }),
  ])
  const roleById = new Map(roles.map((role) => [role.id, role]))
  const inviterById = new Map(inviters.map((user) => [user.id, user]))
  return rows.map(({ tokenHash: _tokenHash, ...row }) => ({
    ...row,
    status: invitationStatus(row),
    roles: row.roleIds.flatMap((id) => roleById.get(id) ?? []),
    invitedBy: inviterById.get(row.invitedById) ?? null,
  }))
}
