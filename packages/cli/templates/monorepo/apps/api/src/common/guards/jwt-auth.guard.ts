import { Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { payloadToAuthUser, type AuthUser } from '@telamonjs/auth'
import { createJwtAuthGuard, type MfJwtPayload } from '@telamonjs/auth/nest'
import { PrismaService } from '../prisma/prisma.service'

export type { AuthUser }

/**
 * JwtAuthGuard — global (APP_GUARD), built by @telamonjs/auth. Decodes the
 * NextAuth v5 session token issued by apps/web (`Authorization: Bearer`,
 * `?token=` for SSE, then the `authjs.session-token` / `__Secure-` cookies)
 * with the same NEXTAUTH_SECRET. Routes marked with @Public() (health) skip it.
 *
 * `resolveUser` runs once the token is decoded: a deactivated or deleted user
 * can't stay "logged in" just because the token hasn't expired yet, and the
 * role comes from the database, so a demotion applies on the next request —
 * one query per request, by primary key. To also revoke sessions, see
 * "Session freshness & revocation" in the @telamonjs/auth docs.
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
    const usuario = await this.prisma.client.user.findUnique({
      where: { id: payload.id },
      select: { ativo: true, email: true, role: true },
    })
    if (!usuario || !usuario.ativo) return null

    return {
      ...payloadToAuthUser(payload),
      email: usuario.email,
      role: { id: usuario.role, name: usuario.role, code: usuario.role },
    }
  }
}
