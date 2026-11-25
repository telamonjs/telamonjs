import {
  Injectable,
  Logger,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import {
  decodeSessionToken,
  payloadToAuthUser,
  DEFAULT_SALT,
  type TokenConfig,
} from '../jwt'
import type { AuthUser, MfJwtPayload } from '../types'
import { IS_PUBLIC_KEY } from './public.decorator'
import { ALLOW_SERVICE_TOKEN_KEY } from './allow-service-token.decorator'
import { verifyApiKey, type ApiKeyOptions } from './api-key.guard'

/** Minimal request shape (Express/Fastify) — avoids depending on @types/express */
export interface RequestLike {
  headers: Record<string, string | string[] | undefined>
  query?: Record<string, unknown>
  cookies?: Record<string, string | undefined>
  user?: unknown
  /** Set by an accepted API key (`createApiKeyGuard`, `apiKey` option). */
  servicePrincipal?: unknown
  path?: string
  url?: string
}

export interface JwtAuthGuardOptions extends Omit<TokenConfig, 'secret'> {
  /**
   * The JWE secret, or a function resolved on every request (sync or async).
   * The guard class is built when its module is imported, before Nest DI and
   * env loading, so pass a function to read the value late:
   *
   * ```ts
   * createJwtAuthGuard({ secret: () => process.env.AUTH_SECRET })
   * ```
   *
   * `undefined` (static or returned) falls back to
   * `process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET`.
   */
  secret?: string | (() => string | undefined | Promise<string | undefined>)
  /**
   * Builds the 401 the guard throws. Default: Nest's `UnauthorizedException`
   * from the package's own `@nestjs/common`. While the package is linked
   * (`link:`/`file:`), that copy differs from the host's and its filters
   * (`instanceof HttpException`) turn the 401 into a 500 — pass the host's class:
   *
   * ```ts
   * import { ForbiddenException, UnauthorizedException } from '@nestjs/common'
   *
   * createJwtAuthGuard({
   *   createException: (status, message) =>
   *     status === 401 ? new UnauthorizedException(message) : new ForbiddenException(message),
   * })
   * ```
   *
   * Same signature as the option of `createPermissionsGuard`, so one function
   * serves both guards (this guard only ever passes 401).
   */
  createException?: (status: 401 | 403, message: string) => Error
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
   * is rejected as well. Without it, an impersonation token stays valid until
   * it expires; the guard logs a one-time warning (Nest `Logger`) the first
   * time it accepts one.
   */
  isImpersonationActive?: (
    logId: string,
    context: ExecutionContext
  ) => boolean | Promise<boolean>
  /**
   * Caches the verdict of `validateUser` for this many milliseconds, per
   * session token, so a database check does not run on every request.
   * Default: no cache. The cache is in memory, per guard class (per process),
   * bounded to 1000 tokens; a thrown error is never cached. A change in the
   * database (user deactivated, sessions revoked) takes up to this long to
   * apply — keep it short (e.g. `30_000`).
   */
  validateUserCacheTtlMs?: number
  /**
   * Lets routes marked `@AllowServiceToken()` take an API key instead of a
   * session. On those routes a valid key passes and attaches the verifier's
   * principal to `request.servicePrincipal` (no `request.user`); no key or a
   * rejected one falls through to the session check. Other routes never read
   * the key. A thrown verifier error propagates.
   *
   * ```ts
   * createJwtAuthGuard({
   *   apiKey: { verify: staticApiKey(() => process.env.INTERNAL_API_KEY) },
   * })
   * ```
   */
  apiKey?: ApiKeyOptions<unknown>
}

/** Most tokens the `validateUser` cache keeps; past it, the oldest goes first. */
const VALIDATE_CACHE_MAX = 1000

/** Candidate token + the salts to try decoding it with. */
interface TokenCandidate {
  token: string
  salts: string[]
}

/**
 * What `createJwtAuthGuard` returns: subclass it to override the protected
 * hooks. Not abstract on purpose — an abstract `canActivate` would force every
 * subclass to implement it. Exported so that apps compiled with
 * `declaration: true` can `export class AppGuard extends createJwtAuthGuard()`
 * (otherwise TS4094/TS4020); instantiate it only through the factory.
 */
export class JwtAuthGuardBase<TUser> implements CanActivate {
  /** Overridden by the class `createJwtAuthGuard` builds (it owns the options). */
  canActivate(_context: ExecutionContext): Promise<boolean> {
    throw new Error('Build the guard with createJwtAuthGuard()')
  }

  /**
   * Per-request user resolution, called after the token is decoded and the
   * impersonation check passed. The return value becomes `request.user`;
   * `null` → 401 'Session is no longer valid'. Errors thrown here propagate
   * as-is (a database outage is not an "invalid token").
   *
   * Default: `payloadToAuthUser(payload)`. With a custom `TUser`, override it.
   */
  protected resolveUser(
    payload: MfJwtPayload,
    _context: ExecutionContext
  ): TUser | null | Promise<TUser | null> {
    // Correct for the default TUser = AuthUser; a custom TUser must override this
    return payloadToAuthUser(payload) as unknown as TUser
  }

  /**
   * Per-request yes/no check on the resolved user, called after `resolveUser`
   * (only when it returned a user). Return `true` to pass, or `false` / a
   * reason string to reject with a 401 'Session is no longer valid': the
   * reason is logged (Nest `Logger`), never sent to the client. A thrown error
   * propagates (a 5xx, never cached), like `resolveUser`'s: a database outage
   * must not look like an expired session and sign every user out.
   *
   * Unlike `resolveUser`, its verdict can be cached:
   * `validateUserCacheTtlMs` keeps it per session token. With the cache on,
   * the verdict must depend only on the token (user/payload), not on the
   * request. Default: `true`.
   */
  protected validateUser(
    _user: TUser,
    _payload: MfJwtPayload,
    _context: ExecutionContext
  ): boolean | string | Promise<boolean | string> {
    return true
  }

  /**
   * Whether `?token=` (SSE) is read for this request. Default: `true`.
   * Return `false` (e.g. outside your SSE routes, by `request.path`) to keep
   * session tokens out of URLs and access logs.
   */
  protected allowQueryToken(_request: RequestLike): boolean {
    return true
  }
}

/** Constructor type returned by `createJwtAuthGuard` (subclassable, DI-friendly). */
export type JwtAuthGuardClass<TUser> = new (
  reflector?: Reflector
) => JwtAuthGuardBase<TUser>

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
 *
 * // per-request checks (session freshness, revocation): subclass it
 * @Injectable()
 * export class AppGuard extends createJwtAuthGuard<MyUser>() {
 *   constructor(reflector: Reflector, private readonly users: UsersService) {
 *     super(reflector)
 *   }
 *   protected override async resolveUser(payload: MfJwtPayload) { ... }
 * }
 * ```
 */
export function createJwtAuthGuard<TUser = AuthUser>(
  options?: JwtAuthGuardOptions
): JwtAuthGuardClass<TUser> {
  const salt = options?.salt ?? DEFAULT_SALT
  const cookieNames = options?.cookieNames ?? [salt, `__Secure-${salt}`]
  // Bearer/query arrive without a cookie name — we try every possible salt
  const headerSalts = [...new Set([salt, ...cookieNames])]
  const unauthorized = (message: string): Error =>
    options?.createException?.(401, message) ??
    new UnauthorizedException(message)
  // Once per guard class: a warning per request would flood the logs
  let warnedIrrevocable = false
  const logger = new Logger('JwtAuthGuard')
  const cacheTtl = options?.validateUserCacheTtlMs ?? 0
  // Keyed by the token, not the user id: a verdict can depend on its claims
  // (session id, authTime), and a new login must not inherit an old `false`.
  // ponytail: FIFO eviction via Map insertion order; an LRU if churn shows up.
  const verdicts = new Map<string, { verdict: boolean | string; expiresAt: number }>()

  @Injectable()
  class JwtAuthGuard extends JwtAuthGuardBase<TUser> {
    private readonly reflector: Reflector

    // Reflector is stateless; the default covers instantiation outside DI (tests, @UseGuards)
    constructor(reflector?: Reflector) {
      super()
      this.reflector = reflector ?? new Reflector()
    }

    override async canActivate(context: ExecutionContext): Promise<boolean> {
      const isPublic = this.reflector.getAllAndOverride<boolean>(
        IS_PUBLIC_KEY,
        [context.getHandler(), context.getClass()]
      )
      if (isPublic) return true

      const request = context.switchToHttp().getRequest<RequestLike>()

      if (
        options?.apiKey &&
        this.reflector.getAllAndOverride<boolean>(ALLOW_SERVICE_TOKEN_KEY, [
          context.getHandler(),
          context.getClass(),
        ])
      ) {
        const principal = await verifyApiKey(request, options.apiKey)
        if (principal != null) {
          request.servicePrincipal = principal
          return true
        }
      }

      // Resolved here, per request: a function reads values loaded after import
      const secret =
        typeof options?.secret === 'function'
          ? await options.secret()
          : options?.secret

      for (const candidate of this.extractTokenCandidates(request)) {
        for (const candidateSalt of candidate.salts) {
          const payload = await decodeSessionToken(candidate.token, {
            secret,
            salt: candidateSalt,
          })
          if (payload) {
            if (payload.impersonatedUserId && options?.isImpersonationActive) {
              const active =
                !!payload.impersonationLogId &&
                (await options.isImpersonationActive(
                  payload.impersonationLogId,
                  context
                ))
              if (!active) {
                throw unauthorized('Impersonation session is no longer active')
              }
            }
            const user = await this.resolveUser(payload, context)
            if (user == null) {
              throw unauthorized('Session is no longer valid')
            }
            // A thrown error propagates (5xx), like resolveUser's: an outage
            // must not look like an expired session and sign every user out
            const verdict = await this.cachedVerdict(
              candidate.token,
              user,
              payload,
              context
            )
            if (verdict !== true) {
              logger.warn(
                `validateUser rejected user ${payload.id}: ${verdict || 'returned false'}`
              )
              throw unauthorized('Session is no longer valid')
            }
            if (
              payload.impersonatedUserId &&
              !options?.isImpersonationActive &&
              !warnedIrrevocable
            ) {
              warnedIrrevocable = true
              logger.warn(
                'Accepted an impersonation token without an isImpersonationActive hook: ' +
                  'ending the impersonation cannot revoke it before it expires. ' +
                  'Pass isImpersonationActive to createJwtAuthGuard().'
              )
            }
            request.user = user
            return true
          }
        }
      }

      throw unauthorized('Invalid or expired token')
    }

    private async cachedVerdict(
      token: string,
      user: TUser,
      payload: MfJwtPayload,
      context: ExecutionContext
    ): Promise<boolean | string> {
      const hit = verdicts.get(token)
      if (hit && hit.expiresAt > Date.now()) return hit.verdict
      verdicts.delete(token)
      const verdict = await this.validateUser(user, payload, context)
      if (cacheTtl > 0) {
        if (verdicts.size >= VALIDATE_CACHE_MAX) {
          verdicts.delete(verdicts.keys().next().value as string)
        }
        verdicts.set(token, { verdict, expiresAt: Date.now() + cacheTtl })
      }
      return verdict
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
      if (
        typeof queryToken === 'string' &&
        queryToken &&
        this.allowQueryToken(request)
      ) {
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
