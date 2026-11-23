import { crudGranted } from '../../components/data/action-access'
import type { DataTableActionsConfig } from '../../types/actions'
import type {
  CrudConfigWithAnyForm,
  CrudPermissions,
  DialogsConfig,
} from '../../types/crud'

type Operation = keyof Omit<CrudPermissions, 'can'>

/**
 * Applies `config.permissions` (and the absence of `config.form`) once, where
 * every ListPage surface reads from:
 *
 * - no `form` drops `dialogs.create` / `dialogs.edit` (read-only list);
 * - a denied create/edit/view drops `dialogs.<op>` — no "New" button, no row
 *   edit/view injection, no footer Edit, no `?create=1` / `?edit=` deep link;
 * - the row view/edit/delete (configured, or injected by a dialog) inherit
 *   `permissions.<op>` unless they declare their own `permission`;
 * - `permissions.can` becomes `actionsConfig.can` unless that one is set.
 *
 * With a form and without `config.permissions` both inputs come back untouched.
 *
 * @internal
 */
export function applyCrudPermissions<TData>(
  config: CrudConfigWithAnyForm<TData>,
  actionsConfig: DataTableActionsConfig<TData> | undefined
): {
  dialogs: DialogsConfig<TData> | undefined
  actionsConfig: DataTableActionsConfig<TData> | undefined
} {
  const { permissions, form, dialogs: allDialogs } = config
  // No form = read-only list: no create/edit dialog to open
  const withForm =
    form || !allDialogs
      ? allDialogs
      : { ...allDialogs, create: undefined, edit: undefined }
  if (!permissions) return { dialogs: withForm, actionsConfig }

  const allowed = (op: Operation) => crudGranted(config, op)
  const dialogs = withForm && {
    ...withForm,
    create: allowed('create') ? withForm.create : undefined,
    edit: allowed('edit') ? withForm.edit : undefined,
    view: allowed('view') ? withForm.view : undefined,
  }

  const standard = { ...actionsConfig?.standard }
  for (const op of ['view', 'edit', 'delete'] as const) {
    const entry = standard[op]
    const required = permissions[op]
    // useListPageActions injects the row view/edit when the dialog exists
    const injected = op !== 'delete' && Boolean(dialogs?.[op])
    if (!required || entry === false || (!entry && !injected)) continue
    const own = typeof entry === 'object' ? entry : {}
    standard[op] = { ...own, permission: own.permission ?? required }
  }

  return {
    dialogs,
    actionsConfig: {
      ...actionsConfig,
      standard,
      can: actionsConfig?.can ?? permissions.can,
    },
  }
}
