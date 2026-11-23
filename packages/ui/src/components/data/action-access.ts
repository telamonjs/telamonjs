import type { ActionConfig } from '../../types/actions'

/**
 * Access rules of a row action, shared by every surface that offers it: the row
 * buttons and menu (`DataTableActions`) and the view dialog footer (`ListPage`).
 * One rule, so the footer never offers what the row hides.
 */

/** `permission` against `userPermissions` (any of them). No `userPermissions` = everything allowed. */
export function actionGranted(
  permission: ActionConfig['permission'],
  userPermissions: readonly string[] | ReadonlySet<string> | undefined
): boolean {
  if (!permission || !userPermissions) return true
  const granted =
    userPermissions instanceof Set ? userPermissions : new Set(userPermissions)
  const required = Array.isArray(permission) ? permission : [permission]
  return required.some(perm => granted.has(perm))
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
