'use client'

import * as React from 'react'
import { z } from 'zod'

import { useTelamonjsT } from '../../i18n/use-t'
import { CreateForm } from '../forms/CreateForm'
import type { FormSection, FormActionResult } from '../forms/AdminForm'
import { cn } from '../../utils'
import { logger } from '../../utils/logger'
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard'
import {
  DialogSize,
  DialogHeight,
  getDialogClassName,
  getSheetClassName,
  resolveUseTabs,
  resolveDialogSize,
  withWideFormGrid,
} from '../../utils/spacing'
import type { DialogHeaderConfig } from '../../types/dialog-header'
import { createCreateHeaderRenderer } from './DialogHeaderContent'
import { formHeaderConfig } from './form-header-config'
import { DialogErrorState } from './DialogErrorState'
import { CrudDialogShell } from './CrudDialogShell'

export interface CreateDialogProps<T extends Record<string, unknown>> {
  /** Whether the dialog is open */
  open: boolean
  /** Callback to control dialog open state */
  onOpenChange: (open: boolean) => void
  /** Server Action to create entity (FormData mode) */
  createAction?: (formData: FormData) => Promise<FormActionResult<T>>
  /** Submit handler with typed values (JSON mode) */
  onSubmitValues?: (
    values: Record<string, unknown>
  ) => Promise<FormActionResult<T> | void>
  /** Form sections configuration */
  sections: FormSection[] | readonly FormSection[]
  /** Zod validation schema */
  validation?: z.ZodType
  /** Dialog title (string or function - note: functions not applicable for create, always treated as string) */
  title: string | ((item: T) => string)
  /** Dialog description, rendered below the title (sr-only with a custom header) */
  description?: string
  /**
   * Optional custom header render function.
   * When provided, replaces the default DialogHeader with custom content.
   * Use for rich headers with icons, gradients, descriptions, etc.
   *
   * @example
   * ```tsx
   * renderHeader={() => (
   *   <div className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
   *     <div className="flex items-center gap-3">
   *       <div className="rounded-full bg-blue-600 p-2">
   *         <Building className="h-5 w-5 text-white" />
   *       </div>
   *       <div>
   *         <h2 className="font-semibold">New Client</h2>
   *         <p className="text-xs text-gray-600">Register a new client</p>
   *       </div>
   *     </div>
   *   </div>
   * )}
   * ```
   */
  renderHeader?: () => React.ReactNode
  /**
   * Declarative header configuration.
   * Alternative to renderHeader - provides a structured way to configure
   * dialog headers with icons and static text (no item data for create).
   *
   * When both headerConfig and renderHeader are provided, renderHeader takes precedence.
   *
   */
  headerConfig?: DialogHeaderConfig<T>
  /** Optional callback after successful creation (called before dialog closes) */
  onSuccess?: () => void | Promise<void>
  /** Optional custom submit button text (default: "Criar") */
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
   * Tabs for the sections. Default: automatic — tabs only with more
   * than one section and more than 20 fields; shorter forms are one page
   */
  useTabs?: boolean
  /** Optional default values for form fields */
  defaultValues?: Record<string, unknown>
  /** Callback fired when any form field value changes */
  onFieldChange?: (params: {
    field: string
    value: unknown
    values: Record<string, unknown>
    setValue: (name: string, value: unknown) => void
  }) => void | Promise<void>
}

/**
 * CreateDialog - Universal create modal for ListPages
 *
 * Renders as Dialog on desktop, Sheet on mobile for optimal UX.
 * Displays CreateForm for new entity creation with validation.
 *
 * @example
 * ```tsx
 * // In ListPage
 * const [createDialogOpen, setCreateDialogOpen] = useState(false)
 *
 * // Custom "Add" button handler
 * const handleAddClick = () => {
 *   setCreateDialogOpen(true)
 * }
 *
 * // Render dialog
 * <CreateDialog
 *   open={createDialogOpen}
 *   onOpenChange={setCreateDialogOpen}
 *   createAction={createParametroAction}
 *   sections={parametrosFormSections}
 *   validation={parametrosValidation}
 *   title="New Parameter"
 *   onSuccess={() => router.refresh()}
 * />
 * ```
 */
