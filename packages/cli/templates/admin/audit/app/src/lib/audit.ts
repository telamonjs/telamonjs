/**
 * Audit trail of the Route Handlers. Next.js has no interceptors, so each
 * mutating handler calls `audit()` once it succeeds (src/app/api/usuarios and
 * src/app/api/roles already do). Secrets in `changes` are masked
 * (`redactPayload`); a failed write is logged and never fails the request.
 */
import type { Prisma } from '@prisma/client'
import { computeDiff, redactPayload } from '@telamonjs/data'
import { prisma } from '@/lib/prisma'

export interface AuditInput {
  /** CREATE, UPDATE, DELETE, ACTIVATE, DEACTIVATE, GRANT, REVOKE... */
  action: string
  /** The resource, as its route names it: 'usuarios', 'roles'... */
  entityType: string
  entityId?: string
  /** What was sent. With `before`, only the fields that changed are kept (`computeDiff`). */
  changes?: object
  /** The row before an update. */
  before?: object
  /** The response status. Default 200. */
  statusCode?: number
}

export async function audit(request: Request, user: { id: string }, input: AuditInput): Promise<void> {
  const { before, changes, statusCode = 200, ...entry } = input
  const payload = before && changes ? computeDiff(before, changes) : changes
  try {
    await prisma.auditLog.create({
      data: {
        ...entry,
        userId: user.id,
        changes:
          payload && Object.keys(payload).length > 0
            ? (redactPayload(payload) as Prisma.InputJsonValue)
            : undefined,
        // Behind a proxy, the first X-Forwarded-For hop is the client
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        userAgent: request.headers.get('user-agent'),
        method: request.method,
        path: new URL(request.url).pathname,
        statusCode,
      },
    })
  } catch (error) {
    console.error('[audit] write failed', error)
  }
}

/** Entries with the name and email of the user who acted (`user`, null when deleted or anonymous). */
export async function withUsers<T extends { userId: string | null }>(entries: T[]) {
  const ids = [...new Set(entries.flatMap((entry) => (entry.userId ? [entry.userId] : [])))]
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, email: true },
  })
  const byId = new Map(users.map((user) => [user.id, user]))
  return entries.map((entry) => ({ ...entry, user: (entry.userId && byId.get(entry.userId)) || null }))
}
