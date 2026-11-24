'use client'

import { hasDirtyField } from './dirty-fields'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { useEffect, useMemo, useState, useTransition, useRef } from 'react'
import { useIsMobile } from '../../hooks/use-mobile'
import { useScrollableNav } from '../../hooks/use-scrollable-nav'
import {
  FieldErrors,
  FieldValues,
  FormProvider,
  useForm,
  type Resolver,
} from 'react-hook-form'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import {
  logValidationResult,
  validateFormSections,
} from './validators/config-validator'
import { toast } from 'sonner'
import { wasToasted } from '../../utils/toasted-error'
import { getErrorMessage } from '../../utils/error-message'
import { Button } from '../../ui/button'
import { cn } from '../../utils'
import { ValidationErrors } from './ValidationErrors'
import { createFormDebugLogger } from '../../utils/debug/debug-logger'
import { logger } from '../../utils/logger'
import { useTelamonjsT, useText } from '../../i18n/use-t'
import { dateLimitViolations } from '../../field-system/date-limits'
import { resolveFormSections, resolveFormFieldsList } from './i18n-fields'

// Import and re-export extracted types
import type {
  FormField,
  FormSection,
  FormActionResult,
  AdminFormProps,
} from '../../types/forms/admin-form'

// Re-export types for backward compatibility
export type {
  FormField,
  FormSection,
  FormActionResult,
  AdminFormProps,
  IOption,
  CrudListingFn,
  CrudCreateFn,
  CrudEditFn,
  CrudDeleteFn,
  CrudLoadFn,
  AdminFormSections,
} from '../../types/forms/admin-form'

// Import extracted components
import { AdminFormButtons } from './AdminFormButtons'
import { hasCrudFields } from './admin-form/helpers'
import { renderFieldGroup } from './admin-form/field-group'
import type { AdminFormRenderContext } from './admin-form/field-renderer'
import { ConditionalField } from './admin-form/conditional-field'
import {
  collectHiddenFieldNames,
  omitHiddenFields,
  stripHiddenErrors,
} from './admin-form/visibility'

// ============================================================================
// ADMIN FORM COMPONENT
// ============================================================================

