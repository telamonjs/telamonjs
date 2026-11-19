import {
  Injectable,
  ForbiddenException,
  type CanActivate,
  type ExecutionContext,
  type Type
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { createPermissionChecker } from '../checker'
import type { PermissionClause, UserWithPermissions } from '../types'
import { PERMISSIONS_KEY } from './permissions.decorator'

export interface PermissionsGuardOptions {
  /** Roles with full bypass. Default: ['superadmin'] */
  bypassRoles?: readonly string[]
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
      const clauses = this.reflector.getAllAndOverride<
        PermissionClause[] | undefined
      >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()])

      // No decorator = open route
      if (!clauses || clauses.length === 0) return true

      const request = context.switchToHttp().getRequest()
      const user: UserWithPermissions | undefined = request.user

      if (!user) {
        throw new ForbiddenException('User not authenticated')
      }

      if (checker.hasBypassRole(user)) return true

      // Clauses are OR; clause-array = AND — always via the canonical checker
      // (an inline copy here has already drifted from it once)
      const allowed = clauses.some((clause) =>
        Array.isArray(clause)
          ? checker.canAll(user, clause)
          : checker.can(user, clause)
      )

      if (!allowed) {
        throw new ForbiddenException(
          `Missing required permissions: ${clauses.flat().join(', ')}`
        )
      }

      return true
    }
  }

  return PermissionsGuard
}
