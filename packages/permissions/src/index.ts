/**
 * @telamonjs/permissions — RBAC materialized in the JWT.
 *
 * Pure, client-safe core: permissions are resolved at login and carried in
 * the token; checks are pure functions over the claims, no query per request.
 *
 * NestJS side (guard + decorator): '@telamonjs/permissions/nest'.
 * Reference Prisma schema: src/prisma/schema.prisma (copy into the app).
 */

export {
  createPermissionChecker,
  type PermissionChecker,
  type PermissionCheckerConfig
} from './checker'

export {
  isAdminRole,
  isSuperAdminRole,
  hasGlobalDataVisibility,
  getPrimaryRole
} from './role-helpers'

export type { RoleInfo, UserWithPermissions, PermissionClause } from './types'
