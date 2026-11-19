'use client'

import { AdminForm } from './AdminForm'
import type { FormField, FormSection, FormActionResult } from './AdminForm'
import { z } from 'zod'
import { useEffect } from 'react'
import { createFormDebugLogger } from '../../utils/debug/debug-logger'
import { logger } from '../../utils/logger'
import { useTelamonjsT } from '../../i18n/use-t'

export interface CreateFormProps<T = Record<string, unknown>> {
  fields?: FormField[] | readonly FormField[]
  sections?: FormSection[] | readonly FormSection[]
  action?: (formData: FormData) => Promise<FormActionResult<T> | void>
  onSubmitValues?: (
    values: Record<string, unknown>
  ) => Promise<FormActionResult<T> | void>
  defaultValues?: Partial<T>
  submitText?: string
  cancelAction?: () => void
  validation?: z.ZodType
  onSuccess?: (result: FormActionResult<T>) => void | Promise<void>
  grid?: string
  useTabs?: boolean
  hideButtons?: boolean
  /** Flush mode for embedding in dialogs with custom headers */
  flush?: boolean
  /** Callback fired when any form field value changes */
  onFieldChange?: (params: {
    field: string
    value: unknown
    values: Record<string, unknown>
    setValue: (name: string, value: unknown) => void
  }) => void | Promise<void>
  /** Callback fired whenever the form's dirty state changes */
  onDirtyChange?: (isDirty: boolean) => void
}

/**
 * CreateForm - Form optimized for record creation
 *
 * Semantic wrapper over AdminForm with creation-specific props:
 * - Filters sections with `editOnly: true`
 * - Filters fields with `editOnly: true`
 * - Filters fields with `type: 'crud'` (CRUD only shows in edit mode)
 * - Default submit text: "Criar"
 * - Default useTabs: false (simplifies creation)
 * - Does not expose `id` and `data` props (use defaultValues)
 *
 * @example
 * ```tsx
 * <CreateForm
 *   sections={formSections}
 *   action={createUsuarioAction}
 *   validation={validationSchema}
 *   defaultValues={{ active: true }}
 * />
 * ```
 */
export function CreateForm<T extends Record<string, unknown>>({
  fields,
  sections,
  action,
  onSubmitValues,
  defaultValues,
  submitText,
  cancelAction,
  validation,
  onSuccess,
  grid,
  useTabs = false, // Default false to simplify creation
  hideButtons,
  flush = false,
  onFieldChange,
  onDirtyChange,
}: CreateFormProps<T>) {
  const t = useTelamonjsT()
  const resolvedSubmitText = submitText || t('form.create')
  const debugLogger = createFormDebugLogger('CreateForm')

  // Debug: Log props received (mount-only by design; deps omitted because
  // debugLogger is recreated every render and re-logging on prop change is unwanted)
  useEffect(() => {
    debugLogger.logPropsReceived({
      fields,
      sections,
      defaultValues,
      submitText,
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Dev mode warnings
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Warn about filtered sections
      if (sections) {
        const editOnlyCount = sections.filter(s => s.editOnly).length
        if (editOnlyCount > 0) {
          logger.debug(
            `[CreateForm] ${editOnlyCount} section(s) with editOnly: true filtered`,
            { sections: sections.filter(s => s.editOnly).map(s => s.label) }
          )
        }

        // Count CRUD fields filtered
        let crudFieldsCount = 0
        sections.forEach(section => {
          const firstField = section.fields[0]
          const isNestedArray = Array.isArray(firstField)

          const sectionFields = isNestedArray
            ? (section.fields as FormField[][]).flat()
            : (section.fields as FormField[])

          crudFieldsCount += sectionFields.filter(
            (f: FormField) => f.type === 'crud'
          ).length
        })

        if (crudFieldsCount > 0) {
          logger.debug(
            `[CreateForm] ${crudFieldsCount} CRUD field(s) filtered (CRUD only in edit mode)`
          )
        }
      }

      // Warn about filtered fields
      if (fields) {
        const editOnlyCount = fields.filter((f: FormField) => f.editOnly).length
        const crudCount = fields.filter(
          (f: FormField) => f.type === 'crud'
        ).length

        if (editOnlyCount > 0) {
          logger.debug(
            `[CreateForm] ${editOnlyCount} field(s) with editOnly: true filtered`,
            {
              fields: fields
                .filter((f: FormField) => f.editOnly)
                .map((f: FormField) => f.name),
            }
          )
        }

        if (crudCount > 0) {
          logger.debug(
            `[CreateForm] ${crudCount} CRUD field(s) filtered (CRUD only in edit mode)`
          )
        }
      }
    }
  }, [sections, fields])

  // Helper function to filter fields
  const filterField = (field: FormField): boolean => {
    // Filter editOnly fields
    if (field.editOnly) return false
    // Filter CRUD fields (only in edit mode)
    if (field.type === 'crud') return false
    return true
  }

  // Filter out edit-only sections
  const createSections = sections
    ?.filter(section => !section.editOnly)
    .map(section => {
      const firstField = section.fields[0]
      const isNestedArray = Array.isArray(firstField)

      return {
        ...section,
        // Filter out editOnly and CRUD fields within each section
        fields: isNestedArray
          ? // Row structure (nested arrays)
            (section.fields as FormField[][]).map(row =>
              row.filter(filterField)
            )
          : // Flat structure
            (section.fields as FormField[]).filter(filterField),
      }
    })
    // Remove sections that have no fields after filtering
    .filter(section => {
      const firstField = section.fields[0]
      const isNestedArray = Array.isArray(firstField)

      if (isNestedArray) {
        return (section.fields as FormField[][]).some(row => row.length > 0)
      }
      return (section.fields as FormField[]).length > 0
    })

  // Filter out edit-only or CRUD fields
  const createFields = fields?.filter(filterField)

  return (
    <AdminForm<T>
      fields={createFields}
      sections={createSections}
      action={action}
      onSubmitValues={onSubmitValues}
      data={defaultValues}
      submitText={resolvedSubmitText}
      cancelAction={cancelAction}
      validation={validation}
      onSuccess={onSuccess}
      grid={grid}
      useTabs={useTabs}
      hideButtons={hideButtons}
      flush={flush}
      onFieldChange={onFieldChange}
      onDirtyChange={onDirtyChange}
    />
  )
}