/**
 * AdminForm - Comprehensive form component with 34 field types
 *
 * @category Forms
 * @status stable
 *
 * @description
 * Production-ready form component powered by React Hook Form and Zod validation.
 * Supports 34 field types, multi-section layouts, tabbed navigation, Server Actions,
 * and advanced features like inline CRUD, file uploads, and dynamic relationships.
 *
 * **Key Features:**
 * - 34 built-in field types (text, email, date, relationship, file, etc.)
 * - Multi-section forms with tab navigation
 * - Zod schema validation
 * - Server Actions integration
 * - Automatic FormData conversion
 * - Toast notifications
 * - Edit-only fields (`editOnly` prop)
 * - Nested field support (dot notation)
 * - Grid-based responsive layouts
 * - Development mode config validation
 *
 * **Use Cases:**
 * - CRUD operations (create/edit records)
 * - Multi-step wizards (with `useTabs` prop)
 * - Complex forms with relationships
 * - Forms with file uploads
 * - Inline CRUD editing
 *
 * @example
 * Basic form with flat fields:
 * ```tsx
 * 'use client'
 * import { AdminForm } from '@telamonjs/ui'
 * import { createUser } from './actions'
 *
 * export default function UserForm() {
 *   return (
 *     <AdminForm
 *       fields={[
 *         { name: 'name', label: 'Name', type: 'text', required: true },
 *         { name: 'email', label: 'Email', type: 'email', required: true },
 *         { name: 'active', label: 'Active', type: 'boolean' }
 *       ]}
 *       action={createUser}
 *     />
 *   )
 * }
 * ```
 *
 * @example
 * Multi-section form with tabs:
 * ```tsx
 * 'use client'
 * import { AdminForm, FormSection } from '@telamonjs/ui'
 * import { User, Mail, Shield } from 'lucide-react'
 *
 * const sections: FormSection[] = [
 *   {
 *     label: 'Basic Info',
 *     icon: <User className="w-4 h-4" />,
 *     fields: [
 *       { name: 'name', label: 'Name', type: 'text', required: true },
 *       { name: 'birthDate', label: 'Birth Date', type: 'date' }
 *     ]
 *   },
 *   {
 *     label: 'Contact',
 *     icon: <Mail className="w-4 h-4" />,
 *     fields: [
 *       { name: 'email', label: 'Email', type: 'email', required: true },
 *       { name: 'phone', label: 'Phone', type: 'tel' }
 *     ]
 *   },
 *   {
 *     label: 'Permissions',
 *     icon: <Shield className="w-4 h-4" />,
 *     editOnly: true, // Only show in edit mode
 *     fields: [
 *       { name: 'role', label: 'Role', type: 'relationship', loadField: getRoles },
 *       { name: 'active', label: 'Active', type: 'boolean' }
 *     ]
 *   }
 * ]
 *
 * export default function UserForm({ user }: { user?: User }) {
 *   return (
 *     <AdminForm
 *       sections={sections}
 *       action={user ? updateUser : createUser}
 *       data={user}
 *       id={user?.id}
 *       useTabs
 *       validation={userSchema}
 *       onSuccess={(result) => router.push('/users')}
 *     />
 *   )
 * }
 * ```
 *
 * @example
 * Form with Zod validation:
 * ```tsx
 * import { z } from 'zod'
 *
 * const schema = z.object({
 *   email: z.string().email('Invalid email'),
 *   password: z.string().min(8, 'Password must be at least 8 characters'),
 *   confirmPassword: z.string()
 * }).refine(data => data.password === data.confirmPassword, {
 *   message: 'Passwords do not match',
 *   path: ['confirmPassword']
 * })
 *
 * <AdminForm
 *   fields={fields}
 *   validation={schema}
 *   action={createUser}
 * />
 * ```
 *
 * @example
 * Server Action with FormActionResult:
 * ```tsx
 * 'use server'
 * import { z } from 'zod'
 * import { FormActionResult } from '@telamonjs/ui'
 *
 * export async function createUser(formData: FormData): Promise<FormActionResult<User>> {
 *   const data = Object.fromEntries(formData)
 *
 *   try {
 *     const user = await prisma.user.create({ data })
 *
 *     return {
 *       success: true,
 *       data: user,
 *       message: 'User created successfully'
 *     }
 *   } catch (error) {
 *     return {
 *       success: false,
 *       message: 'Failed to create user',
 *       errors: { email: ['Email already exists'] }
 *     }
 *   }
 * }
 * ```
 *
 * @see {@link /apps/docs/content/docs/patterns/form-pattern.mdx | Form Pattern}
 * @see {@link /apps/docs/content/docs/patterns/admin-module-structure.mdx | Module Structure}
 */

