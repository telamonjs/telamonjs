import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
  type Type
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { createPermissionChecker } from '../checker'
import type { PermissionClause, UserWithPermissions } from '../types'
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from './permissions.decorator'

export interface PermissionsGuardOptions {
  /** Roles with full bypass. Default: ['superadmin'] */
  bypassRoles?: readonly string[]
  /**
   * Deny routes that carry no `@Permissions` unless they are marked `@Public()`
   * (this package's or `@telamonjs/auth/nest`'s — same metadata key).
   * Default: false (a route without the decorator is open).
   */
  failClosed?: boolean
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
    bypassRoles: options?.bypassRoles ?? ['superadmin']
  })

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

      // No decorator = open route, unless failClosed (then only @Public() passes)
      if (!clauses || clauses.length === 0) {
        if (!options?.failClosed) return true
        if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
          return true
        }
        throw new ForbiddenException('Insufficient permissions')
      }

      const request = context.switchToHttp().getRequest()
      const user: UserWithPermissions | undefined = request.user

      if (!user) {
        throw new UnauthorizedException('User not authenticated')
      }

      if (checker.hasBypassRole(user)) return true

      // Clauses are OR; clause-array = AND — always via the canonical checker
      // (an inline copy here has already drifted from it once)
      const allowed = clauses.some((clause) =>
        Array.isArray(clause)
          ? checker.canAll(user, clause)
          : checker.can(user, clause)
      )

      // Generic on purpose: the required codes are not the client's business
      if (!allowed) throw new ForbiddenException('Insufficient permissions')

      return true
    }
  }

  return PermissionsGuard
}
