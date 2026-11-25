import { Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { payloadToAuthUser, sessionState, type AuthUser } from '@telamonjs/auth'
import { createJwtAuthGuard, type MfJwtPayload } from '@telamonjs/auth/nest'
import { loadAccess } from '{{scope}}/shared/rbac'
import { PrismaService } from '../prisma/prisma.service'

export type { AuthUser }

/**
 * JwtAuthGuard — global (APP_GUARD), built by @telamonjs/auth. Decodes the
 * NextAuth v5 session token issued by apps/web (`Authorization: Bearer`,
 * `?token=` for SSE, then the `authjs.session-token` / `__Secure-` cookies)
 * with the same NEXTAUTH_SECRET. Routes marked with @Public() (health) skip it.
 *
 * `resolveUser` runs once the token is decoded — one query per request, by
 * primary key — and applies the session-freshness marks (`sessionState`):
 * - deleted, deactivated, or sessions revoked → 401;
 * - access changed after the token's claims were computed (`stale`) → the
 *   roles/permissions are recomputed for this request, so a revoked
 *   permission stops working right away (apps/web rewrites the cookie itself);
 * - otherwise the token's claims stand: `request.user.permissions` is what
 *   PermissionsGuard checks.
 */
@Injectable()
export class JwtAuthGuard extends createJwtAuthGuard() {
  constructor(
    reflector: Reflector,
    private readonly prisma: PrismaService
  ) {
    super(reflector)
  }

  protected override async resolveUser(payload: MfJwtPayload): Promise<AuthUser | null> {
    const marks = await this.prisma.client.user.findUnique({
      where: { id: payload.id },
      select: { active: true, accessChangedAt: true, sessionsRevokedAt: true },
    })
    if (!marks?.active) return null

    const user = payloadToAuthUser(payload)
    switch (sessionState(payload, { revokedAt: marks.sessionsRevokedAt, accessChangedAt: marks.accessChangedAt })) {
      case 'revoked':
        return null
      case 'stale': {
        const access = await loadAccess(this.prisma.client, payload.id)
        // `role` is display data (a user without roles keeps the token's);
        // the checks read `permissions`.
        return { ...user, ...access, role: access.role ?? user.role }
      }
      default:
        return user
    }
  }
}
