import type { Prisma } from '@prisma/client'
import { createAuditInterceptor } from '@telamonjs/data/nest'
import { PrismaService } from '../../common/prisma/prisma.service'

/**
 * Global (APP_INTERCEPTOR in AppModule): every successful, authenticated
 * POST/PUT/PATCH/DELETE becomes an AuditLog row — user, impersonator, action,
 * entity (`/v1/roles/42` → `roles`, `42`), redacted body, IP, user agent,
 * method, path, status. The response never waits on the write, and a failed
 * write is logged, never thrown. `@SkipAudit()` (from `@telamonjs/data/nest`)
 * opts a handler or controller out.
 */
export const AuditInterceptor = createAuditInterceptor({
  inject: [PrismaService],
  write: (entry, _context, prisma: PrismaService) =>
    prisma.client.auditLog.create({
      data: { ...entry, changes: entry.changes as Prisma.InputJsonValue | undefined },
    }),
})
