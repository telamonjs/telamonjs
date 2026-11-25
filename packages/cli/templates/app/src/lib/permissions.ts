import { createPermissionChecker } from '@telamonjs/permissions'

/**
 * The app's permission checker — client-safe (a lookup in the session's
 * `permissions[]`, no query). The same `can` gates the menu and the
 * CrudConfigs (PermissionsProvider in LayoutProviders) and the Route Handlers
 * (`requirePermission` in src/lib/auth.ts). No bypass role: the built-in
 * `admin` role holds every permission explicitly (see prisma/seed.ts).
 */
export const { can, canAny } = createPermissionChecker({ bypassRoles: [] })
