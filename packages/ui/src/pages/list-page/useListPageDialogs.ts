'use client'

import { useCallback, useMemo, useReducer, type RefObject } from 'react'
import { CLOSED_DIALOG, dialogReducer } from './dialog-state'
import { logger } from '../../utils/logger'
import { useDialogUrlSync, type DialogUrlParams } from './useDialogUrlSync'
import type { FormActionResult } from '../../components/forms/AdminForm'
import type { DataTableActionsConfig } from '../../types/actions'
import type { CrudConfigWithAnyForm, DialogsConfig } from '../../types/crud'

/**
 * Shape the integrated dialogs operate on. The dialog components require
 * `Record<string, unknown>` data, while TData is unconstrained — the
 * intersection keeps DialogConfig<TData> callbacks assignable.
 */
type DialogData<TData> = TData & Record<string, unknown>

interface UseListPageDialogsParams<TData> {
  dialogs: DialogsConfig<TData> | undefined
  mutations: CrudConfigWithAnyForm<TData>['mutations']
  /** Normalized actionsConfig (false already mapped to undefined) */
  actionsConfig: DataTableActionsConfig<TData> | undefined
  /** Current list data (used to resolve the row for ViewDialog delete) */
  data: TData[]
  createMutation: {
    mutateAsync: (
      data: Record<string, unknown>
    ) => Promise<FormActionResult<DialogData<TData>>>
  }
  updateMutation: {
    mutateAsync: (variables: {
      id: string
      data: Record<string, unknown>
    }) => Promise<FormActionResult<DialogData<TData>>>
  }
  deleteMutation: {
    mutateAsync: (variables: { id: string }) => Promise<unknown>
  }
  handleRefresh: () => Promise<void>
  /** Ref to the ListPage root — gates URL→state opening (see useDialogUrlSync). */
  rootRef?: RefObject<HTMLElement | null>
  /** false → ignore every `urlParam` (ListPage nested in another one's dialog). */
  dialogUrlSync?: boolean
}

/**
 * useListPageDialogs - Dialog state + handlers for ListPage (internal)
 *
 * Owns the 3 integrated dialog states (create/edit/view), the row -> dialog
 * openers used by the actions column, the view -> edit handoff and the
 * ViewDialog delete flow, plus the mutation/fetch wrappers consumed by
 * the dialog components.
 *
 * @internal Extracted from ListPage during the god-component decomposition.
 */
