'use client'

import { AdminForm } from './AdminForm'
import type { FormField, FormSection, FormActionResult } from './AdminForm'
import { z } from 'zod'
import { useMemo, useEffect } from 'react'
import { hasNestedStructure } from '../../utils/form-data-converter'
import { createFormDebugLogger } from '../../utils/debug/debug-logger'
import { logger } from '../../utils/logger'
import { useTelamonjsT } from '../../i18n/use-t'

export interface EditFormProps<T = Record<string, unknown>> {
  id: string // REQUIRED
  data: Partial<T> // REQUIRED
  fields?: FormField[] | readonly FormField[]
  sections?: FormSection[] | readonly FormSection[]
  action?: (formData: FormData) => Promise<FormActionResult<T> | void>
  onSubmitValues?: (
    values: Record<string, unknown>
  ) => Promise<FormActionResult<T> | void>
  submitText?: string
  cancelAction?: () => void
  validation?: z.ZodType
  onSuccess?: (result: FormActionResult<T>) => void | Promise<void>
  grid?: string
  useTabs?: boolean
  hideButtons?: boolean
  /**
   * Flush mode - removes rounded corners, shadows, and borders.
   * Use when the form is rendered inside a dialog with a custom header.
   */
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
  /**
   * Extra classes merged into the footer (submit/cancel bar) container.
   * See `AdminFormProps.footerClassName`.
   */
  footerClassName?: string
  /**
   * Extra classes merged into the content (fields) container (flush mode).
   * See `AdminFormProps.contentClassName`.
   */
  contentClassName?: string
}

/**
 * EditForm - Form optimized for editing records
 *
 * Semantic wrapper over AdminForm with edit-specific props:
 * - Requires `id` and `data`
 * - Default submit text: "Salvar"
 * - Includes all sections (editOnly included)
 * - Automatically transforms nested data (Prisma) to flat (dot notation)
 *
 * @example
 * ```tsx
 * // Data can be nested (from Prisma)
 * const user = { person: { name: 'John', cpf: '123' }, email: 'john@email.com' }
 *
 * <EditForm
 *   id={params.id}
 *   data={user} // Automatically converted to flat: { 'person.name': 'John', ... }
 *   sections={formSections}
 *   action={updateUsuarioAction}
 *   validation={validationSchema}
 * />
 * ```
 */
export function EditForm<T extends Record<string, unknown>>({
  id,
  data,
  fields,
  sections,
  action,
  onSubmitValues,
  submitText,
  cancelAction,
  validation,
  onSuccess,
  grid,
  useTabs = true,
  hideButtons,
  flush = false,
  onFieldChange,
  onDirtyChange,
  footerClassName,
  contentClassName,
}: EditFormProps<T>) {
  const t = useTelamonjsT()
  const resolvedSubmitText = submitText || t('common.save')
  const debugLogger = createFormDebugLogger('EditForm')

  // Debug: Log props received (mount-only by design; deps omitted because
  // debugLogger is recreated every render and re-logging on prop change is unwanted)
  useEffect(() => {
    debugLogger.logPropsReceived({ id, data, fields, sections, submitText })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Dev mode warnings
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Warn if id or data is missing (TypeScript should catch this, but runtime check helps)
      if (!id || !data) {
        logger.error(
          '🚨 [EditForm] Missing required props. EditForm requires both "id" and "data" props.\n' +
            'Example:\n' +
            '  <EditForm\n' +
            '    id={entity.id}\n' +
            '    data={entity}\n' +
            '    sections={formSections}\n' +
            '    action={updateAction}\n' +
            '  />'
        )
      }
    }
  }, [id, data])

  // Auto-detect and normalize data format
  // If data has nested structure (from Prisma), DON'T flatten completely
  // Instead, keep nested objects and only flatten primitive nested values
  const normalizedData = useMemo(() => {
    if (hasNestedStructure(data)) {
      // Don't flatten - pass nested structure directly
      // RHF will map field names like "pessoa.nome" to nested path automatically
      return data
    }
    return data
  }, [data])

  return (
    <AdminForm<T>
      id={id}
      data={normalizedData}
      fields={fields}
      sections={sections}
      action={action}
      onSubmitValues={onSubmitValues}
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
      footerClassName={footerClassName}
      contentClassName={contentClassName}
    />
  )
}
