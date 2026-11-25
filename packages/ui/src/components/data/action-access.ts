import type { ActionConfig } from '../../types/actions'
import type { CrudConfig, CrudPermissions } from '../../types/crud'

/**
 * Access rules of a row action, shared by every surface that offers it: the row
 * buttons and menu (`DataTableActions`) and the view dialog footer (`ListPage`).
 * One rule, so the footer never offers what the row hides.
 */

/**
 * `permission` (any of them) against `can` when given, else against
 * `userPermissions`, else against `fallback` (the `PermissionsProvider`
 * checker). None = everything allowed.
 */
export function actionGranted(
  permission: ActionConfig['permission'],
  userPermissions: readonly string[] | ReadonlySet<string> | undefined,
  can?: (permission: string) => boolean,
  fallback?: (permission: string) => boolean
): boolean {
  if (!permission) return true
  const required = Array.isArray(permission) ? permission : [permission]
  const check = can ?? (userPermissions ? undefined : fallback)
  if (check) return required.some(perm => check(perm))
  if (!userPermissions) return true
  const granted =
    userPermissions instanceof Set ? userPermissions : new Set(userPermissions)
  return required.some(perm => granted.has(perm))
}

const denyAll = (): boolean => false

/**
 * The permission checker a CrudConfig resolves to: `actionsConfig.can`, else
 * `permissions.can`. With neither and no `actionsConfig.userPermissions`, it is
 * `fallback` (the `PermissionsProvider` checker); without one either, it is
 * `undefined` (everything allowed) — or a checker that denies everything when
 * `permissions.failClosed` is set.
 */
export function crudChecker(
  config: Pick<CrudConfig, 'permissions' | 'actionsConfig'>,
  fallback?: (permission: string) => boolean
): ((permission: string) => boolean) | undefined {
  const actions = config.actionsConfig || undefined
  const can = actions?.can ?? config.permissions?.can
  if (can || actions?.userPermissions) return can
  if (fallback) return fallback
  return config.permissions?.failClosed ? denyAll : undefined
}

/**
 * A CrudConfig operation (`permissions.create`, …) against the same checker the
 * row actions use: `permissions.can` or `actionsConfig.can`, else
 * `actionsConfig.userPermissions` (see `crudChecker` for `failClosed`).
 */
export function crudGranted(
  config: Pick<CrudConfig, 'permissions' | 'actionsConfig'>,
  operation: Exclude<keyof CrudPermissions, 'can' | 'failClosed'>,
  fallback?: (permission: string) => boolean
): boolean {
  return actionGranted(
    config.permissions?.[operation],
    (config.actionsConfig || undefined)?.userPermissions,
    crudChecker(config, fallback)
  )
}

/** `visible` for this row (`undefined` = visible). */
export function actionVisible<TData>(
  action: Pick<ActionConfig<TData>, 'visible'>,
  row: TData
): boolean {
  const { visible } = action
  if (visible === undefined) return true
  return typeof visible === 'function' ? visible(row) : visible
}

/** `enabled` for this row (`undefined` = enabled). */
export function actionEnabled<TData>(
  action: Pick<ActionConfig<TData>, 'enabled'>,
  row: TData
): boolean {
  const { enabled } = action
  if (enabled === undefined) return true
  return typeof enabled === 'function' ? enabled(row) : enabled
}
