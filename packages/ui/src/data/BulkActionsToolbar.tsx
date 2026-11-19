'use client'

import React from 'react'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog'
import { Trash2, Download, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { useTelamonjsT, useText } from '../i18n/use-t'
import type { I18nText } from '../i18n/msg'
import { withComponent } from '../utils/logger'

const logger = withComponent('BulkActionsToolbar')

export interface BulkAction<TData = unknown> {
  id: string
  label: I18nText
  icon?: React.ComponentType<{ className?: string }>
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'
  confirmDialog?: {
    /** The function form may return a MessageRef (e.g. ICU plural on `selectedRows.length`). */
    title: I18nText | ((selectedRows: TData[]) => I18nText)
    description: I18nText | ((selectedRows: TData[]) => I18nText)
    confirmText?: I18nText
    cancelText?: I18nText
  }
  handler: (
    selectedRows: TData[]
  ) => Promise<void | { success: boolean; message?: string }>
}

interface BulkActionsToolbarProps<TData> {
  selectedCount: number
  selectedRows: TData[]
  actions: BulkAction<TData>[]
  onClearSelection?: () => void
}

export function BulkActionsToolbar<TData>({
  selectedCount,
  selectedRows,
  actions,
  onClearSelection,
}: BulkActionsToolbarProps<TData>) {
  const t = useTelamonjsT()
  const text = useText()
  const [pendingAction, setPendingAction] =
    React.useState<BulkAction<TData> | null>(null)
  const [isExecuting, setIsExecuting] = React.useState(false)

  if (selectedCount === 0) return null

  const executeAction = async (action: BulkAction<TData>) => {
    setIsExecuting(true)
    try {
      const result = await action.handler(selectedRows)

      if (result && 'success' in result) {
        if (result.success) {
          toast.success(result.message || t('list.bulkActionSuccess'))
          if (onClearSelection) onClearSelection()
        } else {
          toast.error(result.message || t('list.bulkActionError'))
        }
      } else {
        toast.success(t('list.bulkActionSuccess'))
        if (onClearSelection) onClearSelection()
      }
    } catch (error) {
      logger.error('Failed to execute bulk action', {
        error: error instanceof Error ? error.message : String(error),
        actionId: action.id,
        selectedCount: selectedRows.length,
      })
      toast.error(t('list.bulkActionError'))
    } finally {
      setIsExecuting(false)
      setPendingAction(null)
    }
  }

  const handleActionClick = (action: BulkAction<TData>) => {
    if (action.confirmDialog) {
      setPendingAction(action)
    } else {
      executeAction(action)
    }
  }

  // Standard actions (shown as buttons)
  const standardActions = actions.filter(a =>
    ['delete', 'export'].includes(a.id)
  )
  // Custom actions (shown in dropdown)
  const customActions = actions.filter(
    a => !['delete', 'export'].includes(a.id)
  )

  return (
    <>
      <div className='flex items-center gap-2 px-3 py-2 border rounded-lg bg-muted/50'>
        <span className='text-sm font-medium text-muted-foreground'>
          {t('list.itemsSelected', { count: selectedCount })}
        </span>

        <div className='flex items-center gap-1 ml-2'>
          {/* Standard actions as buttons */}
          {standardActions.map(action => {
            const Icon =
              action.icon || (action.id === 'delete' ? Trash2 : Download)
            return (
              <Button
                key={action.id}
                variant={action.variant || 'outline'}
                size='sm'
                onClick={() => handleActionClick(action)}
                disabled={isExecuting}
                data-testid={`bulk-action-${action.id}`}
              >
                <Icon className='h-4 w-4 mr-1.5' />
                {text(action.label)}
              </Button>
            )
          })}

          {/* Custom actions in dropdown */}
          {customActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={isExecuting}
                  aria-label={t('list.bulkActions')}
                >
                  <MoreHorizontal className='h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                {customActions.map((action, index) => {
                  const Icon = action.icon
                  return (
                    <React.Fragment key={action.id}>
                      {index > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        onClick={() => handleActionClick(action)}
                      >
                        {Icon && <Icon className='h-4 w-4 mr-2' />}
                        {text(action.label)}
                      </DropdownMenuItem>
                    </React.Fragment>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Clear selection button */}
          {onClearSelection && (
            <Button
              variant='ghost'
              size='sm'
              onClick={onClearSelection}
              disabled={isExecuting}
              className='ml-2'
              data-testid='bulk-actions-clear-selection'
            >
              {t('list.clearSelection')}
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={!!pendingAction}
        onOpenChange={() => setPendingAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.confirmDialog?.title
                ? typeof pendingAction.confirmDialog.title === 'function'
                  ? text(pendingAction.confirmDialog.title(selectedRows))
                  : text(pendingAction.confirmDialog.title)
                : t('list.bulkConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.confirmDialog?.description
                ? typeof pendingAction.confirmDialog.description === 'function'
                  ? text(pendingAction.confirmDialog.description(selectedRows))
                  : text(pendingAction.confirmDialog.description)
                : t('list.bulkConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isExecuting}>
              {text(pendingAction?.confirmDialog?.cancelText) || t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingAction) {
                  executeAction(pendingAction)
                }
              }}
              disabled={isExecuting}
              className={
                pendingAction?.variant === 'destructive' ? 'bg-destructive' : ''
              }
            >
              {text(pendingAction?.confirmDialog?.confirmText) || t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
