'use client'

import * as React from 'react'
import { z } from 'zod'
import { useRouter } from 'next/navigation'

import { useTelamonjsT } from '../../i18n/use-t'
import { EditForm } from '../forms/EditForm'
import type { FormSection, FormActionResult } from '../forms/AdminForm'
import { RecordRefreshProvider } from '../../contexts/RecordRefreshContext'
import { useDialogData } from '../../hooks/useDialogData'
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard'
import { cn } from '../../utils'
import { logger } from '../../utils/logger'
import {
  DialogSize,
  DialogHeight,
  getDialogClassName,
  getSheetClassName,
  resolveUseTabs,
  resolveDialogSize,
  withWideFormGrid,
} from '../../utils/spacing'
import { DialogLoadingState } from './DialogLoadingState'
import { QueryErrorState } from '../utilities/QueryErrorState'
import type { DialogHeaderConfig } from '../../types/dialog-header'
import { createHeaderRenderer } from './DialogHeaderContent'
import { formHeaderConfig } from './form-header-config'
import { lockSectionFields } from './lock-section-fields'
import { CrudDialogShell } from './CrudDialogShell'

export interface EditDialogProps<T extends Record<string, unknown>> {
  /** Entity ID to edit (null when dialog is closed) */
  id: string | null
  /** Whether the dialog is open */
  open: boolean
  /** Callback to control dialog open state */
  onOpenChange: (open: boolean) => void
  /** Server Action to fetch entity data by ID */
  fetchAction: (id: string) => Promise<T>
  /** Server Action to update entity (FormData mode) */
  updateAction?: (formData: FormData) => Promise<FormActionResult<T>>
  /** Submit handler with typed values (JSON mode) */
  onSubmitValues?: (
    values: Record<string, unknown>
  ) => Promise<FormActionResult<T> | void>
  /** Form sections configuration */
  sections: FormSection[] | readonly FormSection[]
  /** Zod validation schema */
  validation?: z.ZodType
  /** Dialog title (string or function that receives item) */
  title: string | ((item: T) => string)
  /** Dialog description, rendered below the title (sr-only with a custom header) */
  description?: string
  /**
   * Optional custom header render function.
   * When provided, replaces the default DialogHeader with custom content.
   * Use for rich headers with icons, badges, entity info, etc.
   *
   * @example
   * ```tsx
   * renderHeader={(data) => (
   *   <div className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
   *     <div className="flex items-center gap-3">
   *       <div className="rounded-full bg-blue-600 p-2">
   *         <Building className="h-5 w-5 text-white" />
   *       </div>
   *       <div>
   *         <h2 className="font-semibold">Edit {data.nome}</h2>
   *         <p className="text-xs text-muted-foreground">#{data.codigo}</p>
   *       </div>
   *     </div>
   *   </div>
   * )}
   * ```
   */
  renderHeader?: (data: T) => React.ReactNode
  /**
   * Declarative header configuration.
   * Alternative to renderHeader - provides a structured way to configure
   * dialog headers with icons, badges, and stats.
   *
   * When both headerConfig and renderHeader are provided, renderHeader takes precedence.
   *
   */
  headerConfig?: DialogHeaderConfig<T>
  /**
   * Record to feed `renderHeader`/`headerConfig` and a function `title`,
   * instead of the data fetched by `fetchAction`.
   *
   * `fetchAction` (typically `mutations.getForEdit`) resolves `TFormData` —
   * shaped for the form, which in a module with denormalized/joined display
   * fields (e.g. a related entity's name) can be a strict subset of the row
   * `T` the list already has in memory. Without `headerData`, a header that
   * reads one of those fields sees `undefined` while (or even after)
   * `fetchAction` resolves. Pass the already-known list row here to fix it —
   * the header uses it as soon as it has it, rather than waiting on
   * `fetchAction` (most visible on the mobile Sheet, whose header renders
   * before the body finishes loading — the desktop Dialog still shows the
   * loading/error card in place of any header while `fetchAction` is
   * pending). Falls back to the fetched data when omitted (existing
   * behavior, unchanged).
   *
   */
  headerData?: T
  /**
   * Row already in memory (e.g. the list row that was clicked), merged UNDER
   * the record `fetchAction` resolves to feed `renderHeader`/`headerConfig`
   * and a function `title`: the fetched record wins on every key it defines,
   * the row only fills the keys it lacks or returns as `undefined` (joined or
   * denormalized display fields `getForEdit` does not return). Before the
   * fetch resolves the header uses the row alone.
   *
   * Unlike `headerData` (which replaces the fetched record and keeps
   * priority when both are passed), this never hides fetched values.
   * `ListPage` passes the clicked row automatically.
   *
   */
  headerRow?: T
  /** Optional callback after successful update (called before dialog closes) */
  onSuccess?: () => void | Promise<void>
  /** Optional custom submit button text (default: common.save, "Salvar") */
  submitText?: string
  /** Extra dialog className, merged over the `size` preset (and applied to the mobile Sheet minus w-/h- utilities) */
  dialogClassName?: string
  /** Dialog height: 'auto' (default, capped at 90vh) or 'full' (`h-[min(800px,85vh)]`, body scrolls). */
  dialogHeight?: DialogHeight
  /**
   * Dialog size preset.
   * - 'sm': max-w-md
   * - 'md': max-w-2xl
   * - 'lg': max-w-4xl
   * - 'xl': max-w-6xl
   * - 'full': max-w-[95vw] (legacy behavior)
   * - 'auto': Computes ideal size from sections/fields (default)
   *
   * @default 'auto'
   */
  size?: DialogSize
  /**
   * Fields shown read-only in the edit (the record's parent, e.g. the invoice of
   * a payment): the create keeps them editable
   */
  lockedFields?: readonly string[]
  /**
   * Tabs for the sections. Default: automatic — tabs only with more
   * than one section and more than 20 fields; shorter forms are one page
   */
  useTabs?: boolean
  /** Callback fired when any form field value changes */
  onFieldChange?: (params: {
    field: string
    value: unknown
    values: Record<string, unknown>
    setValue: (name: string, value: unknown) => void
  }) => void | Promise<void>
}

