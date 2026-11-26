import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createPaginatedResponse, sanitizePaginationParams } from '@telamonjs/data'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { canGrant } from '@/rbac'
import { newToken, sendInvitation, serializeInvitations } from '@/lib/invitations'

const createSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().nullish(),
  roleIds: z.array(z.string()).default([]),
})

const SORTABLE_FIELDS = new Set(['email', 'name', 'status', 'expiresAt', 'createdAt'])

export async function GET(request: NextRequest) {
  const currentUser = await requirePermission('invitations.read')
  if (currentUser instanceof NextResponse) return currentUser

  const params = new URL(request.url).searchParams
  const num = (key: string) => Number(params.get(key)) || undefined
  const { page, pageSize } = sanitizePaginationParams({ page: num('page'), pageSize: num('pageSize') })
  const sortByParam = params.get('sortBy')
  const sortBy = sortByParam && SORTABLE_FIELDS.has(sortByParam) ? sortByParam : 'createdAt'
  const sortOrder = params.get('sortOrder') === 'asc' ? 'asc' : 'desc'
  const search = params.get('search') || undefined

  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { name: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : undefined

  const [rows, total] = await Promise.all([
    prisma.invitation.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invitation.count({ where }),
  ])

  return NextResponse.json(createPaginatedResponse(await serializeInvitations(rows), total, page, pageSize))
}

export async function POST(request: NextRequest) {
  const currentUser = await requirePermission('invitations.write')
  if (currentUser instanceof NextResponse) return currentUser

  const parsed = createSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Invalid data' },
      { status: 400 }
    )
  }
  const { email, name, roleIds: rawRoleIds } = parsed.data
  const roleIds = [...new Set(rawRoleIds)]

  if ((await prisma.role.count({ where: { id: { in: roleIds } } })) !== roleIds.length) {
    return NextResponse.json({ message: 'Unknown role' }, { status: 400 })
  }
  // An invitation never confers more than the inviter holds (the admin role included)
  if (!(await canGrant(prisma, currentUser, { roleIds }))) {
    return NextResponse.json({ message: 'You can only invite with roles whose permissions you hold' }, { status: 403 })
  }
  if (await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })) {
    return NextResponse.json({ message: 'A user with this email already exists' }, { status: 409 })
  }
  if (
    await prisma.invitation.findFirst({
      where: { email, status: 'PENDING', expiresAt: { gt: new Date() } },
    })
  ) {
    return NextResponse.json(
      { message: 'This email already has a pending invitation: resend it instead' },
      { status: 409 }
    )
  }

  const { token, tokenHash, expiresAt } = await newToken()
  const invitation = await prisma.invitation.create({
    data: { email, name: name || null, roleIds, tokenHash, expiresAt, invitedById: currentUser.id },
  })
  try {
    await sendInvitation(invitation, token)
  } catch (error) {
    // No email went out: drop the row, or it would block a new invitation (409)
    await prisma.invitation.delete({ where: { id: invitation.id } })
    console.error('[invitations] sending failed', error)
    return NextResponse.json({ message: 'Could not send the invitation email' }, { status: 502 })
  }

  const [serialized] = await serializeInvitations([invitation])
  return NextResponse.json(serialized, { status: 201 })
}
