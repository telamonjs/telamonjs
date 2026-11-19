import { z } from 'zod'
import type { FormField, FormSection } from './admin-form'

// ============================================================================
// TYPES & INTERFACES - BaseForm
// ============================================================================

/**
 * Metadata passed to onStateChange and onSubmit callbacks
 *
 * @category Forms
 *
 * @description
 * Provides comprehensive form state information for reactive updates,
 * auto-save, analytics, and validation feedback.
 *
 * @example
 * ```tsx
 * onStateChange={(values, metadata) => {
 *   if (metadata.isValid && metadata.touched) {
 *     // Auto-save logic
 *     saveFormDraft(values, metadata.id)
 *   }
 *
 *   // Analytics tracking
 *   trackFormProgress({
 *     formId: metadata.id,
 *     changeCount: metadata.changeCount,
 *     fields: metadata.changedFields
 *   })
 * }}
 * ```
 */
export interface FormMetadata {
  /** Is form currently in a valid state (no validation errors) */
  isValid: boolean
  /** Form validation errors by field */
  errors: Record<string, string[]>
  /** Is form in pending/loading state */
  isPending: boolean
  /** Which field(s) changed in this update */
  changedFields?: string[]
  /** Entity ID if in edit mode */
  id?: string
  /**
   * When this form instance mounted (ms since epoch), stable across renders.
   * Until 7.0.x it was re-read on every form-state change; reading the clock
   * during render is impure, and no consumer relied on the old meaning.
   */
  timestamp: number
  /** Number of form state changes since mount */
  changeCount: number
  /** If touched (user has interacted with form) */
  touched: boolean
}

/**
 * Button variant types
 *
 * @category Forms
 */
export type ButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link'

/**
 * Confirmation dialog configuration
 *
 * @category Forms
 *
 * @description
 * Configure a confirmation dialog that appears before executing an action.
 * Supports static strings or dynamic functions that receive form values.
 *
 * @example
 * ```tsx
 * confirmDialog: {
 *   title: 'Delete User?',
 *   description: 'This action cannot be undone.',
 *   confirmText: 'Yes, Delete',
 *   cancelText: 'Cancel'
 * }
 * ```
 *
 * @example
 * Dynamic dialog based on form values:
 * ```tsx
 * confirmDialog: {
 *   title: (values) => `Delete ${values.name}?`,
 *   description: (values) =>
 *     `Are you sure you want to delete ${values.name}? This cannot be undone.`,
 * }
 * ```
 */
export interface ConfirmDialogConfig<T extends Record<string, unknown>> {
  /** Dialog title (static or dynamic) */
  title: string | ((values: T) => string)
  /** Dialog description (static or dynamic) */
  description: string | ((values: T) => string)
  /** Text for confirm button. Default: 'Confirm' */
  confirmText?: string
  /** Text for cancel button. Default: 'Cancel' */
  cancelText?: string
}

/**
 * Individual action configuration for form buttons
 *
 * @category Forms
 *
 * @description
 * Configure behavior, appearance, and validation for form action buttons.
 * Supports conditional visibility/enablement based on form state.
 *
 * @example
 * ```tsx
 * actionsConfig: {
 *   standard: {
 *     submit: {
 *       label: 'Save Draft',
 *       variant: 'outline',
 *       requiresValidation: false,
 *       enabled: (values, metadata) => metadata.touched,
 *       onClick: async (values) => {
 *         await saveDraft(values)
 *       }
 *     }
 *   }
 * }
 * ```
 */
