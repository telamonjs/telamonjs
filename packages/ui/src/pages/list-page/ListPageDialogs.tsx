'use client'

import {
  Suspense,
  lazy,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react'
import type { CreateDialog as CreateDialogType } from '../../components/dialog/create-dialog'
import type { EditDialog as EditDialogType } from '../../components/dialog/edit-dialog'
import { CrudViewDialog } from '../../components/dialog/crud-view-dialog'
import {
  actionEnabled,
  actionGranted,
  actionVisible,
} from '../../components/data/action-access'
import { resolveDialogTitle } from '../../components/dialog/resolve-dialog-title'
import { withComponent } from '../../utils/logger'
import { useTelamonjsT, useText } from '../../i18n/use-t'
import type { I18nText } from '../../i18n/msg'
import type {
  FormSection,
  FormActionResult,
} from '../../components/forms/AdminForm'
import type { ActionConfig, DataTableActionsConfig } from '../../types/actions'
import type {
  CrudConfigWithAnyForm,
  CrudPermissions,
  DialogsConfig,
  FormConfig,
} from '../../types/crud'

const logger = withComponent('ListPage')

// Dialogs pull AdminForm + the whole field registry; load each on first open so a
// ListPage that never opens one never pays for them.
const CreateDialog = lazy(() =>
  import('../../components/dialog/create-dialog').then(m => ({
    default: m.CreateDialog,
  }))
) as unknown as typeof CreateDialogType
const EditDialog = lazy(() =>
  import('../../components/dialog/edit-dialog').then(m => ({
    default: m.EditDialog,
  }))
) as unknown as typeof EditDialogType
/**
 * True once `open` has been true at least once. The dialog then stays mounted so
 * its exit animation and internal state behave exactly as before.
 */
function useEverOpened(open: boolean): boolean {
  const [seen, setSeen] = useState(open)
  if (open && !seen) setSeen(true)
  return seen
}

interface ListPageDialogsProps<TData> {
  dialogs: DialogsConfig<TData> | undefined
  mutations: CrudConfigWithAnyForm<TData>['mutations']
  /** Undefined for a read-only list (create/edit dialogs are already dropped) */
  form: FormConfig | undefined
  /** `config.permissions` (section saving in the portal view dialog) */
  permissions?: CrudPermissions
  /** form.sections normalized to an array (existing runtime contract) */
  formSections: FormSection[]
  /** Normalized actionsConfig (false already mapped to undefined) */
  actionsConfig: DataTableActionsConfig<TData> | undefined
  // EditDialog
  editDialogOpen: boolean
  setEditDialogOpen: (open: boolean) => void
  selectedEntityId: string | null
  /** List row behind the edit dialog (EditDialog.headerRow) */
  selectedEditRow?: TData
  fetchActionWrapper: (id: string) => Promise<TData & Record<string, unknown>>
  updateSubmitValues: (
    values: Record<string, unknown>
  ) => Promise<FormActionResult<TData & Record<string, unknown>>>
  handleEditDialogSuccess: () => Promise<void>
  // ViewDialog
  viewDialogOpen: boolean
  setViewDialogOpen: (open: boolean) => void
  selectedViewEntityId: string | null
  /** List row behind the view dialog (undefined on a deep link outside the loaded page) */
  selectedViewRow?: TData
  handleViewDialogEdit: () => void
  handleViewDialogDelete: () => Promise<void>
  // CreateDialog
  createDialogOpen: boolean
  setCreateDialogOpen: (open: boolean) => void
  createSubmitValues: (
    values: Record<string, unknown>
  ) => Promise<FormActionResult<TData & Record<string, unknown>>>
  handleRefresh: () => Promise<void>
}

/**
 * ListPageDialogs - Integrated Create/Edit/View dialogs for ListPage (internal)
 *
 * Render fragment for the 3 dialogs configured via CrudConfig.dialogs. State
 * and handlers are owned by useListPageDialogs; this component only renders.
 *
 * @internal Extracted from ListPage during the god-component decomposition.
 */
export function ListPageDialogs<TData>({
  dialogs,
  mutations,
  form,
  permissions,
  formSections,
  actionsConfig,
  editDialogOpen,
  setEditDialogOpen,
  selectedEntityId,
  selectedEditRow,
  fetchActionWrapper,
  updateSubmitValues,
  handleEditDialogSuccess,
  viewDialogOpen,
  setViewDialogOpen,
  selectedViewEntityId,
  selectedViewRow,
  handleViewDialogEdit,
  handleViewDialogDelete,
  createDialogOpen,
  setCreateDialogOpen,
  createSubmitValues,
  handleRefresh,
}: ListPageDialogsProps<TData>) {
  const t = useTelamonjsT()
  const text = useText()
  const editMounted = useEverOpened(editDialogOpen)
  const viewMounted = useEverOpened(viewDialogOpen)
  const createMounted = useEverOpened(createDialogOpen)
  /**
   * Shape the integrated dialogs operate on. The dialog components require
   * `Record<string, unknown>` data, while TData is unconstrained — the
   * intersection keeps DialogConfig<TData> callbacks assignable.
   */
  type DialogData = TData & Record<string, unknown>

  // The view footer's delete button inherits label/icon/confirm from standard.delete
  const deleteAction = actionsConfig?.standard?.delete
  const deleteCfg = typeof deleteAction === 'object' ? deleteAction : undefined
  const confirmCfg =
    typeof deleteCfg?.confirmDialog === 'object'
      ? deleteCfg.confirmDialog
      : undefined
  const resolveItemText = (
    v: I18nText | ((item: TData) => I18nText) | undefined
  ): string | ((item: DialogData) => string) | undefined =>
    typeof v === 'function'
      ? (item: DialogData) => text(v(item)) ?? ''
      : text(v)
  const tooltipCfg = deleteCfg?.tooltip
  const deleteTooltip: I18nText | ((item: TData) => string) | undefined =
    tooltipCfg && typeof tooltipCfg === 'object' && 'content' in tooltipCfg
      ? tooltipCfg.content
      : (tooltipCfg as I18nText | ((item: TData) => string) | undefined)
  const deleteViewProps = {
    deleteLabel: resolveItemText(deleteCfg?.label ?? deleteTooltip),
    deleteIcon: deleteCfg?.icon as
      | ComponentType<{ className?: string }>
      | undefined,
    deleteConfirmation: confirmCfg
      ? {
          title:
            resolveItemText(confirmCfg.title) ?? t('list.deleteConfirmTitle'),
          description:
            resolveItemText(confirmCfg.description) ??
            t('list.deleteConfirmDescription'),
        }
      : undefined,
  }

  // The footer follows the row action (the same rule as DataTableActions):
  // edit shows when `dialogs.edit` exists and `standard.edit !== false` (the
  // ListPage injects the row edit the same way), delete when `standard.delete`
  // is set; both honor `permission` against `userPermissions`, and `visible` /
  // `enabled` per record — against the list row, or the fetched record on a
  // deep link outside the loaded page.
  const standard = actionsConfig?.standard
  const footerAction = (
    offered: boolean,
    action: ActionConfig<TData> | boolean | undefined
  ) => {
    const cfg = typeof action === 'object' ? action : undefined
    return {
      offered:
        offered &&
        actionGranted(
          cfg?.permission,
          actionsConfig?.userPermissions,
          actionsConfig?.can
        ),
      can: cfg
        ? (item: DialogData) => {
            const row = selectedViewRow ?? (item as TData)
            return actionVisible(cfg, row) && actionEnabled(cfg, row)
          }
        : undefined,
    }
  }
  const footerEdit = footerAction(
    Boolean(dialogs?.edit) && standard?.edit !== false,
    standard?.edit
  )
  const footerDelete = footerAction(Boolean(standard?.delete), standard?.delete)

  return (
    <Suspense fallback={null}>
      {/* Integrated EditDialog */}
      {dialogs?.edit && mutations && editMounted && (
        <>
          {logger.debug('[ListPage] Rendering EditDialog', {
            id: selectedEntityId,
            open: editDialogOpen,
            title: dialogs.edit.title,
          })}
          <EditDialog<DialogData>
            id={selectedEntityId}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            fetchAction={fetchActionWrapper}
            onSubmitValues={updateSubmitValues}
            sections={formSections}
            validation={form?.validation}
            title={resolveDialogTitle(dialogs.edit.title, text)}
            description={text(dialogs.edit.description)}
            renderHeader={dialogs.edit.renderHeader}
            headerConfig={dialogs.edit.headerConfig}
            headerRow={selectedEditRow as DialogData | undefined}
            submitText={t('common.save')}
            size={dialogs.edit.size ?? 'auto'}
            dialogClassName={dialogs.edit.dialogClassName}
            dialogHeight={dialogs.edit.dialogHeight}
            useTabs={dialogs.edit.useTabs}
            lockedFields={dialogs.edit.lockedFields}
            onFieldChange={form?.onFieldChange}
            onSuccess={handleEditDialogSuccess}
          />
        </>
      )}

      {/* ViewDialog / ViewPortalDialog (integrated modal for view action) */}
      {dialogs?.view && mutations && viewMounted && (
        <CrudViewDialog<TData>
          config={{ dialogs, mutations, form, permissions, actionsConfig }}
          id={selectedViewEntityId}
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          footer={{
            onEdit: footerEdit.offered ? handleViewDialogEdit : undefined,
            canEdit: footerEdit.can,
            onDelete: footerDelete.offered ? handleViewDialogDelete : undefined,
            canDelete: footerDelete.can,
            ...deleteViewProps,
          }}
        />
      )}

      {/* CreateDialog (integrated modal for create action) */}
      {dialogs?.create && mutations && createMounted && (
        <CreateDialog<DialogData>
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmitValues={createSubmitValues}
          sections={formSections}
          validation={form?.validation}
          title={resolveDialogTitle(dialogs.create.title, text)}
          description={text(dialogs.create.description)}
          renderHeader={
            // CreateDialog headers render without item data
            dialogs.create.renderHeader as (() => ReactNode) | undefined
          }
          headerConfig={dialogs.create.headerConfig}
          size={dialogs.create.size ?? 'auto'}
          dialogClassName={dialogs.create.dialogClassName}
          dialogHeight={dialogs.create.dialogHeight}
          useTabs={dialogs.create.useTabs}
          defaultValues={dialogs.create.defaultValues}
          onFieldChange={form?.onFieldChange}
          onSuccess={() => {
            // Close first; the refresh runs in the background and its failure is
            // only logged (the record was already created).
            setCreateDialogOpen(false)
            handleRefresh().catch(err =>
              logger.error('[ListPage] refresh after create failed', {
                error: err instanceof Error ? err : String(err),
              })
            )
          }}
        />
      )}
    </Suspense>
  )
}
