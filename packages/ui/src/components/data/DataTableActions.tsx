'use client'

/**
 * DataTableActions Component
 *
 *
 * Renders action buttons for DataTable rows with support for standard actions
 * (view, edit, delete) and custom actions with advanced features.
 */

import { Row } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import React, { useCallback, useMemo, useState } from 'react'
// IMPORTANT: import directly from the source modules, NOT from the root
// barrel ('../../'). Importing the barrel pulls the ENTIRE library (including
// eager tiptap/recharts modules) into the ListPage/DataTable runtime graph.
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../ui/alert-dialog'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu'
import { toast } from 'sonner'
import { wasToasted } from '../../utils/toasted-error'
import {
  ActionConfig,
  ConfirmDialogConfig,
  DataTableActionsConfig,
  TooltipConfig,
} from '../../types/actions'
import { getIconFromName } from '../../utils/icon'
import { TEST_IDS, getActionAccessibilityAttrs } from '../../utils/test-ids'
import { useTelamonjsT, useText } from '../../i18n/use-t'
import { isMessageRef } from '../../i18n/msg'

// IResponse type - should be provided by the consuming application
export interface IResponse {
  status?: 'success' | 'error' | 'warning'
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success' | 'warning'
}

interface DataTableActionsProps<TData> {
  row: Row<TData> & {
    original: TData & {
      id: string | number | BigInt
    }
  }
  config: DataTableActionsConfig<TData>
}

/**
 * Helper to extract entity label from row data for accessibility
 */
function getEntityLabel<TData>(row: TData): string | undefined {
  const record = row as Record<string, unknown>
  // Common label fields (name, title, label, description)
  return (record.name || record.title || record.label || record.description) as
    | string
    | undefined
}

/**
 * Canonical action-execution logic shared by the inline ActionButton path and
 * the overflow (dropdown "...") menu path. Resolves the action (href / onClick /
 * handler), then runs success/error side effects (onSuccess, successMessage,
 * onError, errorMessage, toast) and the completion callback.
 *
 * Parameterized so it works both inside ActionButton (with loading-state
 * setters + confirm-dialog reset) and from the stateless overflow items.
 */
async function runAction<TData>({
  action,
  row,
  actionId,
  router,
  onActionComplete,
  onLoadingChange,
  onSettled,
  text,
  fallbackError,
}: {
  action: ActionConfig<TData>
  row: TData & { id: string | number | BigInt }
  actionId: string
  router: ReturnType<typeof useRouter>
  onActionComplete?: (
    actionId: string,
    row: TData,
    result?: unknown
  ) => void | Promise<void>
  onLoadingChange?: (loading: boolean) => void
  onSettled?: () => void
  text: ReturnType<typeof useText>
  fallbackError: string
}): Promise<void> {
  onLoadingChange?.(true)

  try {
    let result: unknown

    // Execute based on action type
    if (action.href) {
      const href =
        typeof action.href === 'function' ? action.href(row) : action.href
      router.push(href)
      return
    } else if (action.onClick) {
      result = await action.onClick(row)
    } else if (action.handler) {
      // Pass row.id (string) for standard delete actions, full row for custom handlers
      const handlerArg = actionId === 'delete' ? row.id : row
      result = await action.handler(handlerArg as TData)
    }

    // Handle success
    if (action.onSuccess) {
      action.onSuccess(row, result)
    }

    // Show success message
    if (action.successMessage) {
      const message =
        typeof action.successMessage === 'function'
          ? action.successMessage(row)
          : action.successMessage
      toast.success(text(message))
    }

    // Call completion callback
    if (onActionComplete) {
      await onActionComplete(actionId, row, result)
    }
  } catch (error) {
    // Callbacks expect Error; cast (not narrow) to keep passing the original
    // thrown value through unchanged.
    const err = error as Error

    // Handle error
    if (action.onError) {
      action.onError(err, row)
    }

    // Show error message
    const errorMessage = action.errorMessage
      ? typeof action.errorMessage === 'function'
        ? action.errorMessage(row, err)
        : action.errorMessage
      : err.message || fallbackError

    // useCrudMutations already toasted it (standard delete) — unless a custom errorMessage is set
    if (action.errorMessage || !wasToasted(err)) toast.error(text(errorMessage))
  } finally {
    onLoadingChange?.(false)
    onSettled?.()
  }
}

