import { z } from 'zod'
import { FieldType } from '../../field-system/field-registry'
import type { I18nText } from '../../i18n/msg'
import type { DateLimit } from '../../field-system/date-limits'
import type { SubListField } from '../../components/crud/sub-list'

// ============================================================================
// TYPES & INTERFACES - AdminForm
// ============================================================================

/**
 * Option interface for select/relationship fields
 *
 * @category Forms
 */
export interface IOption {
  /** Unique value for the option */
  value: string | number
  /** Display label for the option (literal or `msg()`; I18nText) */
  label: I18nText
}

/**
 * CRUD operation function types for inline CRUD fields (`type: 'crud'`).
 * They match what crud-field calls and the `crudConfig.*` signatures: the
 * submitted data comes first, the ids second.
 *
 * - create: `(data, { id: parentId })`
 * - edit:   `(data, { id: parentId, itemId })`
 * - delete: `({ id }, { parentId })` on 1:N, `({ parentId, id })` on `manyToMany`
 *
 * Resolve `true` or `{ status: 'success' | 'error', description }`.
 *
 * @category Forms
 */
export type CrudListingFn = (params?: unknown) => Promise<unknown[]>
export type CrudCreateFn = (
  data: unknown,
  params: { id: string }
) => Promise<unknown>
export type CrudEditFn = (
  data: unknown,
  params: { id: string; itemId: string }
) => Promise<unknown>
export type CrudDeleteFn = (
  params: { id: string; parentId?: string },
  ctx?: { parentId: string }
) => Promise<unknown>
/** `id` is the id of the list item; `parentId` is the id of the parent record. */
export type CrudLoadFn = (id: string, parentId?: string) => Promise<unknown>

/**
 * FormField - Configuration for a single form field
 *
 * @category Forms
 *
 * @description
 * Defines the complete configuration for a form field, including type, validation,
 * layout, and advanced features like CRUD inline editing, file uploads, and relationships.
 *
 * Supports 34 field types including text, email, date, relationship, file upload, and more.
 *
 * @example
 * Basic text field:
 * ```tsx
 * const field: FormField = {
 *   name: 'firstName',
 *   label: 'First Name',
 *   type: 'text',
 *   required: true,
 *   placeholder: 'Enter your name'
 * }
 * ```
 *
 * @example
 * Relationship field with dynamic loading:
 * ```tsx
 * const field: FormField = {
 *   name: 'userId',
 *   label: 'User',
 *   type: 'relationship',
 *   required: true,
 *   loadField: async () => {
 *     const users = await getUsers()
 *     return users.map(u => ({ value: u.id, label: u.name }))
 *   }
 * }
 * ```
 *
 * @example
 * File upload field:
 * ```tsx
 * const field: FormField = {
 *   name: 'avatar',
 *   label: 'Avatar',
 *   type: 'image',
 *   uploadFn: async (path, file) => {
 *     const url = await uploadToS3(file)
 *     return url
 *   },
 *   path: '/uploads/avatars'
 * }
 * ```
 */
