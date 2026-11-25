'use client'

import { Suspense, lazy, useCallback } from 'react'
import { useText } from '../../i18n/use-t'
import { withComponent } from '../../utils/logger'
import type { CrudConfigWithAnyForm } from '../../types/crud'
import type {
  ViewDialog as ViewDialogType,
  ViewDialogProps,
} from './view-dialog'
import type { ViewPortalDialog as ViewPortalDialogType } from './view-portal-dialog'
import { resolveDialogTitle } from './resolve-dialog-title'
import { crudGranted } from '../data/action-access'
import { usePermissionChecker } from '../../providers/PermissionsProvider'

const logger = withComponent('CrudViewDialog')

// Each dialog pulls AdminForm + the field registry: load only the one used, on first render
const ViewDialog = lazy(() =>
  import('./view-dialog').then(m => ({ default: m.ViewDialog }))
) as unknown as typeof ViewDialogType
const ViewPortalDialog = lazy(() =>
  import('./view-portal-dialog').then(m => ({ default: m.ViewPortalDialog }))
) as unknown as typeof ViewPortalDialogType

type DialogData<T> = T & Record<string, unknown>

export interface CrudViewDialogProps<TData> {
  /**
   * The module's CrudConfig — uses `dialogs.view`, `mutations.getForView ?? getForEdit`,
   * `form.validation`, and `permissions.edit` (checked like the row actions) to
   * gate `portal.onSaveSection`
   */
  config: Pick<
    CrudConfigWithAnyForm<TData>,
    'dialogs' | 'mutations' | 'form' | 'permissions' | 'actionsConfig'
  >
  id: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Footer actions of the classic ViewDialog (the portal variant has no footer) */
  footer?: Pick<
    ViewDialogProps<DialogData<TData>>,
    | 'onEdit'
    | 'canEdit'
    | 'onDelete'
    | 'canDelete'
    | 'deleteLabel'
    | 'deleteIcon'
    | 'deleteConfirmation'
  >
}

/**
 * CrudViewDialog - the view dialog a CrudConfig declares (`dialogs.view`),
 * standalone.
 *
 * Same dialog the ListPage opens on the "view" row action — ViewPortalDialog
 * when `dialogs.view.portal`, else ViewDialog with `renderContent` — so any
 * screen can open a record of another module in place (a link to an
 * equipment from a asset list) instead of navigating to that module's page.
 * Renders nothing when the config has no `dialogs.view`.
 */
export function CrudViewDialog<TData>({
  config,
  id,
  open,
  onOpenChange,
  footer,
}: CrudViewDialogProps<TData>) {
  const text = useText()
  const providerCan = usePermissionChecker()
  const { dialogs, mutations, form } = config
  const view = dialogs?.view
  const fetchAction = useCallback(
    async (recordId: string): Promise<DialogData<TData>> => {
      if (mutations.getForView)
        return mutations.getForView(recordId) as Promise<DialogData<TData>>
      if (mutations.getForEdit)
        return mutations.getForEdit(recordId) as Promise<DialogData<TData>>
      throw new Error(
        '[CrudViewDialog] mutations.getForView or mutations.getForEdit required'
      )
    },
    [mutations]
  )
  if (!view) return null
  if (view.portal && view.renderContent)
    logger.warn(
      'dialogs.view.portal and dialogs.view.renderContent are mutually exclusive — portal takes precedence'
    )

  const common = {
    id,
    open,
    onOpenChange,
    fetchAction,
    title: resolveDialogTitle(view.title, text),
    description: text(view.description),
    renderHeader: view.renderHeader,
    headerConfig: view.headerConfig,
    dialogClassName: view.dialogClassName,
    dialogHeight: view.dialogHeight,
    size: view.size || 'full',
    forceDesktopMode: true,
  } as const

  return (
    <Suspense fallback={null}>
      {view.portal ? (
        <ViewPortalDialog<DialogData<TData>>
          {...common}
          sections={view.portal.sections}
          defaultSection={view.portal.defaultSection}
          columns={view.portal.columns}
          validation={form?.validation}
          onSaveSection={
            crudGranted(config, 'edit', providerCan)
              ? view.portal.onSaveSection
              : undefined
          }
        />
      ) : (
        <ViewDialog<DialogData<TData>>
          {...common}
          renderContent={view.renderContent!}
          {...footer}
        />
      )}
    </Suspense>
  )
}
