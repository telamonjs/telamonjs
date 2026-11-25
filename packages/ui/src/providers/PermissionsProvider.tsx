'use client'

import { createContext, useContext, type ReactNode } from 'react'

type PermissionChecker = (permission: string) => boolean

const PermissionsContext = createContext<PermissionChecker | undefined>(
  undefined
)

export interface PermissionsProviderProps {
  /**
   * The session's permission checker, for everything below: every
   * `CrudConfig.permissions` operation, every action `permission` and the
   * `AdminShell` menu. A checker the config (or the shell) declares itself —
   * `permissions.can`, `actionsConfig.can`, `actionsConfig.userPermissions`,
   * `AdminShell`'s `can` — wins over this one. Without it nothing changes.
   */
  can?: PermissionChecker
  children: ReactNode
}

/**
 * Gives `@telamonjs/ui` the permission checker once, instead of injecting it
 * into every CrudConfig. Place it where the session is readable (inside the
 * app's `SessionProvider`), around the `AdminShell`.
 *
 * @example
 * ```tsx
 * 'use client'
 * const can = useCallback((perm: string) => checker.can(session.user, perm), [session])
 * <PermissionsProvider can={can}>
 *   <AdminShell menuConfig={menuConfig}>{children}</AdminShell>
 * </PermissionsProvider>
 * ```
 */
export function PermissionsProvider({ can, children }: PermissionsProviderProps) {
  return (
    <PermissionsContext.Provider value={can}>
      {children}
    </PermissionsContext.Provider>
  )
}

/**
 * The `PermissionsProvider` checker, or `undefined` outside one.
 *
 * @internal
 */
// eslint-disable-next-line react-refresh/only-export-components -- provider + its reader hook, tied together on purpose (same as RecordRefreshContext)
export function usePermissionChecker(): PermissionChecker | undefined {
  return useContext(PermissionsContext)
}
