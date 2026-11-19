'use client'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import React from 'react'
import { createFormDebugLogger } from '../utils/debug/debug-logger'
import { useTelamonjsT } from '../i18n/use-t'

const debugLogger = createFormDebugLogger('FormStore')

// Form data type (flexible object with unknown values)
interface FormData {
  [key: string]: unknown
}

// Validation section interface (compatible with FormSection from Form.tsx)
interface ValidationSection {
  label?: string
  fields: Array<{
    name: string
    label: string
    required?: boolean
  }>
}

interface FormMeta {
  isSubmitting: boolean
  isDirty: boolean
  errors: Record<string, string>
  touched: Record<string, boolean>
  isValid: boolean
}

interface FormState {
  // Form data por form ID
  forms: Record<string, FormData>

  // Form meta info
  formMeta: Record<string, FormMeta>

  // Actions
  setFormData: (formId: string, data: FormData) => void
  updateField: (formId: string, field: string, value: unknown) => void
  setSubmitting: (formId: string, isSubmitting: boolean) => void
  setError: (formId: string, field: string, error: string) => void
  clearErrors: (formId: string) => void
  setTouched: (formId: string, field: string, touched: boolean) => void
  resetForm: (formId: string) => void
  validateForm: (
    formId: string,
    sections: ValidationSection[],
    requiredMessage: (label: string) => string
  ) => boolean

  // Computed getters
  getFormData: (formId: string) => FormData
  getFieldValue: (formId: string, field: string) => unknown
  getFieldError: (formId: string, field: string) => string | undefined
  isFormValid: (formId: string) => boolean
  isFormDirty: (formId: string) => boolean
}

export const useFormStore = create<FormState>()(
  subscribeWithSelector((set, get) => ({
    forms: {},
    formMeta: {},

    setFormData: (formId, data) => {
      debugLogger.log(`Setting form data for ${formId}`, {
        keys: Object.keys(data),
        data,
      })
      return set(state => ({
        forms: { ...state.forms, [formId]: data },
        formMeta: {
          ...state.formMeta,
          [formId]: {
            ...state.formMeta[formId],
            isDirty: true,
            isSubmitting: false,
            errors: {},
            touched: {},
            isValid: true,
          },
        },
      }))
    },

    updateField: (formId, field, value) => {
      debugLogger.log(`Field updated: ${formId}.${field}`, {
        value,
        type: typeof value,
      })

      const result = set(state => {
        const newFormData = { ...state.forms[formId], [field]: value }

        // Debug: Log complete form state after update
        debugLogger.log(`Complete form state after ${field} update:`, {
          formId,
          allFields: newFormData,
          totalFields: Object.keys(newFormData).length,
          changedField: field,
          changedValue: value,
        })

        return {
          forms: {
            ...state.forms,
            [formId]: newFormData,
          },
          formMeta: {
            ...state.formMeta,
            [formId]: {
              ...state.formMeta[formId],
              isDirty: true,
              touched: {
                ...state.formMeta[formId]?.touched,
                [field]: true,
              },
            },
          },
        }
      })

      return result
    },

    setSubmitting: (formId, isSubmitting) =>
      set(state => ({
        formMeta: {
          ...state.formMeta,
          [formId]: {
            ...state.formMeta[formId],
            isSubmitting,
          },
        },
      })),

    setError: (formId, field, error) =>
      set(state => ({
        formMeta: {
          ...state.formMeta,
          [formId]: {
            ...state.formMeta[formId],
            errors: {
              ...state.formMeta[formId]?.errors,
              [field]: error,
            },
            isValid: false,
          },
        },
      })),

    clearErrors: formId =>
      set(state => ({
        formMeta: {
          ...state.formMeta,
          [formId]: {
            ...state.formMeta[formId],
            errors: {},
            isValid: true,
          },
        },
      })),

    setTouched: (formId, field, touched) =>
      set(state => ({
        formMeta: {
          ...state.formMeta,
          [formId]: {
            ...state.formMeta[formId],
            touched: {
              ...state.formMeta[formId]?.touched,
              [field]: touched,
            },
          },
        },
      })),

    validateForm: (formId, sections, requiredMessage) => {
      const formData = get().forms[formId] || {}
      const errors: Record<string, string> = {}

      debugLogger.log(`Validating form ${formId}`, {
        dataKeys: Object.keys(formData),
      })

      // Basic validation of required fields
      sections?.forEach((section: ValidationSection) => {
        section.fields?.forEach(field => {
          if (
            field.required &&
            (!formData[field.name] || formData[field.name] === '')
          ) {
            errors[field.name] = requiredMessage(field.label)
          }
        })
      })

      // Atualizar errors no store
      const hasErrors = Object.keys(errors).length > 0

      if (hasErrors) {
        debugLogger.logValidationError(errors, formData)
      } else {
        debugLogger.log(`Validation passed for ${formId}`)
      }

      set(state => ({
        formMeta: {
          ...state.formMeta,
          [formId]: {
            ...state.formMeta[formId],
            errors,
            isValid: !hasErrors,
          },
        },
      }))

      return !hasErrors
    },

    resetForm: formId =>
      set(state => {
        const newForms = { ...state.forms }
        const newFormMeta = { ...state.formMeta }
        delete newForms[formId]
        delete newFormMeta[formId]
        return { forms: newForms, formMeta: newFormMeta }
      }),

    // Getters
    getFormData: formId => get().forms[formId] || {},
    getFieldValue: (formId, field) => get().forms[formId]?.[field],
    getFieldError: (formId, field) => get().formMeta[formId]?.errors?.[field],
    isFormValid: formId => get().formMeta[formId]?.isValid ?? true,
    isFormDirty: formId => get().formMeta[formId]?.isDirty || false,
  }))
)

