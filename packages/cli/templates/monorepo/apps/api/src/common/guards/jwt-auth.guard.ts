import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, InternalServerErrorException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import { decode } from '@auth/core/jwt'
import { PrismaService } from '../prisma/prisma.service'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

/**
 * Authenticated user, derived from the NextAuth session JWT. Mirrors the
 * `session` callback in apps/web/src/auth.ts.
 */
export interface AuthUser {
  id: string
  email: string
  role: 'ADMIN' | 'USER'
}

/**
 * JwtAuthGuard — global (APP_GUARD). Decodes the NextAuth v5 session cookie
 * (JWE) with the same NEXTAUTH_SECRET; the `salt` is the cookie name itself
 * (`__Secure-` prefix under HTTPS). Also accepts `Authorization: Bearer`.
 * Routes marked with @Public() (health) skip the check.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<Request>()

    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) {
      throw new InternalServerErrorException('NEXTAUTH_SECRET não configurado')
    }

    const { token, salt } = this.extractSessionToken(request)
    if (!token) {
      throw new UnauthorizedException('Token de sessão ausente')
    }

    try {
      const payload = await decode({ token, secret, salt })
      if (!payload?.id) {
        throw new UnauthorizedException('Token inválido')
      }

      // A deactivated user can't stay "logged in" just because the JWT
      // hasn't expired yet — one query per request (by PK, cheap enough).
      const usuario = await this.prisma.client.user.findUnique({
        where: { id: payload.id as string },
        select: { ativo: true, email: true, role: true },
      })
      if (!usuario || !usuario.ativo) {
        throw new UnauthorizedException('Usuário inativo')
      }

      const user: AuthUser = {
        id: payload.id as string,
        email: usuario.email,
        role: usuario.role,
      }
      ;(request as Request & { user: AuthUser }).user = user
      return true
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err
      throw new UnauthorizedException('Token inválido ou expirado')
    }
  }

  /**
   * Priority: Authorization Bearer (default salt) -> `__Secure-authjs.session-token`
   * cookie (HTTPS/Traefik) -> `authjs.session-token`.
   */
  private extractSessionToken(request: Request): { token?: string; salt: string } {
    const defaultSalt = 'authjs.session-token'

    const authHeader = request.headers['authorization']
    if (authHeader?.startsWith('Bearer ')) {
      return { token: authHeader.substring(7), salt: defaultSalt }
    }

    const cookies = (request as Request & { cookies?: Record<string, string> }).cookies
    if (cookies?.['__Secure-authjs.session-token']) {
      return { token: cookies['__Secure-authjs.session-token'], salt: '__Secure-authjs.session-token' }
    }
    if (cookies?.['authjs.session-token']) {
      return { token: cookies['authjs.session-token'], salt: defaultSalt }
    }

    return { salt: defaultSalt }
  }
}