/** `top` over `base`, skipping keys `top` leaves `undefined`. */
function mergeUnder<T extends Record<string, unknown>>(
  base: T | undefined,
  top: T | undefined
): T | undefined {
  if (!base || !top) return top ?? base
  const merged: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(top)) {
    if (value !== undefined) merged[key] = value
  }
  return merged as T
}

/**
 * EditDialog - Universal edit modal for ListPages
 *
 * Renders as Dialog on desktop, Sheet on mobile for optimal UX.
 * Fetches entity data on open, renders EditForm, handles success/error states.
 *
 * @example
 * ```tsx
 * // In ListPage
 * const [editDialogOpen, setEditDialogOpen] = useState(false)
 * const [selectedId, setSelectedId] = useState<string | null>(null)
 *
 * // Configure edit action with custom handler
 * actionsConfig={{
 *   standard: {
 *     edit: {
 *       icon: Pencil,
 *       tooltip: 'Edit',
 *       handler: (row) => {
 *         setSelectedId(row.id)
 *         setEditDialogOpen(true)
 *         return Promise.resolve({ success: true })
 *       }
 *     }
 *   }
 * }}
 *
 * // Render dialog
 * <EditDialog
 *   id={selectedId}
 *   open={editDialogOpen}
 *   onOpenChange={setEditDialogOpen}
 *   fetchAction={getParametro}
 *   updateAction={updateParametroAction}
 *   sections={parametrosFormSections}
 *   validation={parametrosValidation}
 *   title="Edit Parameter"
 *   onSuccess={() => router.refresh()}
 * />
 * ```
 */