// Convenient hook for a specific form
export const useForm = (formId: string, initialData?: FormData) => {
  const store = useFormStore()
  const t = useTelamonjsT()
  const initRef = React.useRef(false)

  // Inicializar form apenas uma vez (no mount)
  React.useEffect(() => {
    if (
      !initRef.current &&
      initialData &&
      Object.keys(initialData).length > 0
    ) {
      store.setFormData(formId, initialData)
      initRef.current = true
    }
    // `initialData`/`store` intentionally omitted: init-once per mount semantics.
    // Re-initializing on initialData identity change would wipe in-progress edits;
    // to re-init for a new record, remount the form (e.g. ListPage `key` strategy).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      // Reset initRef to allow reinitialization on remount
      initRef.current = false
    }
  }, [formId])

  const defaultMeta: FormMeta = React.useMemo(
    () => ({
      isSubmitting: false,
      isDirty: false,
      errors: {},
      touched: {},
      isValid: true,
    }),
    []
  )

  // Subscribe to Zustand state - use entire state and select in component
  // This avoids the getSnapshot caching issue by using a stable reference
  //
  // ⚠️ CRITICAL PATTERN - DO NOT CHANGE WITHOUT READING:
  // apps/docs/content/docs/patterns/zustand-selector.mdx
  //
  // ❌ NEVER use dynamic selectors in custom hooks:
  //    const data = useFormStore((state) => state.forms[formId])
  //
  // ✅ ALWAYS subscribe to entire store and select locally:
  //    const formState = useFormStore()
  //    const data = formState.forms[formId]
  //
  // This prevents "The result of getSnapshot should be cached" warning
  const formState = useFormStore()

  const data = formState.forms[formId] || {}
  const meta = formState.formMeta[formId] || defaultMeta
  const isValid = formState.isFormValid(formId)
  const isDirty = formState.isFormDirty(formId)

  return {
    // Estado (subscrito ao Zustand)
    data,
    meta,
    isValid,
    isDirty,

    // Actions with the form ID pre-bound
    updateField: (field: string, value: unknown) =>
      store.updateField(formId, field, value),
    setSubmitting: (isSubmitting: boolean) =>
      store.setSubmitting(formId, isSubmitting),
    setError: (field: string, error: string) =>
      store.setError(formId, field, error),
    clearErrors: () => store.clearErrors(formId),
    setTouched: (field: string, touched: boolean) =>
      store.setTouched(formId, field, touched),
    reset: () => store.resetForm(formId),
    validate: (sections: ValidationSection[]) =>
      store.validateForm(formId, sections, label =>
        t('form.fieldRequired', { label })
      ),

    // Computed helpers
    getFieldValue: (field: string) => store.getFieldValue(formId, field),
    getFieldError: (field: string) => store.getFieldError(formId, field),

    // Convenience methods
    hasError: (field: string) => !!store.getFieldError(formId, field),
    isTouched: (field: string) =>
      store.formMeta[formId]?.touched?.[field] || false,
    shouldShowError: (field: string) => {
      const meta = store.formMeta[formId]
      return meta?.touched?.[field] && !!meta?.errors?.[field]
    },
  }
}

// Hook for multiple forms (useful for wizards)
export const useForms = (formIds: string[]) => {
  const store = useFormStore()
  const t = useTelamonjsT()

  return {
    // Estado agregado
    allValid: formIds.every(id => store.isFormValid(id)),
    anyDirty: formIds.some(id => store.isFormDirty(id)),

    // Actions em batch
    resetAll: () => formIds.forEach(id => store.resetForm(id)),
    validateAll: (sectionsMap: Record<string, ValidationSection[]>) =>
      formIds.every(id =>
        store.validateForm(id, sectionsMap[id] || [], label =>
          t('form.fieldRequired', { label })
        )
      ),

    // Getters por form
    getForm: (formId: string) => ({
      data: store.getFormData(formId),
      meta: store.formMeta[formId],
    }),
  }
}
