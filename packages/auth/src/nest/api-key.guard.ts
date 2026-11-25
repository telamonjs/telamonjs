import { createHash, timingSafeEqual } from 'node:crypto'
import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common'
import type { RequestLike } from './jwt-auth.guard'

/** What `staticApiKey` resolves to: the name the key was configured with. */
export interface ServicePrincipal {
  name: string
}

/**
 * Checks a key: the principal it belongs to, or `null`/`undefined` to reject.
 * Sync or async, so an env comparison (`staticApiKey`) and a database lookup
 * (by `hashApiKey(key)`) both fit. A thrown error propagates as-is — a
 * database outage is not an invalid key; throw your own exception to send a
 * specific 401/403 body.
 */
export type ApiKeyVerifier<TPrincipal> = (
  key: string,
  request: RequestLike
) => TPrincipal | null | undefined | Promise<TPrincipal | null | undefined>

/** Where the key is read from and how it is checked. */
export interface ApiKeyOptions<TPrincipal = ServicePrincipal> {
  verify: ApiKeyVerifier<TPrincipal>
  /** Header holding the key (any case). Default `'x-api-key'`; `false` reads none. */
  header?: string | false
  /** Also read `Authorization: Bearer <key>` (after the header). Default `false`. */
  bearer?: boolean
}

export interface ApiKeyGuardOptions<TPrincipal = ServicePrincipal>
  extends ApiKeyOptions<TPrincipal> {
  /** Builds the 401, as in `createJwtAuthGuard` (host's class while linked). */
  createException?: (status: 401 | 403, message: string) => Error
}

const INVALID_KEY = 'Invalid or missing API key'

/**
 * Reads the key and runs the verifier: the principal, or `null` when there is
 * no key or the verifier rejects it. Shared with `createJwtAuthGuard({ apiKey })`.
 */
export async function verifyApiKey<TPrincipal>(
  request: RequestLike,
  options: ApiKeyOptions<TPrincipal>
): Promise<TPrincipal | null> {
  const header = options.header ?? 'x-api-key'
  let key = header ? request.headers[header.toLowerCase()] : undefined
  if (!key && options.bearer) {
    const auth = request.headers['authorization']
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      key = auth.slice(7).trim()
    }
  }
  // A repeated header arrives as string[] — ambiguous, so not a key
  if (typeof key !== 'string' || !key) return null
  return (await options.verify(key, request)) ?? null
}

/**
 * Creates a guard that only accepts an API key: it attaches the verifier's
 * principal to `request.servicePrincipal` (`request.user` stays untouched)
 * and throws a generic 401 otherwise. It logs nothing.
 *
 * ```ts
 * export const InternalKeyGuard = createApiKeyGuard({
 *   header: 'x-internal-token',
 *   verify: staticApiKey(() => process.env.INTERNAL_API_TOKEN, 'jobs'),
 * })
 *
 * // with a global JwtAuthGuard: @Public() skips the session, the key guard
 * // protects the route
 * @Public()
 * @UseGuards(InternalKeyGuard)
 * @Post('emit')
 * ```
 *
 * It does not read `@Public()`. For a route that takes a key OR a session,
 * use `createJwtAuthGuard({ apiKey })` + `@AllowServiceToken()` instead.
 */
export function createApiKeyGuard<TPrincipal = ServicePrincipal>(
  options: ApiKeyGuardOptions<TPrincipal>
): new () => CanActivate {
  @Injectable()
  class ApiKeyGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest<RequestLike>()
      const principal = await verifyApiKey(request, options)
      if (principal == null) {
        throw (
          options.createException?.(401, INVALID_KEY) ??
          new UnauthorizedException(INVALID_KEY)
        )
      }
      request.servicePrincipal = principal
      return true
    }
  }
  return ApiKeyGuard
}

const sha256 = (value: string): Buffer =>
  createHash('sha256').update(value).digest()

/**
 * Verifier for one shared secret (an env var): compares in constant time
 * (both sides hashed first, so lengths never leak) and resolves to
 * `{ name }`. An unset or empty expected key rejects everything — never open
 * when unconfigured. Pass a function to read the env late (the guard is built
 * at import, before env loading); it is called on every request.
 */
export function staticApiKey(
  expected: string | undefined | (() => string | undefined),
  name = 'service'
): ApiKeyVerifier<ServicePrincipal> {
  return key => {
    const value = typeof expected === 'function' ? expected() : expected
    if (!value || !key) return null
    return timingSafeEqual(sha256(key), sha256(value)) ? { name } : null
  }
}