export function AdminForm<T extends Record<string, unknown>>({
  fields,
  sections,
  action,
  data,
  submitText,
  cancelAction,
  activeTab,
  validation,
  onSuccess,
  id,
  grid,
  useTabs,
  hideButtons,
  flush = false,
  footerClassName,
  contentClassName,
  onFieldChange,
  onSubmitValues,
  onDirtyChange,
}: AdminFormProps<T>) {
  // react-hook-form's form.watch() returns a subscription API the compiler
  // can't safely memoize (documented incompatible-library case).
  'use no memo'

  const t = useTelamonjsT()
  const text = useText()
  const debugLogger = createFormDebugLogger('AdminForm')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [currentSectionIndex, setCurrentSectionIndex] = useState(
    activeTab ? parseInt(activeTab) : 0
  )
  const {
    navRef,
    canScrollLeft,
    canScrollRight,
    scroll,
    startHoverScroll,
    stopHoverScroll,
  } = useScrollableNav()
  const formRef = useRef<ReturnType<typeof useForm> | null>(null)
  const isMobile = useIsMobile()

  // Compute boolean defaults: boolean fields should default to false if not provided
  const booleanDefaults = useMemo(() => {
    const defaults: Record<string, boolean> = {}
    const allFields = sections
      ? sections.flatMap(s => {
          const first = s.fields[0]
          return Array.isArray(first)
            ? (s.fields as FormField[][]).flat()
            : (s.fields as FormField[])
        })
      : fields || []
    for (const field of allFields) {
      if (field.type === 'boolean') {
        // respect the field's `default`; without one, keep false
        defaults[field.name] =
          typeof field.default === 'boolean' ? field.default : false
      }
    }
    return defaults
  }, [sections, fields])

  // React Hook Form with optional Zod validation
  // Note: zodResolver v5 expects `_def.typeName` (Zod3Type), which every concrete
  // zod 3 schema carries at runtime but the base `z.ZodType` type does not declare.
  //
  // A field/section hidden by `visibleWhen` must not block submission even
  // when the consumer's schema requires it (aplicarCotas=false hides 6
  // percentage fields the schema still marks required) — the zod resolver
  // still runs normally, but errors on currently-hidden fields are dropped
  // from its result before RHF sees them.
  const zodRes: Resolver<FieldValues> | undefined = validation
    ? (zodResolver(
        validation as typeof validation & { _def: { typeName: string } }
      ) as Resolver<FieldValues>)
    : undefined

  const resolver: Resolver<FieldValues> | undefined = zodRes
    ? async (values, context, options) => {
        const result = await zodRes(values, context, options)
        const hadErrors = Object.keys(result.errors).length > 0
        if (!hadErrors) return result // clean success: keep zod's transformed values

        const hidden = collectHiddenFieldNames(
          { fields, sections },
          values as Record<string, unknown>
        )
        if (hidden.size === 0) return result // real errors, nothing to strip

        // Mutated in place: `result.errors` is a fresh object from this same
        // zodRes() call, not RHF's committed state.
        stripHiddenErrors(result.errors as Record<string, unknown>, hidden)

        if (Object.keys(result.errors).length === 0) {
          // Every error belonged to a hidden field — all clear. zodResolver's
          // error branch always returns `values: {}`, so hand back the raw
          // submitted values instead (hidden fields are stripped later, in
          // handleSubmit, before they reach the consumer).
          return { values, errors: {} as Record<string, never> }
        }
        return result
      }
    : undefined

  // `minDate`/`maxDate` of date fields are validated here too (typed values),
  // with or without a schema — the calendar alone only disables days
  const dateLimitFields = useMemo(
    () =>
      (sections
        ? sections.flatMap(s =>
            (s.fields as (FormField | FormField[])[]).flat()
          )
        : fields || []
      ).filter(f => f.minDate || f.maxDate),
    [sections, fields]
  )
  const resolverWithLimits: Resolver<FieldValues> | undefined =
    dateLimitFields.length === 0
      ? resolver
      : async (values, context, options) => {
          const result = resolver
            ? await resolver(values, context, options)
            : { values, errors: {} }
          const hidden = collectHiddenFieldNames(
            { fields, sections },
            values as Record<string, unknown>
          )
          const errors: Record<string, unknown> = { ...result.errors }
          const violations = dateLimitViolations(
            dateLimitFields,
            values as Record<string, unknown>
          )
          let added = false
          for (const [name, v] of Object.entries(violations)) {
            if (hidden.has(name) || errors[name]) continue
            errors[name] = {
              type: 'dateLimit',
              message:
                v.kind === 'max'
                  ? t('validation.tooBigDate', { max: v.limit })
                  : t('validation.tooSmallDate', { min: v.limit }),
            }
            added = true
          }
          return added ? { values: {}, errors: errors as never } : result
        }

  const form = useForm<FieldValues>({
    defaultValues: { ...booleanDefaults, ...(data || {}) },
    ...(resolverWithLimits && { resolver: resolverWithLimits }),
  })

  // onDirtyChange: notify the caller whenever the user has actually changed a
  // field. Uses `dirtyFields`, not RHF's `isDirty`: `isDirty` deep-compares all
  // current values with `defaultValues`, so registering a field that has no
  // default (e.g. nested `pessoa.nome` → `{ pessoa: { nome: undefined } }`)
  // flips it to true with nothing typed — every CreateDialog asked to discard
  // changes on an untouched form. Reading `formState.dirtyFields` here
  // (render scope) is required for RHF's proxy to subscribe to it.
  const { dirtyFields } = form.formState
  const isDirty = hasDirtyField(dirtyFields)
  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  // onFieldChange: watch all fields and call callback when a field changes
  useEffect(() => {
    if (!onFieldChange) return

    // eslint-disable-next-line react-hooks/incompatible-library -- form.watch() returns a subscription the compiler can't memoize; 'use no memo' above documents the opt-out but this eslint-plugin-react-hooks version still reports the diagnostic regardless (verified empirically), so the disable is the only way to silence it.
    const subscription = form.watch((values, { name }) => {
      if (name) {
        onFieldChange({
          field: name,
          value: values[name],
          values: values as Record<string, unknown>,
          setValue: (fieldName: string, fieldValue: unknown) =>
            form.setValue(fieldName, fieldValue, { shouldDirty: true }),
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [form, onFieldChange])

  // Debug: Log initial props (mount-only by design; deps omitted because
  // debugLogger is recreated every render and re-logging on prop change is unwanted)
  useEffect(() => {
    debugLogger.logPropsReceived({ id, data, fields, sections })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Validate form config in development mode (runs once on mount)
  useEffect(() => {
    if (
      process.env.NODE_ENV === 'development' &&
      sections &&
      sections.length > 0
    ) {
      const validationResult = validateFormSections(sections)
      logValidationResult(validationResult, 'AdminForm')

      // Throw error only for critical config issues (field type doesn't exist)
      if (validationResult.errors.some(err => err.includes('invalid type'))) {
        logger.error(
          '🚨 [AdminForm] Critical config error detected. Fix the issues above before proceeding.'
        )
      }
    }
  }, [sections])

  // Reset form when form is re-created (mount or Fast Refresh), or when a
  // still-pristine form's `data` arrives asynchronously after mount (e.g. an
  // AdminForm rendered before its data-fetch resolves, `data` going from
  // undefined to a value on the SAME form instance — no unmount involved, so
  // the mount branch above never fires). Guarded by `isDirty`: once the user
  // has typed anything, a late `data` must never clobber their input.
  const hadDataRef = useRef(Boolean(data))
  useEffect(() => {
    const isInitialMount = formRef.current === null
    const isFormRecreated = formRef.current !== null && formRef.current !== form
    const dataJustArrived =
      !isInitialMount && !isFormRecreated && !hadDataRef.current && !isDirty

    if (data && (isInitialMount || isFormRecreated || dataJustArrived)) {
      form.reset(data)

      // Debug: Log form state after reset
      debugLogger.logFormState(form, 'After reset')
    }

    if (data) hadDataRef.current = true

    // Update ref for next render
    formRef.current = form
  }, [data, form, debugLogger, isDirty])

  // Helper: get all field names from a section
  const getSectionFieldNames = (section: FormSection): string[] => {
    const firstField = section.fields[0]
    const isNestedArray = Array.isArray(firstField)
    if (isNestedArray) {
      return (section.fields as FormField[][]).flat().map(f => f.name)
    }
    return (section.fields as FormField[]).map(f => f.name)
  }

  // Dotted paths of the leaves of RHF's error object: an error on
  // `pessoa.cpf` lives in { pessoa: { cpf: {...} } }, and `Object.keys` would
  // return only 'pessoa' — which never matches the section's field name.
  const collectErrorPaths = (
    errors: FieldErrors<FieldValues>,
    prefix = ''
  ): string[] => {
    const paths: string[] = []
    for (const [key, value] of Object.entries(errors || {})) {
      const path = prefix ? `${prefix}.${key}` : key
      if (value && typeof value === 'object' && !('message' in value)) {
        paths.push(
          ...collectErrorPaths(value as FieldErrors<FieldValues>, path)
        )
      } else {
        paths.push(path)
      }
    }
    return paths
  }

  // onInvalid: navigate to the tab containing the first validation error
  const handleInvalid = (errors: FieldErrors<FieldValues>) => {
    if (!sections || !useTabs) return
    const errorFieldNames = collectErrorPaths(errors)
    if (errorFieldNames.length === 0) return

    // matches `pessoa.cpf` against an error on `pessoa.cpf` and also against an
    // error on the parent object (`pessoa`), which is what zod reports when the
    // tab never mounted and the whole object came back undefined
    const matches = (fieldName: string) =>
      errorFieldNames.some(
        errorPath =>
          errorPath === fieldName ||
          errorPath.startsWith(`${fieldName}.`) ||
          fieldName.startsWith(`${errorPath}.`)
      )

    for (let i = 0; i < sections.length; i++) {
      if (getSectionFieldNames(sections[i]).some(matches)) {
        setCurrentSectionIndex(i)
        break
      }
    }
  }

  // Handle form submission
  const handleSubmit = async (rawValues: FieldValues) => {
    setError(null)

    // A field/section hidden by `visibleWhen` never reaches the consumer —
    // its stale value (typed before the field was hidden, or a leftover
    // default) is omitted from both the JSON and FormData submit paths.
    // Evaluate against the whole form state (record seeded via `data` + edits),
    // like ConditionalField's useWatch does at render. `rawValues` alone is the
    // zod OUTPUT — a section schema strips keys of other sections, so a
    // `visibleWhen` reading one of them (portal onSaveSection) saw `undefined`
    // and the visible, edited field was dropped from the submit.
    const hiddenFieldNames = collectHiddenFieldNames(
      { fields, sections },
      { ...form.getValues(), ...(rawValues as Record<string, unknown>) }
    )
    const values = omitHiddenFields(
      rawValues as Record<string, unknown>,
      hiddenFieldNames
    ) as FieldValues

    const handleFormSubmission = async () => {
      try {
        let result: FormActionResult<T> | void

        if (onSubmitValues) {
          // JSON mode: pass typed values directly (preserves booleans, numbers, etc.)
          const submitData: Record<string, unknown> = { ...values }
          if (id) submitData.id = id
          result = await onSubmitValues(submitData)
        } else if (action) {
          // FormData mode: legacy Server Action path
          const formData = new FormData()

          if (id) {
            formData.append('id', id)
          }

          const nestedKeys = new Set<string>()
          Object.entries(values).forEach(([key, value]) => {
            if (
              value &&
              typeof value === 'object' &&
              !Array.isArray(value) &&
              !(value instanceof Date)
            ) {
              nestedKeys.add(key)
            }
          })

          Object.entries(values).forEach(([key, value]) => {
            if (value === null || value === undefined) return

            if (key.includes('.')) {
              const [parentKey] = key.split('.')
              if (nestedKeys.has(parentKey)) return
            }

            if (typeof value === 'boolean') {
              formData.append(key, value ? 'true' : 'false')
            } else if (value instanceof File) {
              formData.append(key, value)
            } else if (
              Array.isArray(value) &&
              value.length > 0 &&
              value[0] instanceof File
            ) {
              value.forEach((file: File) => {
                formData.append(key, file)
              })
            } else if (
              typeof value === 'object' &&
              !Array.isArray(value) &&
              !(value instanceof Date)
            ) {
              // Recursively flatten nested objects (supports 3+ levels,
              // e.g., pessoa.usuario.email) using dot notation keys
              const appendNestedEntries = (
                prefix: string,
                nestedObj: Record<string, unknown>
              ): void => {
                Object.entries(nestedObj).forEach(
                  ([nestedKey, nestedValue]) => {
                    if (
                      nestedValue === null ||
                      nestedValue === undefined ||
                      nestedValue === ''
                    ) {
                      return
                    }

                    if (nestedValue instanceof File) {
                      formData.append(`${prefix}.${nestedKey}`, nestedValue)
                    } else if (
                      typeof nestedValue === 'object' &&
                      !Array.isArray(nestedValue) &&
                      !(nestedValue instanceof Date)
                    ) {
                      appendNestedEntries(
                        `${prefix}.${nestedKey}`,
                        nestedValue as Record<string, unknown>
                      )
                    } else {
                      formData.append(
                        `${prefix}.${nestedKey}`,
                        String(nestedValue)
                      )
                    }
                  }
                )
              }

              appendNestedEntries(key, value as Record<string, unknown>)
            } else {
              formData.append(key, String(value))
            }
          })

          debugLogger.logSubmit(values, formData)
          result = await action(formData)
        } else {
          throw new Error('AdminForm requires either action or onSubmitValues')
        }

        // Debug: Log action result
        debugLogger.logActionResult(result)

        // If operation was successful, execute success callback if provided
        if (
          result &&
          typeof result === 'object' &&
          'success' in result &&
          result.success
        ) {
          // Success toast is shown by useCrudMutations hook (Sonner, discrete)
          // No need to show another toast here to avoid duplication

          // Allow customizing behavior after success
          if (onSuccess) {
            await onSuccess(result)
          } else if (cancelAction) {
            cancelAction()
          } else {
            // Only navigate back if no custom callback
            window.history.back()
          }
        } else if (
          result &&
          typeof result === 'object' &&
          'success' in result &&
          !result.success
        ) {
          // Show error toast with message from server
          // message (string or NestJS-style array) or field errors, before the generic text
          const errorMessage = getErrorMessage(result) ?? t('form.submitError')
          toast.error(errorMessage)
          setError(errorMessage)
        }
      } catch (err) {
        // Propagate Next.js redirects (from Server Actions)
        if (isRedirectError(err)) throw err

        logger.error('AdminForm handleSubmit error', {
          error: err instanceof Error ? err : String(err),
        })
        const errorMessage = getErrorMessage(err) ?? t('form.unknownError')
        // useCrudMutations already toasted it — keep only the inline error
        if (!wasToasted(err)) toast.error(errorMessage)
        setError(errorMessage)
      }
    }

    startTransition(async () => {
      await handleFormSubmission()
    })
  }

  // Render context passed to renderFieldGroup/renderField (pure functions
  // in ./admin-form/) — carries what the closures used to capture directly.
  const renderCtx: AdminFormRenderContext<T> = { form, id, data, grid, t }

  // I18nText label/placeholder/description slots (sections + fields) resolved
  // once here, right before render — renderFieldGroup and the JSX below keep
  // receiving plain strings. `sections`/`fields` above (hooks, validation,
  // debug logging) intentionally use the raw props — structure only, no text.
  const renderSections = useMemo(
    () => resolveFormSections(sections, text),
    [sections, text]
  )
  const renderFields = useMemo(
    () => resolveFormFieldsList(fields, text),
    [fields, text]
  )

  // Tabbed layout (multi-section with tabs)
  if (renderSections && renderSections.length > 1 && useTabs) {
    const currentSection = renderSections[currentSectionIndex]

    return (
      <FormProvider {...form}>
        <form
          onSubmit={e => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit(handleSubmit, handleInvalid)(e)
          }}
          className={cn(
            'w-full bg-card flex flex-col',
            !flush && 'rounded-2xl shadow-lg border border-border',
            flush && 'h-full min-h-0 flex-1'
          )}
          noValidate
        >
          {/* Modern tabs - scrollable with chevrons when many tabs */}
          <div
            className={cn(
              'relative flex-shrink-0 border-b border-border bg-gradient-to-r from-muted/40 to-muted/30',
              !flush && 'rounded-t-2xl'
            )}
          >
            {canScrollLeft && (
              <button
                type='button'
                onClick={() => scroll('left')}
                onMouseEnter={() => startHoverScroll('left')}
                onMouseLeave={stopHoverScroll}
                className='absolute left-0 top-0 bottom-0 z-10 flex items-center pl-1 pr-3 bg-gradient-to-r from-muted/40 via-muted/40 to-transparent'
                aria-label={t('shell.scrollTabsLeft')}
              >
                <ChevronLeft className='h-4 w-4 text-muted-foreground' />
              </button>
            )}

            <nav
              ref={navRef}
              className={cn(
                // md+: wrap onto extra rows (never cuts the last tab); below md: scroll + chevrons
                'flex flex-nowrap overflow-x-auto scrollbar-hide gap-3 p-3 md:flex-wrap',
                canScrollLeft && 'pl-8',
                canScrollRight && 'pr-8'
              )}
              aria-label={t('form.tabsAriaLabel')}
              role='tablist'
            >
              {renderSections.map((section, sectionIdx) => {
                const isActive = currentSectionIndex === sectionIdx

                return (
                  <button
                    key={section.label || `section-${sectionIdx}`}
                    type='button'
                    role='tab'
                    aria-selected={isActive}
                    aria-controls={`tabpanel-${sectionIdx}`}
                    aria-label={
                      section.label || t('form.tab', { number: sectionIdx + 1 })
                    }
                    id={`tab-${sectionIdx}`}
                    onClick={() => setCurrentSectionIndex(sectionIdx)}
                    className={cn(
                      'flex shrink-0 items-center gap-2 px-7 py-3 rounded-xl font-medium text-sm transition-all duration-200',
                      'hover:bg-card/80 hover:shadow-md hover:scale-105',
                      isActive
                        ? 'bg-card shadow-lg text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-900 scale-105'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <span
                      className={cn(
                        'transition-colors',
                        isActive
                          ? 'text-blue-600 dark:text-blue-300'
                          : 'text-muted-foreground'
                      )}
                    >
                      {section.icon || <FileText className='w-4 h-4' />}
                    </span>
                    <span className='whitespace-nowrap'>{section.label}</span>
                  </button>
                )
              })}
            </nav>

            {canScrollRight && (
              <button
                type='button'
                onClick={() => scroll('right')}
                onMouseEnter={() => startHoverScroll('right')}
                onMouseLeave={stopHoverScroll}
                className='absolute right-0 top-0 bottom-0 z-10 flex items-center pr-1 pl-3 bg-gradient-to-l from-muted/30 via-muted/30 to-transparent'
                aria-label={t('shell.scrollTabsRight')}
              >
                <ChevronRight className='h-4 w-4 text-muted-foreground' />
              </button>
            )}
          </div>

          {/* Active section content - flex-1 with overflow for scroll */}
          <div
            className={cn(
              'flex-1 overflow-y-auto flex flex-col',
              flush ? 'px-6 py-4' : 'p-8',
              !hasCrudFields(currentSection.fields) && 'gap-6',
              flush && contentClassName
            )}
            role='tabpanel'
            id={`tabpanel-${currentSectionIndex}`}
            aria-labelledby={`tab-${currentSectionIndex}`}
          >
            {/* Section description if present */}
            {currentSection.description && (
              <div className='flex-shrink-0 mb-2'>
                <p className='text-sm text-muted-foreground leading-relaxed'>
                  {currentSection.description}
                </p>
              </div>
            )}

            {/* Section renderFields - flex-1 when has CRUD to expand */}
            <div
              className={cn(
                hasCrudFields(currentSection.fields)
                  ? 'flex-1 flex flex-col min-h-0'
                  : ''
              )}
            >
              {renderFieldGroup(
                renderCtx,
                currentSection.fields,
                currentSection
              )}
            </div>

            {error && (
              <ValidationErrors error={error} className='mt-4 flex-shrink-0' />
            )}
          </div>

          {/* Footer with navigation and actions - flex-shrink-0 to prevent compression */}
          <div
            className={cn(
              'flex-shrink-0 flex items-center border-t px-6 py-4 bg-muted/50',
              isMobile ? 'justify-end' : 'justify-between',
              footerClassName
            )}
          >
            {/* Navigation buttons on left - hidden on mobile */}
            {!isMobile && (
              <div className='flex gap-2'>
                <Button
                  type='button'
                  onClick={() =>
                    setCurrentSectionIndex(Math.max(0, currentSectionIndex - 1))
                  }
                  disabled={currentSectionIndex === 0}
                  variant='outline'
                  aria-label={t('common.previous')}
                  className={cn(
                    'h-10 px-4 gap-2',
                    currentSectionIndex === 0
                      ? 'cursor-not-allowed opacity-50'
                      : 'hover:bg-muted/50'
                  )}
                >
                  <ChevronLeft className='h-4 w-4' />
                  {t('common.previous')}
                </Button>

                <Button
                  type='button'
                  onClick={() =>
                    setCurrentSectionIndex(
                      Math.min(
                        renderSections.length - 1,
                        currentSectionIndex + 1
                      )
                    )
                  }
                  disabled={currentSectionIndex === renderSections.length - 1}
                  variant='outline'
                  aria-label={t('common.next')}
                  className={cn(
                    'h-10 px-4 gap-2',
                    currentSectionIndex === renderSections.length - 1
                      ? 'cursor-not-allowed opacity-50'
                      : 'hover:bg-muted/50'
                  )}
                >
                  {t('common.next')}
                  <ChevronRight className='h-4 w-4' />
                </Button>
              </div>
            )}

            {/* Progress indicator - hidden on mobile */}
            {!isMobile && (
              <div
                className='flex gap-1'
                role='status'
                aria-label={t('form.stepOf', {
                  step: currentSectionIndex + 1,
                  total: renderSections.length,
                })}
              >
                {renderSections.map((section, sectionIdx) => (
                  <button
                    key={section.label || `progress-${sectionIdx}`}
                    type='button'
                    onClick={() => setCurrentSectionIndex(sectionIdx)}
                    aria-label={t('form.tab', { number: sectionIdx + 1 })}
                    className={cn(
                      'w-2 h-2 rounded-full transition-all',
                      currentSectionIndex === sectionIdx
                        ? 'bg-blue-600 w-8'
                        : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    )}
                  />
                ))}
              </div>
            )}

            {/* Action buttons on right */}
            {/* eslint-disable-next-line telamonjs-accessibility/button-accessibility -- composite wrapper; its own Submit/Cancel buttons already carry data-testid/aria-label (see AdminFormButtons.tsx) */}
            <AdminFormButtons
              isPending={isPending}
              submitLabel={text(submitText)}
              onCancel={cancelAction}
            />
          </div>
        </form>
      </FormProvider>
    )
  }

  // Default layout (no renderSections or no useTabs)
  // When flush=true, use flex layout with sticky footer
  return (
    <div
      className={cn('w-full', flush && 'h-full min-h-0 flex-1 flex flex-col')}
    >
      <FormProvider {...form}>
        <form
          onSubmit={e => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit(handleSubmit, handleInvalid)(e)
          }}
          className={cn(flush ? 'flex-1 flex flex-col min-h-0' : 'space-y-6')}
          noValidate
        >
          {/* Scrollable content area */}
          <div className={cn(flush ? 'flex-1 overflow-y-auto' : 'contents')}>
            {/* Inner content: the real container of the field groups/sections,
                so its space-y-6 separates them in both modes (a `contents`
                wrapper would keep the form's space-y-6 from reaching them) */}
            <div
              className={cn(
                'space-y-6',
                flush && 'px-6 pt-4 pb-4',
                flush && contentClassName
              )}
            >
              {renderFields && renderFieldGroup(renderCtx, renderFields)}

              {renderSections && renderSections.length > 0 && (
                <>
                  {renderSections.map((section, idx) => {
                    const sectionElement = (
                      <div key={idx} className='space-y-3'>
                        {section.description && (
                          <p className='mb-2 text-sm text-muted-foreground'>
                            {section.description}
                          </p>
                        )}
                        {renderFieldGroup(renderCtx, section.fields, section)}
                      </div>
                    )
                    return section.visibleWhen ? (
                      <ConditionalField
                        key={idx}
                        form={form}
                        visibleWhen={section.visibleWhen}
                      >
                        {() => sectionElement}
                      </ConditionalField>
                    ) : (
                      sectionElement
                    )
                  })}
                </>
              )}

              {error && <ValidationErrors error={error} className='mt-4' />}
            </div>
          </div>

          {/* Footer - sticky when flush */}
          {!hideButtons && (
            <div
              className={cn(
                'flex justify-end space-x-3 border-t px-6 py-4 flex-shrink-0',
                flush ? 'bg-muted/50' : 'bg-muted/50 -mx-6 -mb-6',
                footerClassName
              )}
            >
              {/* eslint-disable-next-line telamonjs-accessibility/button-accessibility -- composite wrapper; its own Submit/Cancel buttons already carry data-testid/aria-label (see AdminFormButtons.tsx) */}
              <AdminFormButtons
                isPending={isPending}
                submitLabel={text(submitText)}
                onCancel={cancelAction}
              />
            </div>
          )}
        </form>
      </FormProvider>
    </div>
  )
}

// ============================================================================
// USE ADMIN FORM HOOK
// ============================================================================

// Implementation lives in ./admin-form/use-admin-form.ts; re-exported here to
// keep the public surface (and the '../components/forms/AdminForm' import
// path used by src/exports/forms.ts) unchanged.
// eslint-disable-next-line react-refresh/only-export-components -- deliberate re-export to preserve the public import path; see comment above.
export { useAdminForm } from './admin-form/use-admin-form'
