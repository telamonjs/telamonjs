/**
 * Structural types for the RBAC materialized in the JWT.
 *
 * Duck-typed on purpose: the `AuthUser` from @telamonjs/auth
 * satisfies `UserWithPermissions` by shape, with no dependency between the
 * packages (contract verified by a test in checker.spec.ts).
 */

export interface RoleInfo {
  id: string
  code: string
  name?: string
}

export interface UserWithPermissions {
  id: string
  role?: RoleInfo | null
  roles?: RoleInfo[]
  permissions?: string[]
}

/**
 * Permission clause for the @Permissions decorator:
 * string = single permission; string[] = all required (AND).
 * Clauses among themselves are OR.
 */
export type PermissionClause = string | string[]
