import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
  type Type,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import {
  decodeSessionToken,
  payloadToAuthUser,
  DEFAULT_SALT,
  type TokenConfig,
} from '../jwt'
import { IS_PUBLIC_KEY } from './public.decorator'

/** Minimal request shape (Express/Fastify) — avoids depending on @types/express */
interface RequestLike {
  headers: Record<string, string | string[] | undefined>
  query?: Record<string, unknown>
  cookies?: Record<string, string | undefined>
  user?: unknown
}

export interface JwtAuthGuardOptions extends TokenConfig {
  /**
   * Cookie names to look for the session token in.
   * Default: [salt, `__Secure-${salt}`]. Projects that decode with the v5
   * salt but still serve the legacy cookie pass ['next-auth.session-token', ...].
   */
  cookieNames?: string[]
  /**
   * Impersonation revocation. Called only when the request is an
   * impersonation one; `false` → 401. The package knows nothing about the
   * database/Redis — the app checks its log:
   *
   * ```ts
   * createJwtAuthGuard({
   *   isImpersonationActive: async (logId) => !!(await prisma.impersonationLog
   *     .findFirst({ where: { id: logId, endedAt: null } }))
   * })
   * ```
   *
   * With the hook configured, an impersonation token WITHOUT
   * `impersonationLogId` (issued before the contract, hence irrevocable)
   * is rejected as well.
   */
  isImpersonationActive?: (
    logId: string,
    context: ExecutionContext
  ) => boolean | Promise<boolean>
}

/** Candidate token + the salts to try decoding it with. */
interface TokenCandidate {
  token: string
  salts: string[]
}

/**
 * Creates the authentication guard: decodes the NextAuth session JWE
 * (Bearer → ?token= for SSE → cookies) and attaches `request.user` (AuthUser).
 *
 * NextAuth derives the JWE key with salt = the cookie NAME — over HTTPS
 * (useSecureCookies) the name becomes `__Secure-<salt>`, so each cookie is
 * decoded using its own name as the salt. Large cookies are chunked
 * (`name.0`, `name.1`, …) and reassembled here.
 *
 * ```ts
 * export const JwtAuthGuard = createJwtAuthGuard()
 * ```
 */
export function createJwtAuthGuard(
  options?: JwtAuthGuardOptions
): Type<CanActivate> {
  const salt = options?.salt ?? DEFAULT_SALT
  const cookieNames = options?.cookieNames ?? [salt, `__Secure-${salt}`]
  // Bearer/query arrive without a cookie name — we try every possible salt
  const headerSalts = [...new Set([salt, ...cookieNames])]

  @Injectable()
  class JwtAuthGuard implements CanActivate {
    private readonly reflector: Reflector

    // Reflector is stateless; the default covers instantiation outside DI (tests, @UseGuards)
    constructor(reflector?: Reflector) {
      this.reflector = reflector ?? new Reflector()
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const isPublic = this.reflector.getAllAndOverride<boolean>(
        IS_PUBLIC_KEY,
        [context.getHandler(), context.getClass()]
      )
      if (isPublic) return true

      const request = context.switchToHttp().getRequest<RequestLike>()

      for (const candidate of this.extractTokenCandidates(request)) {
        for (const candidateSalt of candidate.salts) {
          const payload = await decodeSessionToken(candidate.token, {
            ...options,
            salt: candidateSalt,
          })
          if (payload) {
            const user = payloadToAuthUser(payload)
            if (user.isImpersonating && options?.isImpersonationActive) {
              const active =
                !!user.impersonationLogId &&
                (await options.isImpersonationActive(
                  user.impersonationLogId,
                  context
                ))
              if (!active) {
                throw new UnauthorizedException(
                  'Impersonation session is no longer active'
                )
              }
            }
            request.user = user
            return true
          }
        }
      }

      throw new UnauthorizedException('Invalid or expired token')
    }

    private extractTokenCandidates(request: RequestLike): TokenCandidate[] {
      const candidates: TokenCandidate[] = []

      // Priority 1: Bearer token from Authorization header (API pattern)
      const authHeader = request.headers['authorization']
      if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        candidates.push({ token: authHeader.substring(7), salts: headerSalts })
      }

      // Priority 2: query param (SSE/EventSource cannot send custom headers)
      const queryToken = request.query?.['token']
      if (typeof queryToken === 'string' && queryToken) {
        candidates.push({ token: queryToken, salts: headerSalts })
      }

      // Priority 3: NextAuth cookies. NextAuth convention: the cookie NAME
      // is the salt (over HTTPS the name gains __Secure- and the salt
      // changes with it). Custom setups encode with one salt but serve the
      // cookie under another name — hence we try both the name AND the
      // configured salt.
      for (const name of cookieNames) {
        const token = this.readCookie(request, name)
        if (token) {
          candidates.push({ token, salts: [...new Set([name, salt])] })
        }
      }

      return candidates
    }

    /** Reads the cookie, reassembling chunks (`name.0`, `name.1`, …) if needed. */
    private readCookie(request: RequestLike, name: string): string | undefined {
      const cookies = request.cookies
      if (!cookies) return undefined
      if (cookies[name]) return cookies[name]

      let assembled = ''
      for (let i = 0; ; i++) {
        const chunk = cookies[`${name}.${i}`]
        if (chunk === undefined) break
        assembled += chunk
      }
      return assembled || undefined
    }
  }

  return JwtAuthGuard
}
