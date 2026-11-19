'use client'

import { useCallback, useMemo } from 'react'
import type { DataTableActionsConfig } from '../../types/actions'
import type { CrudConfigWithAnyForm, DialogsConfig } from '../../types/crud'

interface UseListPageActionsParams<TData> {
  /** True when config.actionsConfig === false (hide actions column) */
  actionsDisabled: boolean
  /** Normalized actionsConfig (false already mapped to undefined) */
  actionsConfig: DataTableActionsConfig<TData> | undefined
  dialogs: DialogsConfig<TData> | undefined
  mutations: CrudConfigWithAnyForm<TData>['mutations']
  deleteMutation: {
    mutateAsync: (variables: { id: string }) => Promise<unknown>
  }
  handleRefresh: () => Promise<void>
  /** Opens the integrated EditDialog for a row */
  openEditForRow: (row: TData) => void
  /** Opens the integrated ViewDialog for a row */
  openViewForRow: (row: TData) => void
}

/**
 * useListPageActions - Actions column config for ListPage (internal)
 *
 * Builds the final DataTable actionsConfig: injects the onAfterAction refresh
 * callback, overrides edit/view handlers to open the integrated dialogs and
 * wires the delete handler to the delete mutation.
 *
 * @internal Extracted from ListPage during the god-component decomposition.
 */
export function useListPageActions<TData>({
  actionsDisabled,
  actionsConfig,
  dialogs,
  mutations,
  deleteMutation,
  handleRefresh,
  openEditForRow,
  openViewForRow,
}: UseListPageActionsParams<TData>): DataTableActionsConfig<TData> | undefined {
  // mutateAsync is stable in react-query; the wrapper object is not
  const { mutateAsync: deleteAsync } = deleteMutation

  // Delete wrapper for mutations (DataTableActions delete handler)
  const deleteActionWrapper = useCallback(
    async (id: string | number | BigInt) => {
      // call deleteMutation
      const result = await deleteAsync({ id: String(id) })
      return result
    },
    [deleteAsync]
  )

  // Modify actionsConfig if editDialog is configured
  const finalActionsConfig = useMemo(() => {
    // If actionsConfig was explicitly set to false, disable actions column entirely
    if (actionsDisabled) return undefined

    // Create base config (fallback to empty if actionsConfig is undefined)
    const baseConfig = actionsConfig || {}
    const baseStandard = baseConfig.standard || {}

    const modified: DataTableActionsConfig<TData> = {
      ...baseConfig,
      standard: { ...baseStandard },
      // Add onAfterAction callback to refresh data after successful actions (especially delete)
      onAfterAction: async (actionId: string, row: TData, result?: unknown) => {
        // Call original callback if exists
        if (baseConfig.onAfterAction) {
          baseConfig.onAfterAction(actionId, row, result)
        }

        // Refresh data after the action completes. Handlers that resolve
        // without a return value (common in custom actions that just await a
        // server action) also refresh the list — only an explicit
        // `{ success: false }` skips the refresh.
        const explicitFailure =
          typeof result === 'object' &&
          result !== null &&
          'success' in result &&
          !(result as { success: boolean }).success

        if (!explicitFailure) {
          await handleRefresh()
        }
      },
    }

    // Inject delete handler for mutations. This MUST run before the
    // edit/view early-return below: the delete row-action is independent of
    // whether the config has a view/edit dialog, so wiring it after that guard
    // left delete unwired for any list with mutations.delete but no dialogs.
    if (baseStandard.delete && mutations) {
      const baseDelete = baseStandard.delete
      const deleteConfig =
        typeof baseDelete === 'object' && baseDelete !== null ? baseDelete : {}

      modified.standard!.delete = {
        ...deleteConfig,
        // DataTableActions invokes delete handlers with row.id (not the row),
        // while ActionConfig['handler'] is typed with the row — cast required.
        handler: deleteActionWrapper as unknown as (
          row: TData
        ) => Promise<{ success: boolean; message?: string }>,
      }
    }

    // Only the edit/view dialog handler overrides depend on dialogs — bail out
    // early when neither is configured (delete is already wired above).
    if (!dialogs?.edit && !dialogs?.view) {
      return modified
    }

    // Override edit handler if editDialog is present (`edit: false` = no row button)
    if (dialogs?.edit && baseStandard.edit !== false) {
      const baseEdit = baseStandard.edit
      const editConfig =
        typeof baseEdit === 'object' && baseEdit !== null ? baseEdit : {}

      const editHandler = (row: TData) => {
        openEditForRow(row)
        return Promise.resolve({ success: true })
      }

      modified.standard!.edit = {
        ...editConfig,
        handler: editHandler,
      }
    }

    // Override view handler if viewDialog is present. `view: false` = no row
    // button (the row click still opens the view dialog)
    if (dialogs?.view && baseStandard.view !== false) {
      const baseView = baseStandard.view
      const viewConfig =
        typeof baseView === 'object' && baseView !== null ? baseView : {}

      const viewHandler = (row: TData) => {
        openViewForRow(row)
        return Promise.resolve({ success: true })
      }

      modified.standard!.view = {
        ...viewConfig,
        handler: viewHandler,
      }
    }

    return modified
    // actionsDisabled is intentionally omitted (mirrors the original ListPage
    // memo): it only flips together with actionsConfig identity in practice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dialogs?.edit,
    dialogs?.view,
    actionsConfig,
    handleRefresh,
    mutations,
    deleteActionWrapper,
    openEditForRow,
    openViewForRow,
  ])

  return finalActionsConfig
}
