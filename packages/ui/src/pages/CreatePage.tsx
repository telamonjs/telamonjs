'use client'

import { z } from 'zod'
import type {
  FormActionResult,
  FormSection,
} from '../components/forms/AdminForm'
import { CreateForm } from '../components/forms/CreateForm'
import { BaseFormPage } from './BaseFormPage'
import { useTelamonjsT, useText } from '../i18n/use-t'
import type { I18nText } from '../i18n/msg'

export interface CreatePageProps<T = Record<string, unknown>> {
  sections: FormSection[] | readonly FormSection[]
  action: (formData: FormData) => Promise<FormActionResult<T> | void>
  defaultValues?: Partial<T>
  validation?: z.ZodType

  // Layout props
  title?: I18nText
  description?: I18nText

  // CreateForm props passthrough
  submitText?: I18nText
  cancelAction?: () => void
  onSuccess?: (result: FormActionResult<T>) => void
  grid?: string
  useTabs?: boolean
  hideButtons?: boolean
}

/**
 * CreatePage - Page wrapper for creating new records with automatic layout
 *
 * Combines CreateForm with PageContent for consistent create page experience.
 * Reduces boilerplate by auto-wrapping with title/description.
 *
 * Key differences from EditPage:
 * - No `id` prop required
 * - Uses `defaultValues` instead of `data`
 * - Automatically filters `editOnly` sections/fields
 * - Automatically filters `type: 'crud'` fields (CRUD only in edit mode)
 * - Default submit text is "Criar"
 * - Default useTabs is false (better UX for creation)
 *
 * @example
 * ```tsx
 * <CreatePage
 *   sections={formSections}
 *   action={createAction}
 *   defaultValues={{ ativo: true }}
 *   title="Novo Cliente"
 *   description="Adicione um novo cliente ao sistema"
 * />
 * ```
 *
 * @example Without title (uses CreateForm directly)
 * ```tsx
 * <CreatePage
 *   sections={formSections}
 *   action={createAction}
 *   defaultValues={{ ativo: true }}
 * />
 * ```
 */
export function CreatePage<T extends Record<string, unknown>>({
  sections,
  action,
  defaultValues,
  validation,

  // Layout props
  title,
  description,

  // CreateForm props
  submitText,
  cancelAction,
  onSuccess,
  grid,
  useTabs = false, // Default false para facilitar cadastro
  hideButtons,
}: CreatePageProps<T>) {
  const t = useTelamonjsT()
  const text = useText()
  const formComponent = (
    <CreateForm<T>
      sections={sections}
      action={action}
      defaultValues={defaultValues}
      validation={validation}
      submitText={text(submitText) ?? t('dialog.createSubmit')}
      cancelAction={cancelAction}
      onSuccess={onSuccess}
      grid={grid}
      useTabs={useTabs}
      hideButtons={hideButtons}
    />
  )

  return (
    <BaseFormPage
      formComponent={formComponent}
      title={title}
      description={description}
      variant='card'
    />
  )
}