export function useListPageDialogs<TData>({
  dialogs,
  mutations,
  actionsConfig,
  data,
  createMutation,
  updateMutation,
  deleteMutation,
  handleRefresh,
  rootRef,
  dialogUrlSync = true,
}: UseListPageDialogsParams<TData>) {
  // Single dialog state machine — one open dialog at a time (view/edit/create).
  // The legacy boolean+id fields are derived below to keep the return shape that
  // ListPageDialogs/useListPageActions consume.
  const [dialogState, dispatch] = useReducer(dialogReducer, CLOSED_DIALOG)

  // ── Dialog deep-link (dialogs.<type>.urlParam): view/edit/create, synced both ways ──
  // dialogUrlSync=false → empty params → useDialogUrlSync becomes a no-op in both directions.
  const urlParams = useMemo<DialogUrlParams>(
    () =>
      dialogUrlSync
        ? {
            view: dialogs?.view?.urlParam,
            edit: dialogs?.edit?.urlParam,
            create: dialogs?.create?.urlParam,
          }
        : {},
    [
      dialogUrlSync,
      dialogs?.view?.urlParam,
      dialogs?.edit?.urlParam,
      dialogs?.create?.urlParam,
    ]
  )
  useDialogUrlSync({ params: urlParams, state: dialogState, dispatch, rootRef })

  // Derived legacy state (the consumers still read these by name)
  const viewDialogOpen = dialogState.type === 'view'
  const selectedViewEntityId =
    dialogState.type === 'view' ? dialogState.id : null
  const editDialogOpen = dialogState.type === 'edit'
  const selectedEntityId = dialogState.type === 'edit' ? dialogState.id : null
  // List row behind the edit dialog (EditDialog.headerRow): fills the header
  // fields getForEdit does not return. Undefined when the id is not on the
  // loaded page (deep link) — the header then uses the fetched record alone.
  const selectedEditRow = useMemo(
    () =>
      selectedEntityId === null
        ? undefined
        : data.find(
            item =>
              String((item as TData & { id: string | number }).id) ===
              selectedEntityId
          ),
    [data, selectedEntityId]
  )
  const createDialogOpen = dialogState.type === 'create'

  // onOpenChange adapters: Radix only ever calls these with `false` (closing);
  // the `true` branch is defensive (reopen the dialog for the current id).
  const setEditDialogOpen = useCallback(
    (open: boolean) => {
      if (open) {
        if (dialogState.id)
          dispatch({ kind: 'open', type: 'edit', id: dialogState.id })
      } else {
        dispatch({ kind: 'close' })
      }
    },
    [dialogState.id]
  )
  const setViewDialogOpen = useCallback(
    (open: boolean) => {
      if (open) {
        if (dialogState.id)
          dispatch({ kind: 'open', type: 'view', id: dialogState.id })
      } else {
        dispatch({ kind: 'close' })
      }
    },
    [dialogState.id]
  )
  const setCreateDialogOpen = useCallback((open: boolean) => {
    dispatch(open ? { kind: 'openCreate' } : { kind: 'close' })
  }, [])

  // Open EditDialog for a row (used by the overridden edit action handler)
  const openEditForRow = useCallback((row: TData) => {
    const rowId = (row as TData & { id: string | number }).id
    const id = typeof rowId === 'string' ? rowId : String(rowId)
    dispatch({ kind: 'open', type: 'edit', id })
  }, [])

  // Open ViewDialog for a row (used by the overridden view action handler)
  const openViewForRow = useCallback((row: TData) => {
    const rowId = (row as TData & { id: string | number }).id
    const id = typeof rowId === 'string' ? rowId : String(rowId)
    dispatch({ kind: 'open', type: 'view', id })
  }, [])

  const handleAdd = () => {
    // If createDialog is configured, open modal
    if (dialogs?.create) {
      dispatch({ kind: 'openCreate' })
    }
  }

  // Create handler for mutations (receives typed values directly)
  const createSubmitValues = useCallback(
    async (
      values: Record<string, unknown>
    ): Promise<FormActionResult<DialogData<TData>>> => {
      const result = await createMutation.mutateAsync(values)
      return result
    },
    [createMutation]
  )

  // Update handler for mutations (receives typed values directly)
  const updateSubmitValues = useCallback(
    async (
      values: Record<string, unknown>
    ): Promise<FormActionResult<DialogData<TData>>> => {
      const { id, ...data } = values
      if (!id) {
        throw new Error('Missing id in submit values')
      }
      const result = await updateMutation.mutateAsync({
        id: String(id),
        data,
      })
      return result
    },
    [updateMutation]
  )

  // Fetch wrapper for mutations (EditDialog data loading)
  const fetchActionWrapper = useCallback(
    async (id: string): Promise<DialogData<TData>> => {
      if (!mutations.getForEdit) {
        throw new Error(
          '[ListPage] mutations.getForEdit is required for edit functionality'
        )
      }
      return mutations.getForEdit(id)
    },
    [mutations]
  )

  // EditDialog success handler
  // Non-blocking: EditDialog closes right after the save; a failing refresh
  // must not hold it open (the mutation already invalidated the list).
  const handleEditDialogSuccess = useCallback(async () => {
    handleRefresh().catch(err =>
      logger.error('[ListPage] refresh after edit failed', {
        error: err instanceof Error ? err : String(err),
      })
    )
  }, [handleRefresh])

  // Row click handler (opens ViewDialog if configured)
  const handleRowClick = useCallback(
    (row: TData) => {
      if (dialogs?.view) {
        openViewForRow(row)
      }
    },
    [dialogs?.view, openViewForRow]
  )

  // ViewDialog Edit handler (view → edit handoff).
  //
  // The ViewDialog's Edit button calls `onOpenChange(false)` (→ close) right
  // before `onEdit()`, so by the time this runs the reducer may already be on
  // its way to `closed` — a `viewToEdit` action (which only transitions FROM
  // `view`) would then be a no-op and the edit dialog would never open. Opening
  // the edit dialog directly by the captured view id survives that ordering: the
  // `close` and this `open` batch into a single `edit` state.
  const handleViewDialogEdit = useCallback(() => {
    if (dialogs?.edit && selectedViewEntityId) {
      dispatch({ kind: 'open', type: 'edit', id: selectedViewEntityId })
    }
  }, [dialogs?.edit, selectedViewEntityId])

  // ViewDialog Delete handler (custom handler from actionsConfig when
  // provided; otherwise falls back to mutations.delete)
  const handleViewDialogDelete = useCallback(async () => {
    if (!selectedViewEntityId) return

    const deleteAction = actionsConfig?.standard?.delete
    if (!deleteAction) return

    const handler =
      typeof deleteAction === 'object' ? deleteAction.handler : undefined

    if (handler) {
      // Find the row data to pass to handler
      const row = data.find(item => {
        const candidateId = (item as TData & { id: string | number }).id
        const itemId =
          typeof candidateId === 'string' ? candidateId : String(candidateId)
        return itemId === selectedViewEntityId
      })
      if (!row) return

      const result = await handler(row as TData)
      // handler returns Promise<unknown> — only proceeds on {success: true}
      const succeeded =
        typeof result === 'object' &&
        result !== null &&
        'success' in result &&
        Boolean((result as { success?: unknown }).success)
      if (!succeeded) return
    } else {
      // ViewDialog catches rejections and keeps itself open on error
      await deleteMutation.mutateAsync({ id: selectedViewEntityId })
    }

    await handleRefresh()
  }, [selectedViewEntityId, actionsConfig, data, deleteMutation, handleRefresh])

  return {
    // Edit dialog
    editDialogOpen,
    setEditDialogOpen,
    selectedEntityId,
    selectedEditRow,
    // View dialog
    viewDialogOpen,
    setViewDialogOpen,
    selectedViewEntityId,
    // Create dialog
    createDialogOpen,
    setCreateDialogOpen,
    // Openers (consumed by useListPageActions)
    openEditForRow,
    openViewForRow,
    // Handlers
    handleAdd,
    handleRowClick,
    handleViewDialogEdit,
    handleViewDialogDelete,
    handleEditDialogSuccess,
    // mutation/fetch wrappers (consumed by ListPageDialogs)
    createSubmitValues,
    updateSubmitValues,
    fetchActionWrapper,
  }
}
