import { BadGatewayException, BadRequestException, ConflictException, GoneException, Logger } from '@nestjs/common'
import { hashApiKey } from '@telamonjs/auth'
import { InvitationsService, invitationStatus } from './invitations.service'
import type { MailSender } from '../mail/mail.module'
import type { PrismaService } from '../../common/prisma/prisma.service'

const DAY = 24 * 60 * 60 * 1000
const row = (over: Record<string, unknown> = {}) => ({
  id: 'i1',
  tokenHash: 'hash',
  email: 'new@example.com',
  name: 'New',
  roleIds: ['r1'],
  status: 'PENDING',
  expiresAt: new Date(Date.now() + DAY),
  acceptedAt: null,
  resendCount: 0,
  invitedById: 'u1',
  userId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
})

function setup() {
  const client = {
    role: {
      // every requested role exists
      count: jest.fn().mockImplementation(({ where }) => Promise.resolve(where.id.in.length)),
      findMany: jest.fn().mockResolvedValue([{ id: 'r1', name: 'Editor' }]),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'u2', email: 'new@example.com' }),
    },
    invitation: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(row()),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve(row(data))),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve(row({ tokenHash: data.tokenHash }))),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  }
  client.$transaction.mockImplementation((fn: (tx: typeof client) => unknown) => fn(client))
  const mail = { send: jest.fn().mockResolvedValue(undefined) }
  const service = new InvitationsService({ client } as unknown as PrismaService, mail as MailSender)
  return { client, mail, service }
}

beforeAll(() => {
  process.env.NEXTAUTH_URL = 'https://app.example.com/'
})

describe('InvitationsService', () => {
  it('invitationStatus() reads a pending row past its expiry as EXPIRED', () => {
    expect(invitationStatus({ status: 'PENDING', expiresAt: new Date(Date.now() - 1) })).toBe('EXPIRED')
    expect(invitationStatus({ status: 'PENDING', expiresAt: new Date(Date.now() + DAY) })).toBe('PENDING')
    expect(invitationStatus({ status: 'REVOKED', expiresAt: new Date(Date.now() - 1) })).toBe('REVOKED')
  })

  it('create() stores only the token hash and mails the link carrying the token', async () => {
    const { client, mail, service } = setup()
    const result = await service.create({ email: 'new@example.com', roleIds: ['r1'] }, 'u1')

    const { data } = client.invitation.create.mock.calls[0][0]
    const { to, text } = mail.send.mock.calls[0][0]
    const token = /\/convite\/([\w-]+)/.exec(text)?.[1] ?? ''
    expect(to).toBe('new@example.com')
    expect(text).toContain('https://app.example.com/convite/')
    expect(data.tokenHash).toBe(await hashApiKey(token))
    expect(data.expiresAt.getTime()).toBeGreaterThan(Date.now() + 6 * DAY)
    expect(result).not.toHaveProperty('tokenHash')
    expect(result.roles).toEqual([{ id: 'r1', name: 'Editor' }])
  })

  it('create() rejects an unknown role, an existing user and a pending invitation', async () => {
    const unknownRole = setup()
    unknownRole.client.role.count.mockResolvedValue(0)
    await expect(unknownRole.service.create({ email: 'a@a.com', roleIds: ['nope'] }, 'u1')).rejects.toThrow(BadRequestException)

    const existingUser = setup()
    existingUser.client.user.findFirst.mockResolvedValue({ id: 'u9' })
    await expect(existingUser.service.create({ email: 'a@a.com' }, 'u1')).rejects.toThrow(ConflictException)

    const pending = setup()
    pending.client.invitation.findFirst.mockResolvedValue(row())
    await expect(pending.service.create({ email: 'a@a.com' }, 'u1')).rejects.toThrow(ConflictException)
  })

  it('create() drops the row when the email cannot be sent', async () => {
    const { client, mail, service } = setup()
    mail.send.mockRejectedValue(new Error('smtp down'))
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {})

    await expect(service.create({ email: 'new@example.com' }, 'u1')).rejects.toThrow(BadGatewayException)
    expect(client.invitation.delete).toHaveBeenCalledWith({ where: { id: 'i1' } })
  })

  it('resend() rotates the token and bumps resendCount; an accepted one is refused', async () => {
    const { client, service } = setup()
    await service.resend('i1')
    const { data } = client.invitation.update.mock.calls[0][0]
    expect(data.tokenHash).not.toBe('hash')
    expect(data.resendCount).toEqual({ increment: 1 })

    const accepted = setup()
    accepted.client.invitation.findUnique.mockResolvedValue(row({ status: 'ACCEPTED' }))
    await expect(accepted.service.resend('i1')).rejects.toThrow(ConflictException)
  })

  it('byToken() reveals the email only while the invitation is pending', async () => {
    const { client, service } = setup()
    expect(await service.byToken('t')).toMatchObject({ status: 'PENDING', email: 'new@example.com' })

    client.invitation.findUnique.mockResolvedValue(row({ expiresAt: new Date(Date.now() - 1) }))
    expect(await service.byToken('t')).toEqual({ status: 'EXPIRED' })
  })

  it('accept() creates the active user with the invited roles and marks the invitation accepted', async () => {
    const { client, service } = setup()
    expect(await service.accept({ token: 't', name: 'New', password: 'long-enough' })).toEqual({ email: 'new@example.com' })

    const { data } = client.user.create.mock.calls[0][0]
    expect(data).toMatchObject({ email: 'new@example.com', active: true, roles: { create: [{ roleId: 'r1' }] } })
    expect(data.password).not.toBe('long-enough')
    expect(client.invitation.updateMany.mock.calls[0][0].data).toMatchObject({ status: 'ACCEPTED', userId: 'u2' })
  })

  it('accept() answers 410 for an unusable token, before hashing the password', async () => {
    const { client, service } = setup()
    client.invitation.findUnique.mockResolvedValue(row({ status: 'ACCEPTED' }))
    await expect(service.accept({ token: 't', name: 'New', password: 'long-enough' })).rejects.toThrow(GoneException)
    expect(client.$transaction).not.toHaveBeenCalled()
  })
})
