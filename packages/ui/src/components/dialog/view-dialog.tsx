'use client'

import * as React from 'react'
import { Loader2, Pencil, Trash2, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { useTelamonjsT } from '../../i18n/use-t'
import { useDialogData } from '../../hooks/useDialogData'
import { RecordRefreshProvider } from '../../contexts/RecordRefreshContext'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../ui/alert-dialog'
import { cn } from '../../utils'
import { Button } from '../../ui/button'
import {
  DialogSize,
  DialogHeight,
  getDialogClassName,
  getSheetClassName,
} from '../../utils/spacing'
import { DialogLoadingState } from './DialogLoadingState'
import { QueryErrorState } from '../utilities/QueryErrorState'
import { logger } from '../../utils/logger'
import type { DialogHeaderConfig } from '../../types/dialog-header'
import { createHeaderRenderer } from './DialogHeaderContent'
import { CrudDialogShell } from './CrudDialogShell'

export interface ViewDialogProps<T extends Record<string, unknown>> {
  /** Entity ID to view (null when dialog is closed) */
  id: string | null
  /** Whether the dialog is open */
  open: boolean
  /** Callback to control dialog open state */
  onOpenChange: (open: boolean) => void
  /** Server Action to fetch entity data by ID */
  fetchAction: (id: string) => Promise<T>
  /** Dialog title (string or function that receives item) */
  title: string | ((item: T) => string)
  /** Dialog description, rendered below the title (sr-only with a custom header) */
  description?: string
  /** Render function for content - receives fetched data */
  renderContent: (data: T) => React.ReactNode
  /**
   * Optional custom header render function.
   * When provided, replaces the default DialogHeader with custom content.
   * Use for rich headers with icons, badges, stats cards, etc.
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
   *         <h2 className="font-semibold">{data.nome}</h2>
   *         <p className="text-xs text-gray-600">{data.codigo}</p>
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
   * - 'full': max-w-[95vw] (default, legacy behavior)
   *
   * @default 'full'
   */
  size?: DialogSize
  /** Force desktop mode (Dialog) even on mobile - useful for wide content */
  forceDesktopMode?: boolean
  /** Optional edit action - opens EditDialog and closes ViewDialog */
  onEdit?: () => void
  /**
   * Per-record gate for the Edit button (with `onEdit`): it shows only when this
   * returns true for the viewed item, and stays hidden while it loads. The
   * ListPage passes the row edit action's `visible`/`enabled` here.
   */
  canEdit?: (item: T) => boolean
  /** Optional delete action - shows confirmation before deleting */
  onDelete?: () => Promise<void>
  /** Per-record gate for the Delete button (with `onDelete`), like `canEdit` */
  canDelete?: (item: T) => boolean
  /** Delete confirmation config (if onDelete is provided) */
  deleteConfirmation?: {
    /** String, or a function that receives the viewed item */
    title: string | ((item: T) => string)
    /** String, or a function that receives the viewed item */
    description: string | ((item: T) => string)
  }
  /** Delete button label (default: "Delete"). A function receives the viewed item. */
  deleteLabel?: string | ((item: T) => string)
  /** Delete button icon (default: Trash2) */
  deleteIcon?: React.ComponentType<{ className?: string }> | LucideIcon
}

/**
 * ViewDialog - Universal view modal for ListPages
 *
 * Renders as Dialog on desktop, Sheet on mobile for optimal UX.
 * Fetches entity data on open, renders custom content via renderContent prop.
 *
 * @example
 * ```tsx
 * // In ListPage
 * const [viewDialogOpen, setViewDialogOpen] = useState(false)
 * const [selectedId, setSelectedId] = useState<string | null>(null)
 *
 * // Configure view action with custom handler
 * actionsConfig={{
 *   standard: {
 *     view: {
 *       icon: Eye,
 *       tooltip: 'View details',
 *       handler: (row) => {
 *         setSelectedId(row.id)
 *         setViewDialogOpen(true)
 *         return Promise.resolve({ success: true })
 *       }
 *     }
 *   }
 * }}
 *
 * // Render dialog
 * <ViewDialog
 *   id={selectedId}
 *   open={viewDialogOpen}
 *   onOpenChange={setViewDialogOpen}
 *   fetchAction={getParametro}
 *   title="Parameter Details"
 *   renderContent={(parametro) => (
 *     <DetailLayout
 *       title={parametro.nome}
 *       leftColumn={
 *         <DetailCard title="Information">
 *           <DetailField label="Code" value={parametro.codigo} />
 *           <DetailField label="Value" value={parametro.valor} />
 *         </DetailCard>
 *       }
 *     />
 *   )}
 * />
 * ```
 */
export function ViewDialog<T extends Record<string, unknown>>({
  id,
  open,
  onOpenChange,
  fetchAction,
  title,
  description,
  renderContent,
  renderHeader: renderHeaderProp,
  headerConfig,
  dialogClassName,
  dialogHeight,
  size = 'full',
  forceDesktopMode = false,
  onEdit,
  canEdit,
  onDelete,
  canDelete,
  deleteConfirmation,
  deleteLabel,
  deleteIcon: DeleteIcon = Trash2,
}: ViewDialogProps<T>) {
  const t = useTelamonjsT()
  // Use renderHeader prop if provided, otherwise create from headerConfig
  const renderHeader =
    renderHeaderProp ||
    (headerConfig ? createHeaderRenderer(headerConfig, 'view') : undefined)

  // Use the extracted hook for data fetching
  const { data, isLoading, error, refetch, refetchSilent } = useDialogData(
    id,
    fetchAction,
    open
  )

  const [isDeleting, setIsDeleting] = React.useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = React.useState(false)

  // Resolve title (static string or dynamic function)
  const resolvedTitle = React.useMemo(() => {
    if (typeof title === 'function') {
      return data ? title(data) : t('common.loading')
    }
    return title
  }, [title, data, t])

  // A gated action waits for the record: never offer what the gate would refuse
  const gate = (can: ((item: T) => boolean) | undefined) =>
    !can || (data ? can(data) : false)
  const showEdit = Boolean(onEdit) && gate(canEdit)
  const showDelete = Boolean(onDelete) && gate(canDelete)

  // Action handlers
  const handleEdit = () => {
    if (onEdit) {
      onOpenChange(false) // Close ViewDialog
      onEdit() // Open EditDialog
    }
  }

  const handleDeleteClick = () => {
    if (onDelete) {
      setConfirmDialogOpen(true)
    }
  }

  const executeDelete = async () => {
    if (!onDelete) return

    setIsDeleting(true)
    try {
      await onDelete()
      setConfirmDialogOpen(false)
      onOpenChange(false) // Close dialog after successful delete
    } catch (err) {
      logger.error('[ViewDialog] Delete error', {
        error: err instanceof Error ? err : String(err),
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  // Render content (shared between Dialog and Sheet)
  const content = () => {
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
        {renderContent(data)}
      </RecordRefreshProvider>
    )
  }

  // Render footer with actions
  const renderFooter = () => {
    // Only render if at least one action is provided
    if (!showDelete && !showEdit) {
      return null
    }

    const resolve = (v: string | ((item: T) => string) | undefined) =>
      typeof v === 'function' ? (data ? v(data) : '') : v
    const confirmTitle =
      resolve(deleteConfirmation?.title) || t('dialog.confirmDeleteTitle')
    const confirmDescription =
      resolve(deleteConfirmation?.description) ||
      t('dialog.confirmDeleteDescription')
    const deleteText = resolve(deleteLabel) || t('common.delete')

    return (
      <div className='flex items-center justify-between border-t bg-muted/50 px-6 py-4'>
        {/* Delete button (left) */}
        <div>
          {showDelete ? (
            <AlertDialog
              open={confirmDialogOpen}
              onOpenChange={setConfirmDialogOpen}
            >
              <Button
                variant='destructive'
                onClick={handleDeleteClick}
                disabled={isDeleting || isLoading}
                data-testid='view-dialog-delete-button'
              >
                {isDeleting ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    {t('dialog.deleting')}
                  </>
                ) : (
                  <>
                    <DeleteIcon className='mr-2 h-4 w-4' />
                    {deleteText}
                  </>
                )}
              </Button>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {confirmDescription}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    className='bg-red-500 text-white hover:bg-red-600'
                    onClick={executeDelete}
                  >
                    {deleteText}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <div />
          )}
        </div>

        {/* Close and Edit buttons (right) */}
        <div className='flex gap-2'>
          <Button
            variant='outline'
            onClick={handleClose}
            data-testid='view-dialog-close-button'
          >
            <X className='mr-2 h-4 w-4' />
            {t('common.close')}
          </Button>
          {showEdit && (
            <Button onClick={handleEdit} data-testid='view-dialog-edit-button'>
              <Pencil className='mr-2 h-4 w-4' />
              {t('common.edit')}
            </Button>
          )}
        </div>
      </div>
    )
  }

  const { sizeClass, heightClass } = getDialogClassName({
    size,
    height: dialogHeight,
    dialogClassName,
    hasCustomHeader: false,
  })

  // Desktop shows a clean centered status card while loading / on error
  const desktopStatus =
    isLoading || error || !data
      ? { sizeClass, isLoading, error, onRetry: refetch }
      : undefined

  const hasCustomHeader = Boolean(renderHeader && data)

  return (
    <CrudDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={resolvedTitle}
      description={description}
      customHeader={
        renderHeader && data ? <>{renderHeader(data)}</> : undefined
      }
      forceDesktopMode={forceDesktopMode}
      sheetContentClassName={cn(
        'h-[90vh] px-6 flex flex-col',
        getSheetClassName(dialogClassName)
      )}
      sheetBodyClassName='flex-1 mt-0 overflow-y-auto'
      dialogContentClassName={cn(
        // Always remove padding to allow full-width header/footer
        'flex flex-col !p-0 !gap-0 overflow-hidden',
        heightClass,
        sizeClass
      )}
      dialogBodyClassName={cn(
        'flex-1 min-h-0 overflow-y-auto md:flex md:flex-col',
        hasCustomHeader ? 'pt-0 pb-0' : 'px-6 pt-4 pb-6'
      )}
      dialogHeaderClassName='px-6 pt-6'
      desktopStatus={desktopStatus}
      footer={renderFooter()}
    >
      {content()}
    </CrudDialogShell>
  )
}
