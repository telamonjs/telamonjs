/**
 * Data Table Actions Configuration Types
 *
 *
 * These types define the configuration for automatic action column injection
 * in DataTable components with a flexible, extensible architecture.
 */
import type { HTMLAttributes } from 'react'
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
  /**
   * Fields asked before confirming (a reason, a note…). Their values reach the
   * action as the second argument of `handler`/`onClick`: `(row, { inputs })`.
   */
  inputs?: ConfirmDialogInput[]
  /**
   * Keep the confirm disabled while any input fails (`required`, `minLength`,
   * `maxLength`, `min`/`max`, `validate`). Each failing field shows its message
   * live (muted until the field is edited), so the user always sees why the
   * confirm is off. Default: the confirm stays enabled and the messages show
   * from the first attempt.
   */
  disableUntilValid?: boolean
}

/** Choice of a `select` input: `value` reaches the action, `label` is shown */
export interface ConfirmDialogOption {
  value: string
  label: I18nText
}

/**
 * A field of a confirmation dialog (`ConfirmDialogConfig.inputs`,
 * `ConfirmActionDialog`'s `inputs`)
 */
export interface ConfirmDialogInput {
  /** Key of the value in `inputs` */
  name: string
  label: I18nText
  /** `date` is the native date input; its value is `YYYY-MM-DD` (`''` when empty) */
  type: 'text' | 'textarea' | 'select' | 'date'
  /** Confirming is blocked while it is empty */
  required?: boolean
  /** Choices of a `select`: a string is both value and label */
  options?: (string | ConfirmDialogOption)[]
  defaultValue?: string
  /** Placeholder of a `text`/`textarea`/`date`, or the `select` prompt */
  placeholder?: I18nText
  /** Help text under the field, announced with it */
  description?: I18nText
  /** Visible rows of a `textarea` */
  rows?: number
  /**
   * Minimum length of the trimmed value: checked when the field is filled, and
   * also when empty if `required`. While short, the field shows how many
   * characters are missing, live, without a confirm attempt.
   */
  minLength?: number
  /** Maximum length of the trimmed value; while over, the field shows the excess live */
  maxLength?: number
  /** Earliest `date` (`YYYY-MM-DD`): set on the native input and validated */
  min?: string
  /** Latest `date` (`YYYY-MM-DD`): set on the native input and validated */
  max?: string
  /** Suggestions of a `text` input (a native `<datalist>`; any value is still accepted) */
  suggestions?: string[]
  /** Native `inputMode` of a `text`/`textarea`, e.g. `'decimal'` */
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode']
  /** Native `autoComplete`, e.g. `'off'` for a typed confirmation word */
  autoComplete?: string
  /**
   * Custom rule beyond `required`: return a message to mark the field invalid
   * and block the confirm, `undefined` when valid. Runs (pure, on every
   * render) from the first confirm attempt on (live with `disableUntilValid`),
   * also on empty optional fields, with all the values for cross-field rules.
   * `minLength`, `required`, `maxLength` and `min`/`max` are checked first.
   */
  validate?: (
    value: string,
    values: Record<string, string>
  ) => I18nText | undefined
}

/**
 * Second argument of an action's `handler`/`onClick`, passed when its
 * `confirmDialog` declares `inputs`
 */
export interface ActionContext {
  /** Values of `confirmDialog.inputs`, by `name` */
  inputs: Record<string, string>
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
  /** Direct click handler (`ctx` only when `confirmDialog.inputs` is set) */
  onClick?: (row: TData, ctx?: ActionContext) => void | Promise<void>
  /** Async handler with result (`ctx` only when `confirmDialog.inputs` is set) */
  handler?: (row: TData, ctx?: ActionContext) => Promise<unknown>

  // Confirmation dialog
  /** Confirmation dialog configuration */
  confirmDialog?: boolean | ConfirmDialogConfig<TData>

  // Callbacks
  /** Called on successful action completion */
  onSuccess?: (row: TData, result?: unknown) => void
  /** Called on action error */
  onError?: (error: Error, row: TData) => void

  // Permissions
  /**
   * Required permission(s) to show this action (any of them). Checked with
   * `DataTableActionsConfig.can` when set, else against `userPermissions`.
   */
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
  /**
   * Permission checker. When set it decides every `permission` instead of the
   * exact lookup in `userPermissions`, so bypass roles and wildcards work, e.g.
   * `can: perm => checker.can(user, perm)` with `createPermissionChecker` from
   * `@telamonjs/permissions`.
   */
  can?: (permission: string) => boolean
}