export function EditDialog<T extends Record<string, unknown>>({
  id,
  open,
  onOpenChange,
  fetchAction,
  updateAction,
  onSubmitValues,
  sections,
  validation,
  title,
  description,
  renderHeader: renderHeaderProp,
  headerConfig,
  headerData,
  headerRow,
  onSuccess,
  submitText,
  dialogClassName,
  dialogHeight,
  size = 'auto',
  useTabs,
  onFieldChange,
  lockedFields,
}: EditDialogProps<T>) {
  const t = useTelamonjsT()
  const resolvedSubmitText = submitText ?? t('common.save')
  // Use renderHeader prop if provided, otherwise create from headerConfig
  const renderHeader =
    renderHeaderProp ||
    (headerConfig
      ? createHeaderRenderer(formHeaderConfig(headerConfig), 'edit')
      : undefined)
  const router = useRouter()
  const guard = useUnsavedChangesGuard()

  // Use the extracted hook for data fetching
  // refetchSilent: a nested CrudField calls this after creating/editing/deleting
  // a row — without reloading the record, the header counters go stale.
  // Silent because the form cannot be unmounted mid-edit.
  const { data, isLoading, error, refetch, refetchSilent } = useDialogData(
    id,
    fetchAction,
    open
  )

  // Record used to feed the header/title — headerData when provided
  // (replaces the fetch), else the fetched record with headerRow filling the
  // keys it lacks. See the `headerData`/`headerRow` prop docs.
  const headerSource = React.useMemo(
    () => headerData ?? mergeUnder<T>(headerRow, data ?? undefined),
    [headerData, headerRow, data]
  )

  // Resolve title (static string or dynamic function)
  const resolvedTitle = React.useMemo(() => {
    if (typeof title === 'function' && headerSource) {
      return title(headerSource)
    }
    return title as string
  }, [title, headerSource])

  const handleSuccess = React.useCallback(
    async (_result: FormActionResult<T>) => {
      // Call user's onSuccess callback — a failure there (e.g. list refresh)
      // must not keep an already-saved dialog open.
      try {
        await onSuccess?.()
      } catch (err) {
        logger.error('[EditDialog] onSuccess failed after a successful save', {
          error: err instanceof Error ? err : String(err),
        })
      }

      // Refresh router cache
      router.refresh()

      // Saved successfully — nothing left to discard.
      guard.reset()

      // Close dialog
      onOpenChange(false)
    },
    [onSuccess, router, onOpenChange, guard]
  )

  const handleCancel = React.useCallback(() => {
    guard.guard(() => onOpenChange(false))
  }, [guard, onOpenChange])

  // Wraps the shell's onOpenChange: opening is always allowed; closing
  // (ESC, click outside, the X button) is routed through the same guard as
  // the Cancel button, so a dirty form can't be discarded silently.
  const handleShellOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        onOpenChange(nextOpen)
      } else {
        guard.guard(() => onOpenChange(false))
      }
    },
    [guard, onOpenChange]
  )

  // Check if custom header is being used (requires data for renderHeader(data))
  const hasCustomHeader = Boolean(renderHeader && headerSource)

  // Check if we have multiple sections (for tabs)
  const effectiveUseTabs = resolveUseTabs(
    useTabs,
    sections as { fields: unknown[] | unknown[][] }[]
  )

  const formSections = React.useMemo(
    () =>
      withWideFormGrid(lockSectionFields(sections, lockedFields), {
        useTabs: effectiveUseTabs,
        size: resolveDialogSize(
          size,
          sections as { fields: unknown[] | unknown[][] }[]
        ),
      }),
    [sections, lockedFields, effectiveUseTabs, size]
  )

  // Render content (shared between Dialog and Sheet)
  const renderFormContent = () => {
    if (isLoading) {
      return <DialogLoadingState />
    }

    if (error) {
      return <QueryErrorState error={error} onRetry={refetch} className='my-8' />
    }

    if (!data || !id) {
      return null
    }

    return (
      <RecordRefreshProvider refresh={refetchSilent}>
        <EditForm
          id={id}
          data={data}
          sections={formSections}
          action={updateAction}
          onSubmitValues={onSubmitValues}
          validation={validation}
          submitText={resolvedSubmitText}
          cancelAction={handleCancel}
          onSuccess={handleSuccess}
          useTabs={effectiveUseTabs}
          flush={hasCustomHeader}
          onFieldChange={onFieldChange}
          onDirtyChange={guard.setDirty}
        />
      </RecordRefreshProvider>
    )
  }

  const { sizeClass, finalClassName: finalDialogClassName } =
    getDialogClassName({
      size,
      dialogClassName,
      height: dialogHeight,
      hasCustomHeader,
      hasMultipleSections: effectiveUseTabs,
      sections: sections as { fields: unknown[] | unknown[][] }[],
    })

  // Desktop shows a clean centered status card while loading / on error
  const desktopStatus =
    isLoading || error || !data
      ? { sizeClass, isLoading, error, onRetry: refetch }
      : undefined

  return (
    <>
      <CrudDialogShell
        open={open}
        onOpenChange={handleShellOpenChange}
        title={resolvedTitle}
        description={description}
        customHeader={
          renderHeader && headerSource ? (
            <>{renderHeader(headerSource)}</>
          ) : undefined
        }
        sheetContentClassName={cn(
          'h-[95vh] pb-0 flex flex-col',
          hasCustomHeader ? 'px-0 pt-0' : 'px-4 pt-3',
          getSheetClassName(dialogClassName)
        )}
        sheetBodyClassName={cn(
          'flex-1 overflow-y-auto',
          !hasCustomHeader && '-mx-4 px-4'
        )}
        sheetHeaderClassName='flex-shrink-0 pb-2'
        sheetTitleClassName='text-base'
        sheetSrOnlyTitle
        dialogContentClassName={finalDialogClassName}
        dialogBodyClassName={
          hasCustomHeader
            ? 'flex-1 min-h-0 flex flex-col' // AdminForm manages scroll/padding via flush; flex-col + min-h-0 let it shrink under max-h
            : // -mx-6 px-6 mirrors the mobile sheet body so the AdminForm footer's
              // full-bleed -mx-6 fits the body's border-box (no x-overflow scrollbar).
              'flex-1 overflow-y-auto -mx-6 px-6 mt-4'
        }
        wrapDesktopCustomHeader
        desktopStatus={desktopStatus}
      >
        {renderFormContent()}
      </CrudDialogShell>
      {guard.dialog}
    </>
  )
}