export interface FormField<TValue = unknown> {
  name: string
  /**
   * Field label. `I18nText` widened (i18n) — literal strings still
   * work everywhere; a `msg('...')` ref is resolved once at the BaseForm/AdminForm
   * boundary via `useText()` before reaching the field-system renderers.
   */
  label: I18nText
  type: FieldType
  required?: boolean
  description?: I18nText
  placeholder?: I18nText
  // Layout properties
  span?: string
  // Advanced field properties
  loadField?: () =>
    | Promise<IOption[]>
    | ((
        search: string | undefined,
        id: string,
        dependsOn?: string
      ) => Promise<IOption[]>)
  uploadFn?: (
    path: string,
    file: File | Blob
  ) => Promise<string> | ((id: string, file: File) => Promise<string>)
  path?: string
  /**
   * `file` fields: turns the stored value (e.g. a storage key) into the URL
   * the download button opens — sync or async (signed URL). Default: opens
   * the stored value as is. Only http(s), blob: and relative URLs are opened
   */
  resolveUrl?: (value: string) => string | Promise<string>
  Component?: ({ id }: { id: string }) => React.ReactElement
  mask?: string
  /**
   * `masked` fields: a built-in mask that wins over `mask` — `'tel'`
   * (landline/mobile by digit count), `'cpf'`, `'cnpj'`, `'cep'`. Any other
   * value falls back to `mask`
   */
  // The `string & Record<never, never>` member keeps any string assignable
  // (pre-preset configs) while the editor still suggests the presets.
  maskType?: 'tel' | 'cpf' | 'cnpj' | 'cep' | (string & Record<never, never>)
  /** `textarea` fields: visible text lines. Default: 4 */
  rows?: number
  dependsOn?: string
  focus?: boolean
  readOnly?: boolean
  /**
   * `date` fields: first/last valid day — a Date/ISO string, `'today'`,
   * another field's day (`{ field: 'start', offsetDays: 1 }`) or a function
   * of the form values (`v => v.emissao`). The
   * calendar disables the days outside and the form rejects a typed value
   * outside (tooSmallDate/tooBigDate), no schema rule needed
   */
  minDate?: DateLimit
  maxDate?: DateLimit
  default?: TValue
  editOnly?: boolean
  /**
   * Conditional visibility: the field renders (and validates) only while
   * this predicate returns `true` for the form's current values. Re-evaluated
   * reactively as any field changes (via `useWatch`, isolated per conditional
   * field — fields without `visibleWhen` never subscribe, so typing in one
   * field never re-renders another).
   *
   * A hidden field is dropped from both validation errors and the submitted
   * values (JSON or FormData) — the consumer's Zod schema does NOT need to
   * mark it `.optional()` for this to work.
   *
   * @example
   * ```tsx
   * { name: 'percentualPPI', label: '% PPI', type: 'number',
   *   visibleWhen: values => values.aplicarCotas === true }
   * ```
   */
  visibleWhen?: (values: Record<string, unknown>) => boolean
  // CRUD field properties
  fields?: FormField[]
  /** Columns of the sub-list: `{ header, accessorKey | accessorFn, cell? }` (`SubListField`) */
  listFields?: (SubListField | FormField)[]
  manyToMany?: boolean
  listingFn?: CrudListingFn
  createFn?: CrudCreateFn
  editFn?: CrudEditFn
  deleteFn?: CrudDeleteFn
  loadFn?: CrudLoadFn
  Footer?: React.ComponentType
  validation?: z.ZodType
  // Alternative CRUD config format (used by some projects)
  crudConfig?: {
    /** Heading shown above the sub-list (I18nText; was declared but never read before 7.3) */
    title?: I18nText
    /** Copy under the heading (I18nText) */
    description?: I18nText
    columns?: unknown[]
    fields?: FormField[]
    loadData?: (params: { id: string }) => Promise<unknown[]>
    loadForEdit?: (parentId: string, itemId: string) => Promise<unknown>
    create?: (data: unknown, params: { id: string }) => Promise<unknown>
    update?: (
      data: unknown,
      params: { id: string; itemId: string }
    ) => Promise<unknown>
    /** 2nd arg `ctx.parentId` on 1:N deletes; `manyToMany` gets it inside `params` */
    delete?: (
      params: { id: string; parentId?: string },
      ctx?: { parentId: string }
    ) => Promise<unknown>
    validation?: z.ZodType
    /** Empty-state title (default: "Nenhum registro"); I18nText */
    emptyTitle?: I18nText
    /** Empty-state description; I18nText */
    emptyDescription?: I18nText
  }
}

/**
 * FormSection - Groups related fields into logical sections
 *
 * @category Forms
 *
 * @description
 * Organizes form fields into labeled sections with optional descriptions and custom grids.
 * Supports both flat field arrays and row-based field arrays for precise layout control.
 *
 * @example
 * Basic section with flat fields:
 * ```tsx
 * const section: FormSection = {
 *   label: 'Personal Information',
 *   description: 'Enter your personal details',
 *   fields: [
 *     { name: 'firstName', label: 'First Name', type: 'text' },
 *     { name: 'email', label: 'Email', type: 'email' }
 *   ]
 * }
 * ```
 *
 * @example
 * Section with row-based layout:
 * ```tsx
 * const section: FormSection = {
 *   label: 'Address',
 *   fields: [
 *     [{ name: 'street', label: 'Street', type: 'text', span: '2' }],
 *     [
 *       { name: 'city', label: 'City', type: 'text' },
 *       { name: 'state', label: 'State', type: 'text' },
 *       { name: 'zip', label: 'ZIP', type: 'text' }
 *     ]
 *   ],
 *   grid: '3'
 * }
 * ```
 */
export interface FormSection {
  /** Section label displayed as heading */
  label: I18nText
  /** Fields in this section (flat or row-based) */
  fields: FormField[] | FormField[][]
  /** Optional description shown below label */
  description?: I18nText
  /** Grid columns (e.g., '2', '3', '4'). Default: '2' */
  grid?: string
  /** Only show section in edit mode (when id is present) */
  editOnly?: boolean
  /** Optional icon displayed with label */
  icon?: React.ReactNode
  /**
   * Conditional visibility for the whole section — same semantics as
   * `FormField.visibleWhen` (reactive, hidden fields dropped from
   * validation/submit). Only supported in the default (non-`useTabs`)
   * multi-section layout; tabs are rendered statically, so use per-field
   * `visibleWhen` inside a tab instead.
   */
  visibleWhen?: (values: Record<string, unknown>) => boolean
}

