/**
 * RBAC of this app: the permission catalog and how a user's access is read
 * from the database. Server-only: the client checker is the web app's
 * `src/lib/permissions.ts`.
 *
 * Adding a permission: append it to PERMISSIONS, enforce it on the server
 * (`requirePermission()` in a Route Handler, or `@Permissions()` on an API
 * route), hide what it gates in the UI (`permission` on a menu item,
 * `permissions` in a CrudConfig) and run `pnpm db:seed` — the seed syncs the
 * `Permission` table with this list and grants it to the `admin` role.
 */
import type { PrismaClient } from '@prisma/client'
import type { PermissionDefinition } from '@telamonjs/permissions'

export const PERMISSIONS: PermissionDefinition[] = [
  { code: 'users.read', category: 'Users', description: 'View users' },
  { code: 'users.write', category: 'Users', description: 'Create, edit, activate and deactivate users' },
  { code: 'roles.read', category: 'Roles', description: 'View roles and their permissions' },
  { code: 'roles.write', category: 'Roles', description: 'Create, edit and delete roles; grant and revoke permissions' },
]

/** The built-in role the seed creates: holds every permission, locked in the UI. */
export const ADMIN_ROLE_CODE = 'admin'

/**
 * The access claims of a user — `role`, `roles[]` and `permissions[]` of the
 * @telamonjs/auth session contract. Read at sign-in and again when the token
 * goes stale (`accessChangedAt`), so both paths share one source.
 */
export async function loadAccess(prisma: PrismaClient, userId: string) {
  const rows = await prisma.userRole.findMany({
    where: { userId },
    orderBy: { role: { name: 'asc' } },
    select: {
      role: {
        select: {
          id: true,
          code: true,
          name: true,
          permissions: { select: { permission: { select: { code: true } } } },
        },
      },
    },
  })
  const roles = rows.map(({ role }) => ({ id: role.id, code: role.code, name: role.name }))
  const permissions = [
    ...new Set(rows.flatMap(({ role }) => role.permissions.map((p) => p.permission.code))),
  ]
  // `role` is the primary role (first by name); a user without roles has none.
  return { role: roles[0], roles, permissions }
}

/**
 * A role's permissions changed: every holder's token is now stale, so the
 * next request recomputes their claims (`sessionState` → 'stale').
 */
export function markRoleHoldersStale(prisma: PrismaClient, roleId: string) {
  return prisma.user.updateMany({
    where: { roles: { some: { roleId } } },
    data: { accessChangedAt: new Date() },
  })
}

/**
 * The privilege ceiling of every grant: a user's roles, an invitation's roles,
 * a permission given to a role. The actor (the session user, whose claims
 * `auth()` and the API guard keep fresh) confers only permissions it already
 * holds, and only a holder of the built-in `admin` role confers that role, so
 * users.write, roles.write or invitations.write alone never lead to admin.
 * True when every listed role and permission is within the actor's reach.
 */
export async function canGrant(
  prisma: PrismaClient,
  actor: { roles?: { code: string }[]; permissions?: string[] },
  grant: { roleIds?: string[]; permissionIds?: string[] }
): Promise<boolean> {
  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      where: { id: { in: grant.roleIds ?? [] } },
      select: { code: true, permissions: { select: { permission: { select: { code: true } } } } },
    }),
    prisma.permission.findMany({ where: { id: { in: grant.permissionIds ?? [] } }, select: { code: true } }),
  ])
  const isAdmin = actor.roles?.some((role) => role.code === ADMIN_ROLE_CODE) ?? false
  if (!isAdmin && roles.some((role) => role.code === ADMIN_ROLE_CODE)) return false
  const held = new Set(actor.permissions)
  const conferred = [
    ...roles.flatMap((role) => role.permissions.map((p) => p.permission.code)),
    ...permissions.map((p) => p.code),
  ]
  return conferred.every((code) => held.has(code))
}
