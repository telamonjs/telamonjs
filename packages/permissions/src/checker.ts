import type { UserWithPermissions } from './types'

export interface PermissionCheckerConfig {
  /**
   * Roles with full bypass (all permissions granted automatically).
   * App-specific domain — e.g. ['superadmin'] or ['superadmin','admin'].
   */
  bypassRoles: readonly string[]
  /**
   * Permissions granted by role code, merged with the user's own
   * `permissions[]` — for apps whose role → permissions table lives in code
   * instead of the JWT. Every role in `roles[]` counts (the singular `role`
   * is the fallback, as for `bypassRoles`).
   */
  rolePermissions?: Readonly<Record<string, readonly string[]>>
  /**
   * A permission code that grants every permission when the user holds it
   * (in the JWT array or through `rolePermissions`) — e.g. `'*'`. An empty
   * requirement list still denies.
   */
  wildcard?: string
}

export interface PermissionChecker {
  /** true if the user has any bypass role (roles[] first, singular role fallback) */
  hasBypassRole(user: UserWithPermissions | null | undefined): boolean
  /** Checks a single permission against the JWT array (no query) */
  can(user: UserWithPermissions | null | undefined, permission: string): boolean
  /** ANY of the permissions (OR). An empty list denies, bypass roles included. */
  canAny(user: UserWithPermissions | null | undefined, permissions: string[]): boolean
  /** ALL of the permissions (AND). An empty list denies, bypass roles included. */
  canAll(user: UserWithPermissions | null | undefined, permissions: string[]): boolean
}

/** Role codes of the user: roles[] when present, else the singular role. */
function roleCodes(user: UserWithPermissions): string[] {
  if (user.roles?.length) {
    return user.roles.flatMap((r) => (r.code != null ? [r.code] : []))
  }
  return user.role?.code ? [user.role.code] : []
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
  const { bypassRoles: bypass, rolePermissions, wildcard } = config

  function hasBypassRole(user: UserWithPermissions | null | undefined): boolean {
    if (!user) return false
    return roleCodes(user).some((code) => bypass.includes(code))
  }

  /** The user's permission test: JWT array + role map, wildcard aware. */
  function holder(user: UserWithPermissions): (permission: string) => boolean {
    const granted = rolePermissions
      ? [
          ...(user.permissions ?? []),
          ...roleCodes(user).flatMap((code) => rolePermissions[code] ?? [])
        ]
      : (user.permissions ?? [])
    if (wildcard !== undefined && granted.includes(wildcard)) return () => true
    return (permission) => granted.includes(permission)
  }

  function can(
    user: UserWithPermissions | null | undefined,
    permission: string
  ): boolean {
    if (!user?.id) return false
    if (hasBypassRole(user)) return true
    return holder(user)(permission)
  }

  function canAny(
    user: UserWithPermissions | null | undefined,
    permissions: string[]
  ): boolean {
    // An empty requirement is a bug, not "nothing required": deny it for
    // everyone, so testing as a bypass role cannot hide it
    if (permissions.length === 0 || !user?.id) return false
    if (hasBypassRole(user)) return true
    return permissions.some(holder(user))
  }

  function canAll(
    user: UserWithPermissions | null | undefined,
    permissions: string[]
  ): boolean {
    if (permissions.length === 0 || !user?.id) return false
    if (hasBypassRole(user)) return true
    return permissions.every(holder(user))
  }

  return { hasBypassRole, can, canAny, canAll }
}
