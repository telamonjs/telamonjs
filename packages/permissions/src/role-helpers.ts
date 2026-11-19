import type { RoleInfo } from './types'

/**
 * Checks whether the user has the admin or superadmin role.
 * Checks roles[] (multi-role) with fallback to the singular role.
 */
export function isAdminRole(
  role?: { code?: string } | null,
  roles?: Array<{ code?: string }>
): boolean {
  if (roles?.length) {
    return roles.some((r) => r.code === 'admin' || r.code === 'superadmin')
  }
  return role?.code === 'admin' || role?.code === 'superadmin'
}

/**
 * Checks whether the user has the superadmin role.
 * Use ONLY for privilege gates (system roles, system category,
 * impersonating a superadmin). For data scoping use hasGlobalDataVisibility.
 * Checks roles[] (multi-role) with fallback to the singular role.
 */
export function isSuperAdminRole(
  role?: { code?: string } | null,
  roles?: Array<{ code?: string }>
): boolean {
  if (roles?.length) {
    return roles.some((r) => r.code === 'superadmin')
  }
  return role?.code === 'superadmin'
}

/**
 * Global data scope (visibility filter bypass): admin and superadmin
 * see all records.
 * Do NOT use for privilege gates (use isSuperAdminRole).
 */
export function hasGlobalDataVisibility(
  role?: { code?: string } | null,
  roles?: Array<{ code?: string }>
): boolean {
  return isAdminRole(role, roles)
}

/**
 * Extracts the primary role (first in the list, or the singular role).
 */
export function getPrimaryRole(
  role?: RoleInfo | null,
  roles?: RoleInfo[]
): RoleInfo | null {
  if (roles?.length) return roles[0]
  return role ?? null
}
