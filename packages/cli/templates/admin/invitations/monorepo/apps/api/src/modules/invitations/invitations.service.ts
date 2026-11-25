import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  GoneException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import bcrypt from 'bcryptjs'
import type { Invitation } from '@prisma/client'
import { generateApiKey, hashApiKey } from '@telamonjs/auth'
import { createPaginatedResponse, sanitizePaginationParams } from '@telamonjs/data'
import { PrismaService } from '../../common/prisma/prisma.service'
import { MAIL_SENDER, type MailSender } from '../mail/mail.module'
import { AcceptInvitationDto, CreateInvitationDto } from './dto/invitation.dto'

/** How long a link stays valid, from its creation or its last resend. */
export const INVITATION_TTL_DAYS = 7

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'

/** The stored status, with a PENDING row past its expiry read as EXPIRED. */
export function invitationStatus(row: Pick<Invitation, 'status' | 'expiresAt'>): InvitationStatus {
  if (row.status === 'PENDING' && row.expiresAt.getTime() <= Date.now()) return 'EXPIRED'
  return row.status as InvitationStatus
}

/**
 * The public URL of the app: the accept link must not come from a request's
 * Host header. NEXTAUTH_URL is the web app's public URL (root .env).
 */
function appUrl(): string {
  const url = process.env.NEXTAUTH_URL
  if (!url) throw new Error('Set NEXTAUTH_URL: invitation links are built from it')
  return url.replace(/\/+$/, '')
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

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

interface ListQuery {
  page?: string
  pageSize?: string
  search?: string
  sortBy?: string
  sortOrder?: string
}

const SORTABLE_FIELDS = new Set(['email', 'name', 'status', 'expiresAt', 'createdAt'])

/**
 * Invitations. The token is a random 32-byte key (`generateApiKey`); only its
 * sha256 (`hashApiKey`) is stored, so a database leak hands out no usable link.
 */
@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name)

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MAIL_SENDER) private readonly mail: MailSender
  ) {}

  private async newToken() {
    const token = generateApiKey()
    return {
      token,
      tokenHash: await hashApiKey(token),
      expiresAt: new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000),
    }
  }

  private send(invitation: Invitation, token: string) {
    return this.mail.send({ to: invitation.email, ...invitationEmail(invitation, token) })
  }

  /** API rows: no token hash; role names and the inviter resolved (two queries). */
  private async serialize(rows: Invitation[]) {
    const client = this.prisma.client
    const [roles, inviters] = await Promise.all([
      client.role.findMany({
        where: { id: { in: [...new Set(rows.flatMap((row) => row.roleIds))] } },
        select: { id: true, name: true },
      }),
      client.user.findMany({
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

  async list(query: ListQuery) {
    const { page, pageSize } = sanitizePaginationParams({
      page: Number(query.page) || undefined,
      pageSize: Number(query.pageSize) || undefined,
    })
    const sortBy = query.sortBy && SORTABLE_FIELDS.has(query.sortBy) ? query.sortBy : 'createdAt'
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc'
    const search = query.search || undefined
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined

    const client = this.prisma.client
    const [rows, total] = await Promise.all([
      client.invitation.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      client.invitation.count({ where }),
    ])
    return createPaginatedResponse(await this.serialize(rows), total, page, pageSize)
  }

  async create(dto: CreateInvitationDto, invitedById: string) {
    const client = this.prisma.client
    const roleIds = [...new Set(dto.roleIds ?? [])]
    if ((await client.role.count({ where: { id: { in: roleIds } } })) !== roleIds.length) {
      throw new BadRequestException('Unknown role')
    }
    if (await client.user.findFirst({ where: { email: { equals: dto.email, mode: 'insensitive' } } })) {
      throw new ConflictException('A user with this email already exists')
    }
    if (await client.invitation.findFirst({ where: { email: dto.email, status: 'PENDING', expiresAt: { gt: new Date() } } })) {
      throw new ConflictException('This email already has a pending invitation: resend it instead')
    }

    const { token, tokenHash, expiresAt } = await this.newToken()
    const invitation = await client.invitation.create({
      data: { email: dto.email, name: dto.name || null, roleIds, tokenHash, expiresAt, invitedById },
    })
    try {
      await this.send(invitation, token)
    } catch (error) {
      // No email went out: drop the row, or it would block a new invitation (409)
      await client.invitation.delete({ where: { id: invitation.id } })
      this.logger.error('Sending the invitation failed', error instanceof Error ? error.stack : error)
      throw new BadGatewayException('Could not send the invitation email')
    }
    const [serialized] = await this.serialize([invitation])
    return serialized
  }

  private async findResendable(id: string, verb: string) {
    const found = await this.prisma.client.invitation.findUnique({ where: { id } })
    if (!found) throw new NotFoundException('Invitation not found')
    const status = invitationStatus(found)
    if (status !== 'PENDING' && status !== 'EXPIRED') {
      throw new ConflictException(`Only pending or expired invitations can be ${verb}`)
    }
    return found
  }

  /** A new link (the old one stops working) and a new expiry. */
  async resend(id: string) {
    const found = await this.findResendable(id, 'resent')
    const { token, tokenHash, expiresAt } = await this.newToken()
    const invitation = await this.prisma.client.invitation.update({
      where: { id: found.id },
      data: { tokenHash, expiresAt, resendCount: { increment: 1 } },
    })
    await this.send(invitation, token)
    const [serialized] = await this.serialize([invitation])
    return serialized
  }

  /** The link stops working; the row stays for the record. */
  async revoke(id: string) {
    const found = await this.findResendable(id, 'revoked')
    const invitation = await this.prisma.client.invitation.update({
      where: { id: found.id },
      data: { status: 'REVOKED' },
    })
    const [serialized] = await this.serialize([invitation])
    return serialized
  }

  /**
   * Public. Holding the token is the proof, so only a PENDING invitation
   * reveals its email and name; the others answer their status alone. An
   * unknown token is a 404 with no detail.
   */
  async byToken(token: string) {
    const found = await this.prisma.client.invitation.findUnique({ where: { tokenHash: await hashApiKey(token) } })
    if (!found) throw new NotFoundException('Invitation not found')
    const status = invitationStatus(found)
    if (status !== 'PENDING') return { status }
    return { status, email: found.email, name: found.name, expiresAt: found.expiresAt }
  }

  /**
   * Public. Creates the user (active, with the invited roles) and marks the
   * invitation ACCEPTED in one transaction. Every unusable token (unknown,
   * used, revoked, expired) gets the same 410.
   */
  async accept(dto: AcceptInvitationDto) {
    const client = this.prisma.client
    const tokenHash = await hashApiKey(dto.token)
    const gone = () => new GoneException('This invitation is invalid or has expired')

    // Cheap check first: no bcrypt work for a token that can't be used
    const pending = await client.invitation.findUnique({ where: { tokenHash }, select: { status: true, expiresAt: true } })
    if (!pending || invitationStatus(pending) !== 'PENDING') throw gone()
    const password = await bcrypt.hash(dto.password, 10)

    return client.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({ where: { tokenHash } })
      if (!invitation || invitationStatus(invitation) !== 'PENDING') throw gone()
      if (await tx.user.findFirst({ where: { email: { equals: invitation.email, mode: 'insensitive' } } })) {
        throw new ConflictException('An account with this email already exists: sign in instead')
      }
      // Roles deleted since the invitation are skipped
      const roles = await tx.role.findMany({ where: { id: { in: invitation.roleIds } }, select: { id: true } })
      const user = await tx.user.create({
        data: {
          name: dto.name,
          email: invitation.email,
          password,
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
        data: { status: 'ACCEPTED', acceptedAt: new Date(), userId: user.id },
      })
      if (count !== 1) throw gone()
      return { email: user.email }
    })
  }
}
