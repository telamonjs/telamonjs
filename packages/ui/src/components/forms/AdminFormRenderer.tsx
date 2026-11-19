'use client'

import { memo } from 'react'
import {
  Control,
  Controller,
  FieldValues,
  UseFormSetValue,
} from 'react-hook-form'
import { getFieldRenderer } from '../../field-system/field-registry'
import { FormField } from '../../types/forms/admin-form'
import { createFormDebugLogger } from '../../utils/debug/debug-logger'
import { formatFieldValue } from '../../utils/debug/debug-formatters'
import { useTelamonjsT } from '../../i18n/use-t'
import { useDateFnsLocale } from '../../i18n/use-date-fns-locale'

/**
 * AdminFormRenderer Props
 *
 * @category Forms
 */
export interface AdminFormRendererProps {
  /** Field configuration to render */
  field: FormField
  /** React Hook Form control object */
  control: Control<FieldValues>
  /** React Hook Form setValue function */
  setValue: UseFormSetValue<FieldValues>
  /** Form instance (for debug logging) - accept any UseFormReturn */
  form: {
    formState: {
      errors: Record<string, unknown>
    }
  }
  /** Entity ID for edit mode (optional) */
  id?: string
  /** Debug mode (optional) */
  debug?: boolean
}

const debugLogger = createFormDebugLogger('AdminFormRenderer')

/**
 * AdminFormRenderer - Renders individual form fields using field registry
 *
 * @category Forms
 * @status stable
 *
 * @description
 * Memoized component that renders form fields using React Hook Form Controller
 * and the field registry system. Handles field state, validation, and debug logging.
 *
 * **Features:**
 * - React Hook Form integration via Controller
 * - Field registry system for 34 field types
 * - Debug logging for field rendering and changes
 * - Error state handling
 * - Read-only mode support
 *
 * @example
 * ```tsx
 * <AdminFormRenderer
 *   field={{ name: 'email', label: 'Email', type: 'email', required: true }}
 *   control={form.control}
 *   setValue={form.setValue}
 *   form={form}
 * />
 * ```
 */
export const AdminFormRenderer = memo(function AdminFormRenderer({
  field: formField,
  control,
  form,
  id,
  debug = false,
}: AdminFormRendererProps) {
  const t = useTelamonjsT()
  const dateFnsLocale = useDateFnsLocale()
  return (
    <Controller
      name={formField.name}
      control={control}
      render={({ field, fieldState }) => {
        const renderer = getFieldRenderer(formField.type)

        // Debug: Log field rendering (verbose mode only)
        if (debug) {
          debugLogger.logFieldRender(
            formField.name,
            field.value,
            formField.type,
            formField
          )
        }

        // Render using field registry renderer
        return renderer.render({
          field: {
            ...formField,
            // Connect Controller props to field (id MUST match Label htmlFor)
            id: formField.name,
            name: formField.name,
            value: field.value,
            onChange: (newValue: unknown) => {
              field.onChange(newValue)

              // Debug: Log form state after field change
              if (debug) {
                setTimeout(() => {
                  debugLogger.logFormState(
                    form as never,
                    `After ${formField.name} changed to: ${formatFieldValue(newValue)}`
                  )
                }, 0)
              }
            },
            onBlur: field.onBlur,
            disabled: formField.readOnly,
            ref: field.ref,
            // Add error information
            error: fieldState.error?.message,
            hasError: !!fieldState.error,
          },
          value: field.value,
          id,
          t,
          dateFnsLocale,
        })
      }}
    />
  )
})