/**
 * ActionButton - Renders a single action button with all its features
 */
function ActionButton<TData>({
  action,
  row,
  actionId,
  onActionComplete,
}: {
  action: ActionConfig<TData>
  row: TData & { id: string | number | BigInt }
  actionId: string
  onActionComplete?: (
    actionId: string,
    row: TData,
    result?: unknown
  ) => void | Promise<void>
}) {
  const router = useRouter()
  const t = useTelamonjsT()
  const text = useText()
  const [isLoading, setIsLoading] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)

  // Desestruturado para as deps dos memos: chamar action.visible(row) faria a
  // regra exhaustive-deps exigir o objeto `action` inteiro (this-binding)
  const { visible, enabled, loading, tooltip, badge } = action
  const resolvedLabel = text(action.label)

  // Check if action is visible
  const isVisible = useMemo(() => {
    if (visible === undefined) return true
    return typeof visible === 'function' ? visible(row) : visible
  }, [visible, row])

  // Check if action is enabled
  const isEnabled = useMemo(() => {
    if (enabled === undefined) return true
    return typeof enabled === 'function' ? enabled(row) : enabled
  }, [enabled, row])

  // Check loading state
  const isActionLoading = useMemo(() => {
    if (loading === undefined) return isLoading
    return typeof loading === 'function' ? loading(row) : loading
  }, [loading, row, isLoading])

  // Get tooltip content
  const tooltipContent = useMemo(() => {
    if (!tooltip) return null

    if (typeof tooltip === 'function') {
      return tooltip(row)
    } else if (typeof tooltip === 'string' || isMessageRef(tooltip)) {
      return text(tooltip)
    } else {
      const config = tooltip as TooltipConfig
      if (!isEnabled && !config.showWhenDisabled) return null
      return text(config.content)
    }
  }, [tooltip, row, isEnabled, text])

  // Get badge content
  const badgeContent = useMemo(() => {
    if (!badge) return null
    return typeof badge === 'function' ? badge(row) : badge
  }, [badge, row])

  // Accessible name: label, else the tooltip text (when plain text), else the id
  const accessibleName =
    resolvedLabel ||
    (typeof tooltipContent === 'string' ? tooltipContent : '') ||
    actionId

  // Generate accessibility attributes
  const accessibilityAttrs = useMemo(() => {
    const entityLabel = getEntityLabel(row)
    const label = accessibleName
    // Convert BigInt to number/string for accessibility
    const entityId =
      typeof row.id === 'bigint' ? Number(row.id) : (row.id as string | number)

    // Tooltip-derived names are already localized and complete: use them as-is
    // instead of the English "<id> item <entity>" composition
    const fromTooltip = !resolvedLabel && label !== actionId
    return getActionAccessibilityAttrs({
      id: actionId,
      label,
      entityName: fromTooltip ? undefined : 'item',
      entityId,
      entityLabel,
      loading: isActionLoading,
    })
  }, [actionId, accessibleName, resolvedLabel, row, isActionLoading])

  // Handle action execution (delegates to the shared runAction helper)
  const executeAction = useCallback(
    () =>
      runAction({
        action,
        row,
        actionId,
        router,
        onActionComplete,
        onLoadingChange: setIsLoading,
        onSettled: () => setConfirmDialogOpen(false),
        text,
        fallbackError: t('toast.unknownError'),
      }),
    [action, row, router, actionId, onActionComplete, text, t]
  )

  // Handle click with confirmation
  const handleClick = useCallback(() => {
    if (action.confirmDialog) {
      setConfirmDialogOpen(true)
    } else {
      executeAction()
    }
  }, [action.confirmDialog, executeAction])

  if (!isVisible) return null

  // Get confirm dialog config
  const getConfirmDialogConfig = (): ConfirmDialogConfig<TData> => {
    if (!action.confirmDialog) return {}
    if (action.confirmDialog === true) {
      // Default confirmation dialog
      return {
        title: t('dialog.confirmActionTitle'),
        description: t('dialog.confirmActionDescription'),
        confirmText: t('common.confirm'),
        cancelText: t('common.cancel'),
        variant: 'default',
      }
    }
    return action.confirmDialog
  }

  const confirmConfig = getConfirmDialogConfig()

  // Button content (hide action.icon when loading to avoid duplicate with Button's Loader2)
  const buttonContent = (
    <>
      {action.icon && !isActionLoading && <action.icon />}
      {resolvedLabel && <span className='ml-1.5'>{resolvedLabel}</span>}
      {badgeContent && (
        <Badge
          variant={action.badgeVariant || 'secondary'}
          className='ml-1.5 h-4 px-1 text-xs'
        >
          {badgeContent}
        </Badge>
      )}
    </>
  )

  // Wrap with confirmation dialog if needed
  const button = (
    <Button
      {...accessibilityAttrs}
      title={tooltipContent || accessibleName}
      data-tooltip-text={tooltipContent || undefined}
      variant={action.variant || 'ghost'}
      size={action.size || 'xs'}
      onClick={handleClick}
      disabled={!isEnabled || isActionLoading}
      loading={isActionLoading}
      className='hover:text-lg'
    >
      {buttonContent}
    </Button>
  )

  // A disabled button has pointer-events: none, so the hover has to land on a
  // wrapper. It stays outside AlertDialogTrigger: a click on it must not open.
  const withDisabledHint = (node: React.ReactNode) =>
    !isEnabled && tooltipContent ? (
      <span className='inline-flex' data-tooltip-text={tooltipContent}>
        {node}
      </span>
    ) : (
      node
    )

  // Wrap with confirmation dialog if needed
  if (action.confirmDialog) {
    return withDisabledHint(
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogTrigger asChild>{button}</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {text(
                typeof confirmConfig.title === 'function'
                  ? confirmConfig.title(row)
                  : confirmConfig.title
              )}
            </AlertDialogTitle>
            {confirmConfig.description && (
              <AlertDialogDescription>
                {text(
                  typeof confirmConfig.description === 'function'
                    ? confirmConfig.description(row)
                    : confirmConfig.description
                )}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          {/* TODO: Add support for confirmConfig.inputs if needed */}
          <AlertDialogFooter>
            <AlertDialogCancel data-testid='modal-cancel'>
              {text(confirmConfig.cancelText) || t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid='modal-confirm'
              className={
                confirmConfig.variant === 'destructive'
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : ''
              }
              onClick={executeAction}
            >
              {text(confirmConfig.confirmText) || t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  return withDisabledHint(button)
}

/**
 * Main DataTableActions component
 */
export function DataTableActions<TData>({
  row,
  config,
}: DataTableActionsProps<TData>) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTelamonjsT()
  const text = useText()

  // Prepare standard actions
  const standardActions = useMemo(() => {
    const actions: Array<{ id: string; config: ActionConfig<TData> }> = []

    if (!config.standard) return actions

    // View action
    if (config.standard.view) {
      const baseViewConfig: ActionConfig<TData> =
        config.standard.view === true
          ? {
              icon: getIconFromName('eye') || undefined,
              variant: 'ghost-info' as const,
            }
          : {
              icon:
                config.standard.view.icon ||
                getIconFromName('eye') ||
                undefined,
              variant: config.standard.view.variant || ('ghost-info' as const),
              ...config.standard.view,
            }

      // Only add href if there's no handler (handler takes precedence)
      const viewConfig: ActionConfig<TData> = {
        ...baseViewConfig,
        ...(baseViewConfig.handler
          ? {}
          : {
              href: baseViewConfig.href || `${pathname}/${row.original.id}`,
            }),
      }

      actions.push({ id: 'view', config: viewConfig })
    }

    // Edit action
    if (config.standard.edit) {
      const baseEditConfig: ActionConfig<TData> =
        config.standard.edit === true
          ? {
              icon: getIconFromName('pencil') || undefined,
              variant: 'ghost-primary' as const,
            }
          : {
              icon:
                config.standard.edit.icon ||
                getIconFromName('pencil') ||
                undefined,
              variant:
                config.standard.edit.variant || ('ghost-primary' as const),
              ...config.standard.edit,
            }

      // Only add href if there's no handler (handler takes precedence)
      const editConfig: ActionConfig<TData> = {
        ...baseEditConfig,
        ...(baseEditConfig.handler
          ? {}
          : {
              href:
                baseEditConfig.href || `${pathname}/${row.original.id}/editar`,
            }),
      }

      actions.push({ id: 'edit', config: editConfig })
    }

    // Delete action
    if (config.standard.delete) {
      const deleteConfig: ActionConfig<TData> =
        config.standard.delete === true
          ? {
              icon: getIconFromName('trash2') || undefined,
              variant: 'ghost-destructive',
              confirmDialog: true,
            }
          : {
              icon:
                config.standard.delete.icon ||
                getIconFromName('trash2') ||
                undefined,
              variant: config.standard.delete.variant || 'ghost-destructive',
              confirmDialog: config.standard.delete.confirmDialog !== false,
              ...config.standard.delete,
            }
      actions.push({ id: 'delete', config: deleteConfig })
    }

    return actions
  }, [config.standard, pathname, row.original.id])

  // Prepare custom actions
  const customActions = useMemo(() => {
    if (!config.custom) return []
    return config.custom.map(action => ({
      id: action.id,
      config: action,
      position: action.position || 'after',
    }))
  }, [config.custom])

  // Combine actions based on position
  const allActions = useMemo(() => {
    const beforeActions = customActions.filter(a => a.position === 'before')
    const afterActions = customActions.filter(a => a.position === 'after')
    const dropdownActions = customActions.filter(a => a.position === 'dropdown')

    return {
      inline: [...beforeActions, ...standardActions, ...afterActions],
      dropdown: dropdownActions,
    }
  }, [standardActions, customActions])

  // Handle action completion
  const handleActionComplete = useCallback(
    async (actionId: string, row: TData, result?: unknown) => {
      // Call global after action callback
      if (config.onAfterAction) {
        await config.onAfterAction(actionId, row, result)
      }

      // If delete action and no specific callback, refresh might be needed
      // This is handled by parent components
    },
    [config]
  )

  // Permission filtering runs once per actions config, not on every render of
  // every row; the Set makes each lookup O(1).
  const { filteredInlineActions, filteredDropdownActions } = useMemo(() => {
    const granted = config.userPermissions
      ? new Set(config.userPermissions)
      : null
    const allowed = (action: ActionConfig<TData>) => {
      if (!action.permission || !granted) return true
      const required = Array.isArray(action.permission)
        ? action.permission
        : [action.permission]
      return required.some(perm => granted.has(perm))
    }
    return {
      filteredInlineActions: allActions.inline.filter(a => allowed(a.config)),
      filteredDropdownActions: allActions.dropdown.filter(a =>
        allowed(a.config)
      ),
    }
  }, [allActions, config.userPermissions])

  // Determine display mode
  const displayMode = config.display?.mode || 'inline'
  const maxInline = config.display?.maxInline || 999
  const spacing = config.display?.spacing || 'normal'

  // Calculate which actions to show inline vs dropdown
  const { inlineActions, overflowActions } = useMemo(() => {
    if (displayMode === 'dropdown') {
      return {
        inlineActions: [],
        overflowActions: [...filteredInlineActions, ...filteredDropdownActions],
      }
    }

    if (displayMode === 'auto') {
      // TODO: Implement responsive detection
      // For now, use inline mode with maxInline
    }

    // Inline mode with max limit
    const inline = filteredInlineActions.slice(0, maxInline)
    const overflow = [
      ...filteredInlineActions.slice(maxInline),
      ...filteredDropdownActions,
    ]

    return { inlineActions: inline, overflowActions: overflow }
  }, [displayMode, maxInline, filteredInlineActions, filteredDropdownActions])

  // Calculate spacing classes
  const spacingClass =
    spacing === 'tight'
      ? 'space-x-1'
      : spacing === 'loose'
        ? 'space-x-3'
        : 'space-x-2'
  const alignmentClass =
    config.display?.alignment === 'left'
      ? 'justify-start'
      : config.display?.alignment === 'center'
        ? 'justify-center'
        : 'justify-end'

  return (
    <div className={`flex items-center ${alignmentClass} ${spacingClass}`}>
      {/* Inline actions */}
      {inlineActions.map(({ id, config: actionConfig }) => (
        // eslint-disable-next-line telamonjs-accessibility/button-accessibility -- ActionButton is a local component (not <button>/<Button>); it always renders a Button with {...accessibilityAttrs} internally
        <ActionButton
          key={id}
          action={actionConfig}
          row={row.original}
          actionId={id}
          onActionComplete={handleActionComplete}
        />
      ))}

      {/* Overflow dropdown */}
      {overflowActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='xs'
              className='h-8 w-8 p-0'
              data-testid='row-action-menu'
              aria-label={t('list.moreActions')}
            >
              <MoreHorizontal className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            {overflowActions.map(({ id, config: actionConfig }, index) => {
              // Check visibility
              const isVisible =
                actionConfig.visible === undefined ||
                (typeof actionConfig.visible === 'function'
                  ? actionConfig.visible(row.original)
                  : actionConfig.visible)

              if (!isVisible) return null

              const isEnabled =
                actionConfig.enabled === undefined ||
                (typeof actionConfig.enabled === 'function'
                  ? actionConfig.enabled(row.original)
                  : actionConfig.enabled)

              // Same tooltip forms the inline button accepts (string, msg(),
              // function of the row, TooltipConfig) — used as the item's name.
              const tooltip = actionConfig.tooltip
              const tooltipText =
                typeof tooltip === 'function'
                  ? tooltip(row.original)
                  : typeof tooltip === 'string' || isMessageRef(tooltip)
                    ? text(tooltip)
                    : tooltip
                      ? text(tooltip.content)
                      : ''
              const label = text(actionConfig.label) || tooltipText || id
              // Convert BigInt to number/string for test ID
              const entityId =
                typeof row.original.id === 'bigint'
                  ? Number(row.original.id)
                  : (row.original.id as string | number)

              return (
                <React.Fragment key={id}>
                  {index > 0 && index === filteredInlineActions.length && (
                    <DropdownMenuSeparator />
                  )}
                  <DropdownMenuItem
                    data-testid={TEST_IDS.ROW_ACTION.custom(id, entityId)}
                    disabled={!isEnabled}
                    onClick={event => {
                      // Keep the row click handler from also firing
                      event.stopPropagation()
                      void runAction({
                        action: actionConfig,
                        row: row.original,
                        actionId: id,
                        router,
                        onActionComplete: handleActionComplete,
                        text,
                        fallbackError: t('toast.unknownError'),
                      })
                    }}
                  >
                    {actionConfig.icon && (
                      <span className='mr-2 h-4 w-4 shrink-0 [&_svg]:size-4'>
                        {React.createElement(actionConfig.icon)}
                      </span>
                    )}
                    {label}
                    {actionConfig.badge && (
                      <Badge
                        variant={actionConfig.badgeVariant || 'secondary'}
                        className='ml-auto h-4 px-1 text-xs'
                      >
                        {typeof actionConfig.badge === 'function'
                          ? actionConfig.badge(row.original)
                          : actionConfig.badge}
                      </Badge>
                    )}
                  </DropdownMenuItem>
                </React.Fragment>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