export interface BaseFormActionConfig<T extends Record<string, unknown>> {
  /** Whether action is enabled (static or dynamic). Default: true */
  enabled?: boolean | ((values: T, metadata: FormMetadata) => boolean)
  /** Whether action is visible (static or dynamic). Default: true */
  visible?: boolean | ((values: T, metadata: FormMetadata) => boolean)
  /** Whether action is in loading state (static or dynamic). Default: false */
  loading?: boolean | ((values: T, metadata: FormMetadata) => boolean)
  /** Button label text */
  label?: string
  /** Lucide icon component */
  icon?: React.ComponentType<{ className?: string }>
  /** Button visual variant */
  variant?: ButtonVariant
  /** Button size */
  size?: 'xs' | 'sm' | 'default' | 'lg'
  /** Button HTML type */
  type?: 'button' | 'submit' | 'reset'
  /** Click handler for the action */
  onClick?: (values: T, metadata: FormMetadata) => void | Promise<void>
  /** Navigation href (if action is a link) */
  href?: (values: T) => string
  /** Require confirmation before executing */
  confirmDialog?: boolean | ConfirmDialogConfig<T>
  /** Callback executed after successful action */
  onSuccess?: (values: T, result?: unknown) => void
  /** Callback executed if action fails */
  onError?: (error: Error, values: T) => void
  /** Whether to validate form before executing action. Default: false */
  requiresValidation?: boolean
  /** Whether form must have changes before executing action. Default: false */
  requiresChange?: boolean
  /** Success message to display after action (static or dynamic) */
  successMessage?: string | ((values: T) => string)
  /** Error message to display if action fails (static or dynamic) */
  errorMessage?: string | ((error: Error, values: T) => string)
}

/**
 * Custom button action (extends base config with ID)
 *
 * @category Forms
 *
 * @description
 * Define custom actions beyond submit/cancel/reset.
 * Position controls where button appears in the button group.
 *
 * @example
 * ```tsx
 * actionsConfig: {
 *   custom: [
 *     {
 *       id: 'preview',
 *       label: 'Preview',
 *       icon: Eye,
 *       position: 'after-submit',
 *       onClick: (values) => {
 *         openPreview(values)
 *       }
 *     }
 *   ]
 * }
 * ```
 */
export interface BaseFormCustomAction<T extends Record<string, unknown>>
  extends BaseFormActionConfig<T> {
  /** Unique identifier for this action */
  id: string
  /** Where to position this button */
  position?: 'before-submit' | 'after-submit' | 'left' | 'right'
}

/**
 * Configuration for BaseForm buttons and actions
 *
 * @category Forms
 *
 * @description
 * Centralized configuration for all form buttons: submit, cancel, reset, and custom actions.
 * Enables conditional logic, confirmation dialogs, and custom action handlers.
 *
 * @example
 * Standard actions with custom labels:
 * ```tsx
 * actionsConfig: {
 *   standard: {
 *     submit: { label: 'Create User', icon: Save },
 *     cancel: { label: 'Back to List', icon: ArrowLeft }
 *   }
 * }
 * ```
 *
 * @example
 * Custom actions:
 * ```tsx
 * actionsConfig: {
 *   standard: {
 *     submit: true,
 *     cancel: true
 *   },
 *   custom: [
 *     {
 *       id: 'save-draft',
 *       label: 'Save Draft',
 *       icon: FileText,
 *       position: 'before-submit',
 *       variant: 'outline',
 *       onClick: async (values) => {
 *         await saveDraft(values)
 *       }
 *     },
 *     {
 *       id: 'delete',
 *       label: 'Delete',
 *       icon: Trash,
 *       position: 'left',
 *       variant: 'destructive',
 *       confirmDialog: {
 *         title: 'Delete Entity?',
 *         description: 'This action cannot be undone.'
 *       },
 *       onClick: async (values) => {
 *         await deleteEntity(values.id)
 *       }
 *     }
 *   ]
 * }
 * ```
 */
export interface BaseFormActionsConfig<T extends Record<string, unknown>> {
  /** Standard actions (submit, cancel, reset) */
  standard?: {
    /** Submit button config (or true for default) */
    submit?: BaseFormActionConfig<T> | boolean
    /** Cancel button config (or true for default) */
    cancel?: BaseFormActionConfig<T> | boolean
    /** Reset button config (or true for default) */
    reset?: BaseFormActionConfig<T> | boolean
  }
  /** Custom action buttons */
  custom?: BaseFormCustomAction<T>[]
  /** Submit form when Enter is pressed. Default: false (tab navigation) */
  submitOnEnter?: boolean
  /** Submit form when any field changes (auto-save). Default: false */
  submitOnChange?: boolean
  /** Callback executed BEFORE any action */
  onBeforeAction?: (actionId: string, values: T) => boolean | Promise<boolean>
  /** Callback executed AFTER any action */
  onAfterAction?: (
    actionId: string,
    values: T,
    result?: unknown
  ) => void | Promise<void>
}