export interface AdminFormSections extends Array<FormSection> {}

/**
 * FormActionResult - Standardized result from Server Actions
 *
 * @category Forms
 *
 * @description
 * Type-safe result object returned by Server Actions to indicate success/failure
 * and provide data, messages, or field-level errors.
 *
 * @example
 * Success result:
 * ```tsx
 * return {
 *   success: true,
 *   data: savedUser,
 *   message: 'User created successfully'
 * }
 * ```
 *
 * @example
 * Error result with field errors:
 * ```tsx
 * return {
 *   success: false,
 *   message: 'Validation failed',
 *   errors: {
 *     email: ['Email is already taken'],
 *     password: ['Password must be at least 8 characters']
 *   }
 * }
 * ```
 */
export interface FormActionResult<TData = unknown> {
  /** Whether the operation succeeded */
  success: boolean
  /** Data returned from successful operation */
  data?: TData
  /** Success or error message */
  message?: string
  /** Field-level validation errors */
  errors?: Record<string, string[]>
}

/**
 * AdminFormProps - Configuration for AdminForm component
 *
 * @category Forms
 */
export interface AdminFormProps<T = Record<string, unknown>> {
  /** Flat array of form fields. Use for simple forms. Mutually exclusive with `sections`. */
  fields?: FormField[] | readonly FormField[]

  /** Array of form sections (grouped fields). Use for organized multi-section forms. Mutually exclusive with `fields`. */
  sections?: FormSection[] | readonly FormSection[]

  /** Server Action that receives FormData and returns success/error result.
   * Use for Next.js Server Actions. Mutually exclusive with `onSubmitValues`. */
  action?: (formData: FormData) => Promise<FormActionResult<T> | void>

  /**
   * Submit handler that receives typed values directly (no FormData conversion).
   * Use for React Query mutations or any JSON API. Mutually exclusive with `action`.
   */
  onSubmitValues?: (
    values: Record<string, unknown>
  ) => Promise<FormActionResult<T> | void>

  /** Initial form values for edit mode. Supports nested objects (converted to flat with dot notation). */
  data?: Partial<T>

  /** Text for submit button. Default: 'Salvar' */
  submitText?: I18nText

  /** Callback executed when user clicks Cancel button or on successful submission if no `onSuccess` callback */
  cancelAction?: () => void

  /** Index of initially active tab when using `useTabs`. Example: '0', '1', '2' */
  activeTab?: string

  /** Zod schema for client-side validation. Applied before calling Server Action. */
  validation?: z.ZodType

  /** Callback executed after successful Server Action (when result.success === true). Use for redirects or custom logic. */
  onSuccess?: (result: FormActionResult<T>) => void | Promise<void>

  /** Entity ID for edit mode. Automatically added to FormData when present. */
  id?: string

  /** Default grid columns for field layout. Example: '2', '3', '4'. Default: '2' */
  grid?: string

  /** Enable tab navigation for sections. Shows tabs at top with section labels. */
  useTabs?: boolean

  /** Hide submit/cancel buttons. Useful for custom button layouts. */
  hideButtons?: boolean

  /**
   * Flush mode - removes rounded corners, shadows, and borders.
   * Use when the form is rendered inside a dialog with a custom header.
   */
  flush?: boolean

  /**
   * Extra classes merged into the footer (submit/cancel bar) container.
   * The default footer assumes the form spans the dialog edge-to-edge;
   * use this to neutralize background/padding when the form lives inside
   * a padded container or a grid column (e.g. `'bg-transparent px-0 pb-0'`).
   */
  footerClassName?: string

  /**
   * Extra classes merged into the content (fields) container. Only applies
   * in `flush` mode, where the content carries its own padding (`px-6`) —
   * use to adjust it (e.g. `'md:pl-0'` when the container already provides
   * the left spacing).
   */
  contentClassName?: string

  /**
   * Callback fired when any form field value changes.
   * Receives the changed field name, value, all values, and a setValue function.
   */
  onFieldChange?: (params: {
    field: string
    value: unknown
    values: Record<string, unknown>
    setValue: (name: string, value: unknown) => void
  }) => void | Promise<void>

  /**
   * Callback fired whenever React Hook Form's `formState.isDirty` changes.
   * Reverting every field back to its original value clears the flag
   * (`isDirty` is precise, not sticky). Use to drive an unsaved-changes
   * guard (see `useUnsavedChangesGuard`).
   */
  onDirtyChange?: (isDirty: boolean) => void
}
