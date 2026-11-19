import type { UserWithPermissions } from './types'

export interface PermissionCheckerConfig {
  /**
   * Roles with full bypass (all permissions granted automatically).
   * App-specific domain — e.g. ['superadmin'] or ['superadmin','admin'].
   */
  bypassRoles: readonly string[]
}

export interface PermissionChecker {
  /** true if the user has any bypass role (roles[] first, singular role fallback) */
  hasBypassRole(user: UserWithPermissions | null | undefined): boolean
  /** Checks a single permission against the JWT array (no query) */
  can(user: UserWithPermissions | null | undefined, permission: string): boolean
  /** ANY of the permissions (OR) */
  canAny(user: UserWithPermissions | null | undefined, permissions: string[]): boolean
  /** ALL of the permissions (AND) */
  canAll(user: UserWithPermissions | null | undefined, permissions: string[]): boolean
}

/**
 * Creates the app's client-safe permission checker.
 *
 * Usage (once per app, re-export the functions):
 * ```ts
 * const checker = createPermissionChecker({ bypassRoles: ['superadmin'] })
 * export const { can, canAny, canAll, hasBypassRole } = checker
 * ```
 */
export function createPermissionChecker(
  config: PermissionCheckerConfig
): PermissionChecker {
  const bypass = config.bypassRoles

  function hasBypassRole(user: UserWithPermissions | null | undefined): boolean {
    if (!user) return false
    if (user.roles?.length) {
      return user.roles.some((r) => r.code != null && bypass.includes(r.code))
    }
    return !!(user.role?.code && bypass.includes(user.role.code))
  }

  function can(
    user: UserWithPermissions | null | undefined,
    permission: string
  ): boolean {
    if (!user?.id) return false
    if (hasBypassRole(user)) return true
    return user.permissions?.includes(permission) ?? false
  }

  function canAny(
    user: UserWithPermissions | null | undefined,
    permissions: string[]
  ): boolean {
    if (!user?.id) return false
    if (hasBypassRole(user)) return true
    return permissions.some((p) => user.permissions?.includes(p))
  }

  function canAll(
    user: UserWithPermissions | null | undefined,
    permissions: string[]
  ): boolean {
    if (!user?.id) return false
    if (hasBypassRole(user)) return true
    return permissions.every((p) => user.permissions?.includes(p))
  }

  return { hasBypassRole, can, canAny, canAll }
}