/**
 * BaseForm Props - Foundation form component with state observation
 *
 * @category Forms
 *
 * @description
 * BaseForm is the foundation for reactive forms with state observation, auto-save,
 * and flexible action handling. Use for filter forms, auto-save forms, or when you
 * need granular control over form state.
 *
 * **When to use:**
 * - Filter forms (onStateChange for real-time filtering)
 * - Auto-save forms (onStateChange + debounce)
 * - Forms with custom button logic
 * - Multi-step wizards without tabs
 *
 * **When NOT to use:**
 * - Simple create/edit forms → Use `CreateForm` / `EditForm`
 * - Forms with Server Actions only → Use `Form` (AdminForm)
 * - Multi-step wizards with tabs → Use `ZustandForm`
 *
 * @example
 * Filter form with real-time updates:
 * ```tsx
 * <BaseForm
 *   fields={filterFields}
 *   onStateChange={(values) => {
 *     // No debounce needed - filtering is instant
 *     setFilters(values)
 *   }}
 *   onStateChangeDebounce={0}
 *   hideDefaultButtons
 * />
 * ```
 *
 * @example
 * Auto-save form:
 * ```tsx
 * <BaseForm
 *   sections={sections}
 *   initialValues={draft}
 *   onStateChange={async (values, metadata) => {
 *     if (metadata.isValid && metadata.touched) {
 *       await saveDraft(values)
 *       toast.success('Draft saved')
 *     }
 *   }}
 *   onStateChangeDebounce={1000}
 *   actionsConfig={{
 *     standard: {
 *       submit: { label: 'Publish', requiresValidation: true }
 *     }
 *   }}
 * />
 * ```
 */
export interface BaseFormProps<T extends Record<string, unknown>> {
  /** Flat array of form fields (mutually exclusive with `sections`) */
  fields?: FormField[] | readonly FormField[]

  /** Array of form sections with grouped fields (mutually exclusive with `fields`) */
  sections?: FormSection[] | readonly FormSection[]

  /** Zod schema for client-side validation */
  validation?: z.ZodType

  /** Initial form values (supports nested objects with dot notation) */
  initialValues?: Partial<T>

  /** Entity ID for edit mode (passed in FormData and onStateChange metadata) */
  id?: string

  /**
   * Callback fired when form state changes
   * Use case: Auto-save, filter form, reactive field updates, analytics
   */
  onStateChange?: (values: T, metadata: FormMetadata) => void | Promise<void>

  /** Debounce interval for onStateChange in milliseconds (default: 300ms) */
  onStateChangeDebounce?: number

  /**
   * Optional callback when form is submitted
   * Can be triggered by: Submit button action, manual form submission, Enter key
   */
  onSubmit?: (values: T, metadata: FormMetadata) => void | Promise<void>

  /** Custom buttons and their behaviors */
  actionsConfig?: BaseFormActionsConfig<T>

  /** Default grid columns for fields (e.g., '2', '3', '4') */
  grid?: string

  /** Use tab navigation for sections */
  useTabs?: boolean

  /** Hide default buttons (set by AdminForm when it provides actionsConfig) */
  hideDefaultButtons?: boolean

  /** Custom className for form element */
  className?: string

  /** Triggered by Enter key - 'submit' or 'tab' (default: 'tab') */
  onEnterBehavior?: 'submit' | 'tab'

  /** Enable keyboard shortcuts (Ctrl+S = submit, Esc = cancel) */
  keyboardShortcuts?: boolean
}
