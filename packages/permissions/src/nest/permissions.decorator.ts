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
 * Usage:
 * ```ts
 * @Get('admin')
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @Permissions('admin.read', 'admin.write')
 * getAdminData() {}
 * ```
 */
export const Permissions = (...clauses: PermissionClause[]) =>
  SetMetadata(PERMISSIONS_KEY, clauses)

/** Alias (projects that use the @RequirePermission convention) */
export const RequirePermission = Permissions
