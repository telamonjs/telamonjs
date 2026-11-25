import { SetMetadata } from '@nestjs/common'
import type { PermissionClause } from '../types'

export const PERMISSIONS_KEY = 'permissions'

/**
 * Declares the permissions required by a route/controller.
 *
 * Semantics: clauses are OR; inner arrays are AND.
 * - `@Permissions('a.read', 'a.write')` → requires ONE of the two (OR)
 * - `@Permissions(['a.read', 'a.write'])` → requires BOTH (AND)
 *
 * Throws at decoration time when given no clause or an empty `[]` clause.
 *
 * Usage:
 * ```ts
 * @Get('admin')
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @Permissions('admin.read', 'admin.write')
 * getAdminData() {}
 * ```
 */
export const Permissions = (...clauses: PermissionClause[]) => {
  // Fail fast: an empty list would read as "no decorator" and leave the route open
  if (clauses.length === 0) {
    throw new Error('@Permissions() needs at least one permission')
  }
  if (clauses.some((clause) => Array.isArray(clause) && clause.length === 0)) {
    throw new Error('@Permissions() got an empty AND clause ([])')
  }
  return SetMetadata(PERMISSIONS_KEY, clauses)
}

/** Alias (projects that use the @RequirePermission convention) */
export const RequirePermission = Permissions

/**
 * Same key as `@telamonjs/auth/nest`'s `IS_PUBLIC_KEY`, so either package's
 * `Public()` marks a route public for both guards (no dependency between them).
 */
export const IS_PUBLIC_KEY = 'isPublic'

/** Marks a route/controller public — lets it through a `failClosed` guard. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