export function CreateDialog<T extends Record<string, unknown>>({
  open,
  onOpenChange,
  createAction,
  onSubmitValues,
  sections,
  validation,
  title,
  description,
  renderHeader: renderHeaderProp,
  headerConfig,
  onSuccess,
  submitText,
  dialogClassName,
  dialogHeight,
  size = 'auto',
  useTabs,
  defaultValues,
  onFieldChange,
}: CreateDialogProps<T>) {
  const t = useTelamonjsT()
  const resolvedSubmitText = submitText ?? t('dialog.createSubmit')
  // Use renderHeader prop if provided, otherwise create from headerConfig
  const renderHeader =
    renderHeaderProp ||
    (headerConfig
      ? createCreateHeaderRenderer(formHeaderConfig(headerConfig))
      : undefined)

  const [error, setError] = React.useState<string | null>(null)
  // Same discard confirmation as EditDialog: ESC/X/click-outside/Cancel on a
  // dirty form asks before throwing away what was typed.
  const guard = useUnsavedChangesGuard()

  // Resolve title (always string for create - no item data)
  const resolvedTitle = typeof title === 'string' ? title : t('common.create')

  // Check if custom header is being used
  const hasCustomHeader = Boolean(renderHeader)

  // Filter sections that will actually be rendered (exclude editOnly)
  // This matches CreateForm's filtering logic
  const visibleSections = sections.filter(section => !section.editOnly)

  // Check if we have multiple visible sections (for tabs)
  const effectiveUseTabs = resolveUseTabs(
    useTabs,
    visibleSections as { fields: unknown[] | unknown[][] }[]
  )
  const formSections = withWideFormGrid(sections, {
    useTabs: effectiveUseTabs,
    size: resolveDialogSize(
      size,
      visibleSections as { fields: unknown[] | unknown[][] }[]
    ),
  })

  // Handle successful form submission
  const handleSuccess = React.useCallback(async () => {
    // The record was created: closing must not depend on the caller's
    // post-success work (e.g. a list refresh that fails).
    try {
      await onSuccess?.()
    } catch (err) {
      logger.error(
        '[CreateDialog] onSuccess failed after a successful create',
        {
          error: err instanceof Error ? err : String(err),
        }
      )
    } finally {
      guard.reset() // created — nothing left to discard
      onOpenChange(false)
    }
  }, [onSuccess, onOpenChange, guard])

  // Reset error when dialog closes
  React.useEffect(() => {
    if (!open) {
      // Delay reset to avoid visual glitch during close animation
      const timer = setTimeout(() => {
        setError(null)
      }, 200)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [open])

  // Handle cancel action - close dialog instead of navigating back
  const handleCancel = React.useCallback(() => {
    guard.guard(() => onOpenChange(false))
  }, [guard, onOpenChange])

  const handleShellOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) onOpenChange(true)
      else guard.guard(() => onOpenChange(false))
    },
    [guard, onOpenChange]
  )

  const { finalClassName: finalDialogClassName } = getDialogClassName({
    size,
    dialogClassName,
    height: dialogHeight,
    hasCustomHeader,
    hasMultipleSections: effectiveUseTabs,
    sections: visibleSections as { fields: unknown[] | unknown[][] }[],
  })

  return (
    <>
      <CrudDialogShell
        open={open}
        onOpenChange={handleShellOpenChange}
        title={resolvedTitle}
        description={description}
        customHeader={renderHeader ? <>{renderHeader()}</> : undefined}
        sheetContentClassName={cn(
          'h-[95vh] px-4 pt-3 pb-0 flex flex-col',
          getSheetClassName(dialogClassName)
        )}
        sheetBodyClassName='flex-1 overflow-y-auto -mx-4 px-4'
        sheetHeaderClassName='flex-shrink-0 pb-2'
        sheetTitleClassName='text-base'
        dialogContentClassName={finalDialogClassName}
        dialogBodyClassName={cn(
          'flex-1 min-h-0 flex flex-col',
          // Custom header: AdminForm handles layout/padding.
          // Standard: -mx-6 px-6 mirrors the mobile sheet body — it expands the
          // scroll container to the DialogContent edges (cancelling its px-6) and
          // re-pads the content, so the AdminForm footer's full-bleed -mx-6 fits
          // the body's border-box instead of overflowing (which otherwise turned
          // overflow-y-auto into an x-scrollbar).
          !hasCustomHeader && 'overflow-y-auto -mx-6 px-6 mt-4'
        )}
        wrapDesktopCustomHeader
      >
        {error ? (
          <DialogErrorState error={error} />
        ) : (
          <CreateForm
            sections={formSections}
            action={createAction}
            onSubmitValues={onSubmitValues}
            validation={validation}
            submitText={resolvedSubmitText}
            onSuccess={handleSuccess}
            defaultValues={defaultValues as Partial<T>}
            cancelAction={handleCancel}
            useTabs={effectiveUseTabs}
            flush={hasCustomHeader}
            onFieldChange={onFieldChange}
            onDirtyChange={guard.setDirty}
          />
        )}
      </CrudDialogShell>
      {guard.dialog}
    </>
  )
}
