import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
  type Type
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { createPermissionChecker, type PermissionCheckerConfig } from '../checker'
import type { PermissionClause, UserWithPermissions } from '../types'
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from './permissions.decorator'

/** What `onDenied` receives. */
export interface PermissionDeniedContext {
  /** `request.user`; undefined only on a `failClosed` denial without a user. */
  user: UserWithPermissions | undefined
  /** The route's `@Permissions` clauses; `[]` on a `failClosed` denial. */
  required: PermissionClause[]
  /** The raw HTTP request (Express/Fastify). */
  request: unknown
}

export interface PermissionsGuardOptions
  extends Pick<PermissionCheckerConfig, 'rolePermissions' | 'wildcard'> {
  /** Roles with full bypass. Default: ['superadmin'] */
  bypassRoles?: readonly string[]
  /**
   * Deny routes that carry no `@Permissions` unless they are marked `@Public()`
   * (this package's or `@telamonjs/auth/nest`'s — same metadata key).
   * Default: false (a route without the decorator is open).
   */
  failClosed?: boolean
  /**
   * Builds the 401/403 the guard throws. Default: Nest's
   * `UnauthorizedException`/`ForbiddenException` from the package's own
   * `@nestjs/common`. While the package is linked (`link:`/`file:`), that copy
   * differs from the host's and its filters (`instanceof HttpException`) turn
   * the error into a 500 — pass the host's classes:
   *
   * ```ts
   * import { ForbiddenException, UnauthorizedException } from '@nestjs/common'
   *
   * createPermissionsGuard({
   *   createException: (status, message) =>
   *     status === 401 ? new UnauthorizedException(message) : new ForbiddenException(message),
   * })
   * ```
   */
  createException?: (status: 401 | 403, message: string) => Error
  /**
   * Called right before every 403 (e.g. to log the denial). The client still
   * gets the generic `Insufficient permissions`. Synchronous: a returned
   * promise is not awaited, and an error thrown here replaces the 403.
   */
  onDenied?: (context: PermissionDeniedContext) => void
}

/**
 * Creates the app's permissions guard (use after the JwtAuthGuard, which
 * attaches `request.user` with the `permissions` array materialized in the JWT).
 *
 * ```ts
 * export const PermissionsGuard = createPermissionsGuard()
 * ```
 */
export function createPermissionsGuard(
  options?: PermissionsGuardOptions
): Type<CanActivate> {
  const checker = createPermissionChecker({
    bypassRoles: options?.bypassRoles ?? ['superadmin'],
    rolePermissions: options?.rolePermissions,
    wildcard: options?.wildcard
  })
  const exception = (status: 401 | 403, message: string): Error =>
    options?.createException?.(status, message) ??
    (status === 401
      ? new UnauthorizedException(message)
      : new ForbiddenException(message))
  // Generic on purpose: the required codes are not the client's business
  const deny = (context: PermissionDeniedContext): Error => {
    options?.onDenied?.(context)
    return exception(403, 'Insufficient permissions')
  }

  @Injectable()
  class PermissionsGuard implements CanActivate {
    private readonly reflector: Reflector

    // Reflector is stateless; the default covers instantiation outside DI (tests, @UseGuards)
    constructor(reflector?: Reflector) {
      this.reflector = reflector ?? new Reflector()
    }

    canActivate(context: ExecutionContext): boolean {
      const targets = [context.getHandler(), context.getClass()]
      const clauses = this.reflector.getAllAndOverride<
        PermissionClause[] | undefined
      >(PERMISSIONS_KEY, targets)

      const request = context
        .switchToHttp()
        .getRequest<{ user?: UserWithPermissions }>()
      const user = request.user

      // Empty metadata (hand-made SetMetadata; the decorator rejects it) is a
      // misconfiguration, never "no decorator": deny, whoever the user is
      if (
        clauses?.length === 0 ||
        clauses?.some((clause) => Array.isArray(clause) && clause.length === 0)
      ) {
        throw deny({ user, required: clauses, request })
      }

      // No decorator = open route, unless failClosed (then only @Public() passes)
      if (!clauses) {
        if (!options?.failClosed) return true
        if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
          return true
        }
        throw deny({ user, required: [], request })
      }

      if (!user) throw exception(401, 'User not authenticated')

      if (checker.hasBypassRole(user)) return true

      // Clauses are OR; clause-array = AND — always via the canonical checker
      // (an inline copy here has already drifted from it once)
      const allowed = clauses.some((clause) =>
        Array.isArray(clause)
          ? checker.canAll(user, clause)
          : checker.can(user, clause)
      )

      if (!allowed) throw deny({ user, required: clauses, request })

      return true
    }
  }

  return PermissionsGuard
}
