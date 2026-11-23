'use client'

import React, { useState, useCallback, memo } from 'react'
import { useForm } from '../../stores/form-store'
import { Button } from '../../ui/button'
import { Label } from '../../ui/label'
import { cn } from '../../utils'
import { colSpanClass, gridColsClass } from './grid-classes'
import {
  Save,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react'
import { getFieldRenderer } from '../../field-system/field-registry'
import type { FormActionResult, FormField, FormSection } from './AdminForm'
import { toast } from 'sonner'
import { createFormDebugLogger } from '../../utils/debug/debug-logger'
import { logger } from '../../utils/logger'
import { useTelamonjsT, useText } from '../../i18n/use-t'
import { useDateFnsLocale } from '../../i18n/use-date-fns-locale'

/**
 * ZustandFormProps - Configuration for ZustandForm component
 *
 * @category Forms
 *
 * @description
 * Props for ZustandForm component that uses Zustand state management for advanced
 * form scenarios like multi-step wizards, real-time preview, or complex validation.
 */
interface ZustandFormProps {
  /** Unique form ID for Zustand store isolation. Each form instance needs a unique ID. */
  formId: string

  /** Form sections with fields. Supports nested row structure for grid layouts. */
  sections: FormSection[]

  /** Initial form data. Used to pre-populate fields in edit mode or provide defaults. */
  data?: Record<string, unknown>

  /** Server Action that receives FormData. Mutually exclusive with onSubmit. */
  action?: (formData: FormData) => Promise<FormActionResult | void> | void

  /** Client-side submit handler. Receives typed form data object. Mutually exclusive with action. */
  onSubmit?: (data: Record<string, unknown>) => Promise<void> | void

  /** Text for submit button. Default: "Salvar" */
  submitText?: string

  /** Enable tab navigation between sections. Creates a multi-step wizard UI. Default: false */
  useTabs?: boolean

  /** Additional CSS classes for the form container */
  className?: string

  /** Show debug panel with form state (data, meta, validation). Useful for development. Default: false */
  showDebug?: boolean

  /** Entity ID for edit mode. Enables CRUD fields and editOnly sections/fields. */
  id?: string

  /** Callback executed after successful Server Action. Receives action result. */
  onSuccess?: (result: FormActionResult) => void | Promise<void>

  /** Cancel button handler. Default: window.history.back() */
  cancelAction?: () => void

  /** Hide submit/cancel buttons. Useful for custom button layouts. Default: false */
  hideButtons?: boolean
}

const FieldRenderer: React.FC<{
  field: FormField
  form: ReturnType<typeof useForm>
  recordId?: string
}> = memo(({ field, form, recordId }) => {
  const t = useTelamonjsT()
  const text = useText()
  const dateFnsLocale = useDateFnsLocale()
  const value = form.getFieldValue(field.name)
  const error = form.getFieldError(field.name)
  const touched = form.meta.touched[field.name]
  const showError = touched && error

  // Get the field renderer from registry
  const renderer = getFieldRenderer(field.type)

  // Helper to get default value
  const getDefaultValue = useCallback(() => {
    if (field.type === 'boolean') return false
    if (field.default !== undefined) return field.default
    return ''
  }, [field.type, field.default])

  const handleChange = useCallback(
    (newValue: unknown) => {
      form.updateField(field.name, newValue)
      form.setTouched(field.name, true)
      if (form.getFieldError(field.name)) {
        form.setError(field.name, '')
      }
    },
    [form, field.name]
  )

  const handleBlur = useCallback(() => {
    form.setTouched(field.name, true)
  }, [form, field.name])

  return (
    <div className='space-y-2'>
      {field.type !== 'space' && field.type !== 'crud' && (
        <Label
          htmlFor={field.name}
          className={cn(
            field.required &&
              "after:content-['*'] after:text-red-500 after:ml-1"
          )}
        >
          {text(field.label)}
        </Label>
      )}

      <div className='drop-shadow-md'>
        {renderer.render({
          field: {
            ...field,
            id: field.name,
            name: field.name,
            value: value ?? getDefaultValue(),
            onChange: handleChange,
            onBlur: handleBlur,
            error: error,
            hasError: !!error,
          },
          value: value ?? getDefaultValue(),
          id: recordId, // Pass record ID for CRUD fields
          t,
          dateFnsLocale,
        })}
      </div>

      {showError && <p className='text-sm text-red-500'>{error}</p>}
    </div>
  )
})

FieldRenderer.displayName = 'FieldRenderer'

const SectionRenderer: React.FC<{
  section: FormSection
  form: ReturnType<typeof useForm>
  recordId?: string
}> = memo(({ section, form, recordId }) => {
  // Helper to check if section has CRUD fields
  const hasCrudFields = (fields: FormField[] | FormField[][]): boolean => {
    const checkFields = (fieldArray: FormField[]): boolean => {
      return fieldArray.some(field => field.type === 'crud')
    }

    if (fields.length > 0 && Array.isArray(fields[0])) {
      return (fields as FormField[][]).some(row => checkFields(row))
    }
    return checkFields(fields as FormField[])
  }

  // Hide section if editOnly and no ID, or has CRUD fields without ID
  if (
    (section.editOnly && !recordId) ||
    (hasCrudFields(section.fields) && !recordId)
  ) {
    return null
  }

  // Filter fields based on editOnly
  const filterFields = (fields: FormField[]): FormField[] => {
    return fields.filter(field => {
      return !field.editOnly || !!recordId
    })
  }

  // Check if row structure (nested arrays)
  const isRowStructure =
    section.fields.length > 0 && Array.isArray(section.fields[0])

  if (isRowStructure) {
    const rows = section.fields as FormField[][]
    return (
      <div className='space-y-3'>
        {rows.map((row, rowIndex) => {
          const filteredRow = filterFields(row)
          if (filteredRow.length === 0) return null

          const useFlexbox = filteredRow.length > 6
          const gridCols = useFlexbox
            ? ''
            : gridColsClass(Math.min(filteredRow.length, 6))
          const containerClass = useFlexbox
            ? 'flex flex-wrap gap-3'
            : cn('grid gap-3', gridCols)

          return (
            <div key={rowIndex} className={containerClass}>
              {filteredRow.map(field => {
                const spanClass = field.span
                  ? colSpanClass(field.span)
                  : field.type === 'space' || field.type === 'crud'
                    ? useFlexbox
                      ? 'w-full'
                      : colSpanClass(row.length)
                    : useFlexbox
                      ? 'flex-1 min-w-0'
                      : ''

                return (
                  <div key={field.name} className={cn('space-y-1', spanClass)}>
                    <FieldRenderer
                      field={field}
                      form={form}
                      recordId={recordId}
                    />
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }

  // Flat structure
  const fields = filterFields(section.fields as FormField[])
  if (fields.length === 0) return null

  const gridValue = section.grid || '2'
  const gridCols = gridColsClass(gridValue)

  return (
    <div className={cn('grid gap-4', gridCols)}>
      {fields.map(field => {
        const spanClass = field.span
          ? colSpanClass(field.span)
          : field.type === 'space' || field.type === 'crud'
            ? colSpanClass(gridValue)
            : ''

        return (
          <div key={field.name} className={cn('space-y-2', spanClass)}>
            <FieldRenderer field={field} form={form} recordId={recordId} />
          </div>
        )
      })}
    </div>
  )
})

SectionRenderer.displayName = 'SectionRenderer'

/**
 * ZustandForm - Advanced form component with Zustand state management
 *
 * @category Forms
 * @status stable
 *
 * @description
 * Production-ready form component powered by Zustand state management for advanced
 * scenarios requiring multi-step wizards, real-time preview, complex validation,
 * or granular state control. Supports tab navigation, Server Actions, and automatic
 * FormData conversion.
 *
 * **Key Features:**
 * - **Zustand state management:** Isolated store per formId, reactive updates
 * - **Multi-step wizards:** Tab navigation with Previous/Next, progress indicators
 * - **Server Actions support:** Automatic FormData conversion with nested object flattening
 * - **Client-side handlers:** Direct TypeScript object submission via onSubmit
 * - **Real-time validation:** Field-level validation with error display
 * - **Toast notifications:** Built-in error/success feedback
 * - **Edit mode support:** CRUD fields + editOnly sections/fields controlled by id prop
 * - **Debug panel:** Dev-friendly state inspector (showDebug prop)
 * - **Responsive grid:** Nested row structure with auto-layout (flexbox for 6+ fields)
 *
 * **When to use:**
 * - **Multi-step wizards:** Forms with 3+ sections that need navigation (use `useTabs`)
 * - **Real-time preview:** Forms that show live preview of data as user types
 * - **Complex validation:** Cross-field validation, async validation, custom rules
 * - **Granular state control:** Need access to form meta (touched, errors, dirty)
 * - **Advanced UX:** Progress indicators, conditional sections, dynamic fields
 *
 * **When NOT to use:**
 * - **Simple CRUD add/edit:** Use `CreateForm` / `EditForm` instead (simpler API)
 * - **Single-section forms:** Use `Form` (AdminForm) instead (lighter weight)
 * - **No state management needed:** Use `Form` instead
 *
 * **Decision Tree:**
 * ```
 * Need multi-step wizard? → YES → ZustandForm with useTabs
 * Need real-time preview? → YES → ZustandForm with useForm hook
 * Need granular state control? → YES → ZustandForm
 * Simple CRUD add/edit? → NO → Use CreateForm/EditForm
 * ```
 *
 * **Zustand Benefits:**
 * - Isolated state per formId (multiple forms on same page)
 * - Reactive updates without prop drilling
 * - Access form state from any component (useForm hook)
 * - Persistence across component unmount/remount
 * - DevTools integration for debugging
 *
 * **Best practices:**
 * - Use unique formId for each form instance
 * - Limit to 5-7 tabs for multi-step wizards
 * - Use showDebug during development, disable in production
 * - Provide cancelAction for custom navigation flows
 * - Use onSuccess for custom post-submit logic (e.g., show modal)
 *
 * @see {@link /apps/docs/content/docs/patterns/form-pattern.mdx | Form Pattern}
 * @see {@link CreateForm} for simple creation forms
 * @see {@link EditForm} for simple edit forms
 * @see {@link Form} for basic forms
 * @see {@link ZustandFormServer} for Server Component wrapper
 */
const ZustandFormComponent: React.FC<ZustandFormProps> = ({
  formId,
  sections,
  data,
  action,
  onSubmit,
  submitText,
  useTabs = false,
  className,
  showDebug = false,
  id,
  onSuccess,
  cancelAction,
  hideButtons = false,
}) => {
  const t = useTelamonjsT()
  const text = useText()
  const resolvedSubmitText = submitText || t('common.save')
  const debugLogger = createFormDebugLogger('ZustandForm')

  // Debug: Log props received
  React.useEffect(() => {
    debugLogger.logPropsReceived({ formId, id, data, sections })
    // Intentional run-once debug log on mount; re-running on prop changes would spam the console
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const form = useForm(formId, data)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      // Validate form - on failure, show toast with errors
      // form-store's ValidationSection expects flat fields only; FormSection also
      // allows row-based (FormField[][]) layouts, so a structural cast is required.
      if (
        !form.validate(
          sections as unknown as Parameters<typeof form.validate>[0]
        )
      ) {
        const errorFields = Object.keys(form.meta.errors).filter(
          key => form.meta.errors[key]
        )

        debugLogger.logValidationError(form.meta.errors, form.data)

        toast.error(t('form.fixFields', { fields: errorFields.join(', ') }))

        return
      }

      setIsSubmitting(true)
      form.setSubmitting(true)

      try {
        if (action) {
          // Convert form data to FormData for Server Actions
          const formData = new FormData()

          // Add ID if in edit mode
          if (id) {
            formData.append('id', id)
          }

          // Add all form values to FormData
          Object.entries(form.data).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              if (typeof value === 'boolean') {
                formData.append(key, value ? 'true' : 'false')
              } else if (
                typeof value === 'object' &&
                !Array.isArray(value) &&
                !(value instanceof Date)
              ) {
                // For nested objects, add flat fields with dot notation
                Object.entries(value).forEach(([nestedKey, nestedValue]) => {
                  if (
                    nestedValue !== null &&
                    nestedValue !== undefined &&
                    nestedValue !== ''
                  ) {
                    formData.append(`${key}.${nestedKey}`, String(nestedValue))
                  }
                })
              } else {
                formData.append(key, String(value))
              }
            }
          })

          // Debug: Log submit
          debugLogger.logSubmit(form.data, formData)

          const result = await action(formData)

          // Debug: Log action result
          debugLogger.logActionResult(result)

          if (onSuccess && result) {
            await onSuccess(result)
          } else if (
            result &&
            typeof result === 'object' &&
            'success' in result &&
            result.success
          ) {
            if (cancelAction) {
              cancelAction()
            } else if (typeof window !== 'undefined' && !id) {
              window.history.back()
            }
          }
        } else if (onSubmit) {
          await onSubmit(form.data)
        }
      } catch (error) {
        logger.error('Form submission error', {
          error: error instanceof Error ? error : String(error),
        })

        // Show error to the user
        toast.error(
          error instanceof Error
            ? error.message
            : t('form.saveDataError')
        )
      } finally {
        setIsSubmitting(false)
        form.setSubmitting(false)
      }
    },
    [form, sections, debugLogger, action, id, onSuccess, onSubmit, cancelAction, t]
  )

  const handlePrevSection = useCallback(() => {
    setCurrentSectionIndex(prev => Math.max(0, prev - 1))
  }, [])

  const handleNextSection = useCallback(() => {
    setCurrentSectionIndex(prev => Math.min(sections.length - 1, prev + 1))
  }, [sections.length])

  const handleSectionClick = useCallback((index: number) => {
    setCurrentSectionIndex(index)
  }, [])

  const handleCancel = useCallback(() => {
    if (cancelAction) {
      cancelAction()
    } else {
      window.history.back()
    }
  }, [cancelAction])

  // Render with tabs
  if (sections && sections.length > 0 && useTabs) {
    const currentSection = sections[currentSectionIndex]

    return (
      <form
        onSubmit={handleSubmit}
        className={cn(
          'w-full bg-card rounded-2xl shadow-lg border border-border',
          className
        )}
      >
        {/* Modern tabs */}
        <div className='border-b border-border bg-gradient-to-r from-muted/40 to-muted/30 rounded-t-2xl'>
          <nav className='flex space-x-3 p-3' aria-label='Tabs'>
            {sections.map((section, index) => {
              const isActive = currentSectionIndex === index

              return (
                <button
                  key={`tab-${index}`}
                  type='button'
                  onClick={() => handleSectionClick(index)}
                  data-testid={`zustand-form-tab-${index}`}
                  className={cn(
                    'flex items-center gap-2 px-7 py-3 rounded-xl font-medium text-sm transition-all duration-200',
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
                  <span>{text(section.label)}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Active section content */}
        <div className='p-8 space-y-6'>
          {currentSection.description && (
            <div className='mb-6'>
              <p className='text-sm text-muted-foreground leading-relaxed'>
                {text(currentSection.description)}
              </p>
            </div>
          )}

          <SectionRenderer section={currentSection} form={form} recordId={id} />

          {/* Navigation and action buttons */}
          <div className='flex items-center justify-between mt-10 pt-8 border-t border-border'>
            {/* Navigation buttons (left) */}
            <div className='flex gap-2'>
              <Button
                type='button'
                onClick={handlePrevSection}
                disabled={currentSectionIndex === 0}
                variant='outline'
                data-testid='zustand-form-prev-section-button'
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
                onClick={handleNextSection}
                disabled={currentSectionIndex === sections.length - 1}
                variant='outline'
                data-testid='zustand-form-next-section-button'
                className={cn(
                  'h-10 px-4 gap-2',
                  currentSectionIndex === sections.length - 1
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:bg-muted/50'
                )}
              >
                {t('common.next')}
                <ChevronRight className='h-4 w-4' />
              </Button>
            </div>

            {/* Progress indicator */}
            <div className='flex gap-1'>
              {sections.map((_, index) => (
                <button
                  key={`progress-${index}`}
                  type='button'
                  onClick={() => handleSectionClick(index)}
                  aria-label={t('form.tab', { number: index + 1 })}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    currentSectionIndex === index
                      ? 'bg-blue-600 w-8'
                      : 'bg-gray-300 hover:bg-gray-400'
                  )}
                />
              ))}
            </div>

            {/* Action buttons (right) */}
            <div className='flex gap-3'>
              <Button
                type='button'
                variant='outline'
                onClick={handleCancel}
                disabled={isSubmitting}
                data-testid='zustand-form-cancel-button'
                className='h-10 px-6 gap-2'
              >
                <X className='h-4 w-4' />
                {t('common.cancel')}
              </Button>
              <Button
                type='submit'
                disabled={isSubmitting}
                data-testid='zustand-form-submit-button'
                className='h-10 px-6 gap-2'
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    {t('common.saving')}
                  </>
                ) : (
                  <>
                    <Save className='h-4 w-4' />
                    {resolvedSubmitText}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {showDebug && (
          <div className='p-4 m-4 border rounded bg-muted/50'>
            <h3 className='text-sm font-bold mb-2'>Debug Info</h3>
            <pre className='text-xs bg-card p-2 rounded overflow-auto'>
              {JSON.stringify(
                {
                  formId,
                  data: form.data,
                  meta: form.meta,
                  isValid: form.isValid,
                  isDirty: form.isDirty,
                },
                null,
                2
              )}
            </pre>
          </div>
        )}
      </form>
    )
  }

  // Default render (no sections or no tabs)
  return (
    <div className='w-full'>
      <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
        {sections && sections.length > 0 && (
          <>
            {sections.map((section, idx) => (
              <div key={`section-${idx}`} className='space-y-3'>
                {section.description && (
                  <p className='mb-2 text-sm text-muted-foreground'>
                    {text(section.description)}
                  </p>
                )}
                <SectionRenderer section={section} form={form} recordId={id} />
              </div>
            ))}
          </>
        )}

        {!hideButtons && (
          <div className='flex justify-end space-x-3 mt-6 border-t border-slate-200 pt-4'>
            <Button
              type='button'
              variant='outline'
              onClick={handleCancel}
              disabled={isSubmitting}
              data-testid='zustand-form-cancel-button'
              className='h-10 px-6 gap-2'
            >
              <X className='h-4 w-4' />
              {t('common.cancel')}
            </Button>
            <Button
              type='submit'
              disabled={isSubmitting}
              data-testid='zustand-form-submit-button'
              className='h-10 px-6 gap-2'
            >
              {isSubmitting ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  {t('common.saving')}
                </>
              ) : (
                <>
                  <Save className='h-4 w-4' />
                  {resolvedSubmitText}
                </>
              )}
            </Button>
          </div>
        )}

        {showDebug && (
          <div className='p-4 border rounded bg-muted/50'>
            <h3 className='text-sm font-bold mb-2'>Debug Info</h3>
            <pre className='text-xs bg-card p-2 rounded overflow-auto'>
              {JSON.stringify(
                {
                  formId,
                  data: form.data,
                  meta: form.meta,
                  isValid: form.isValid,
                  isDirty: form.isDirty,
                },
                null,
                2
              )}
            </pre>
          </div>
        )}
      </form>
    </div>
  )
}

export const ZustandForm = memo(ZustandFormComponent)
