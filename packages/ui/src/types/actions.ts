/**
 * Data Table Actions Configuration Types
 *
 *
 * These types define the configuration for automatic action column injection
 * in DataTable components with a flexible, extensible architecture.
 */
import type { I18nText } from '../i18n/msg'

/**
 * Button variant types for actions
 */
export type ButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'ghost-info'
  | 'ghost-primary'
  | 'ghost-destructive'

/**
 * Badge variant types for action badges
 */
export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

/**
 * Confirmation dialog configuration
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- public generic default; consumers write `ConfirmDialogConfig` without type args and expect free row-field access. `unknown` would break that (mirrors CrudConfig's documented default, see types/crud.ts)
export interface ConfirmDialogConfig<TData = any> {
  /** Dialog title (the row function may return a MessageRef) */
  title?: I18nText | ((row: TData) => I18nText)
  /** Dialog description (the row function may return a MessageRef) */
  description?: I18nText | ((row: TData) => I18nText)
  /** Confirm button text */
  confirmText?: I18nText
  /** Cancel button text */
  cancelText?: I18nText
  /** Dialog variant */
  variant?: 'default' | 'destructive'
  /** Optional input fields in the dialog */
  inputs?: Array<{
    name: string
    label: string
    type: 'text' | 'textarea' | 'select'
    required?: boolean
    options?: string[] // For select type
    defaultValue?: string
  }>
}

/**
 * Tooltip configuration for actions
 */
export interface TooltipConfig {
  /** Tooltip content */
  content: I18nText
  /** Show tooltip even when action is disabled */
  showWhenDisabled?: boolean
}

/**
 * Core action configuration
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- public generic default, see ConfirmDialogConfig above
export interface ActionConfig<TData = any> {
  // Visibility and state control
  /** Whether the action is enabled (clickable) */
  enabled?: boolean | ((row: TData) => boolean)
  /** Whether the action is visible */
  visible?: boolean | ((row: TData) => boolean)
  /** Whether the action is in loading state */
  loading?: boolean | ((row: TData) => boolean)

  // Visual appearance
  /** Icon component to display */
  icon?: React.ComponentType
  /** Action label */
  label?: I18nText
  /** Button variant */
  variant?: ButtonVariant
  /** Button size */
  size?: 'xs' | 'sm' | 'default' | 'lg'

  // Tooltip and help
  /** Tooltip configuration */
  tooltip?: I18nText | TooltipConfig | ((row: TData) => string)

  // Behavior (mutually exclusive - use only one)
  /** Navigation URL */
  href?: string | ((row: TData) => string)
  /** Direct click handler */
  onClick?: (row: TData) => void | Promise<void>
  /** Async handler with result */
  handler?: (row: TData) => Promise<unknown>

  // Confirmation dialog
  /** Confirmation dialog configuration */
  confirmDialog?: boolean | ConfirmDialogConfig<TData>

  // Callbacks
  /** Called on successful action completion */
  onSuccess?: (row: TData, result?: unknown) => void
  /** Called on action error */
  onError?: (error: Error, row: TData) => void

  // Permissions
  /** Required permission(s) to show this action */
  permission?: string | string[]

  // Visual feedback
  /** Success message to display (I18nText) */
  successMessage?: I18nText | ((row: TData) => I18nText)
  /** Error message to display (I18nText; default: the error's message, else a localized fallback) */
  errorMessage?: I18nText | ((row: TData, error: Error) => I18nText)

  // Badges/indicators
  /** Badge content */
  badge?: string | number | ((row: TData) => string | number)
  /** Badge variant */
  badgeVariant?: BadgeVariant
}

/**
 * Display configuration for actions
 */
export interface ActionsDisplayConfig {
  /** Display mode for actions */
  mode?: 'inline' | 'dropdown' | 'auto'
  /** Maximum number of inline actions before grouping */
  maxInline?: number
  /** Alignment of actions */
  alignment?: 'left' | 'center' | 'right'
  /** Spacing between actions */
  spacing?: 'tight' | 'normal' | 'loose'
}

/**
 * Standard actions configuration
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- public generic default, see ConfirmDialogConfig above
export interface StandardActionsConfig<TData = any> {
  /** View action configuration */
  view?: ActionConfig<TData> | boolean
  /** Edit action configuration */
  edit?: ActionConfig<TData> | boolean
  /** Delete action configuration */
  delete?: ActionConfig<TData> | boolean
}

/**
 * Custom action configuration
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- public generic default, see ConfirmDialogConfig above
export interface CustomAction<TData = any> extends ActionConfig<TData> {
  /** Unique identifier for the action */
  id: string
  /** Position relative to standard actions */
  position?: 'before' | 'after' | 'dropdown'
}

/**
 * Main DataTable actions configuration
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- public generic default, see ConfirmDialogConfig above
export interface DataTableActionsConfig<TData = any> {
  // Standard actions (view, edit, delete)
  standard?: StandardActionsConfig<TData>

  // Custom actions
  custom?: CustomAction<TData>[]

  // Display configuration
  display?: ActionsDisplayConfig

  // Global callbacks
  /** Called before any action is executed */
  onBeforeAction?: (actionId: string, row: TData) => boolean | Promise<boolean>
  /** Called after any action is executed */
  onAfterAction?: (
    actionId: string,
    row: TData,
    result?: unknown
  ) => void | Promise<void>

  // Global permissions
  /** Current user permissions for permission checking */
  userPermissions?: string[]
}
