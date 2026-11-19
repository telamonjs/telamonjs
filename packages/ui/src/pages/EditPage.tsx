'use client'

import { z } from 'zod'
import type {
  FormActionResult,
  FormSection,
} from '../components/forms/AdminForm'
import { EditForm } from '../components/forms/EditForm'
import { BaseFormPage } from './BaseFormPage'
import { useText } from '../i18n/use-t'
import type { I18nText } from '../i18n/msg'

export interface EditPageProps<T = Record<string, unknown>> {
  id: string
  data: Partial<T>
  sections: FormSection[] | readonly FormSection[]
  action: (formData: FormData) => Promise<FormActionResult<T> | void>
  validation?: z.ZodType

  // Layout props
  title?: I18nText
  description?: I18nText

  // EditForm props passthrough
  submitText?: I18nText
  cancelAction?: () => void
  onSuccess?: (result: FormActionResult<T>) => void
  grid?: string
  useTabs?: boolean
  hideButtons?: boolean
}

/**
 * EditPage - Page wrapper for editing records with automatic layout
 *
 * Combines EditForm with PageContent for consistent edit page experience.
 * Reduces boilerplate by auto-wrapping with title/description.
 *
 * @example
 * ```tsx
 * <EditPage
 *   id={entity.id}
 *   data={entity}
 *   sections={formSections}
 *   action={updateAction}
 *   title={`Edit ${entity.name}`}
 *   description="Update the information"
 * />
 * ```
 *
 * @example Without title (uses EditForm directly)
 * ```tsx
 * <EditPage
 *   id={entity.id}
 *   data={entity}
 *   sections={formSections}
 *   action={updateAction}
 * />
 * ```
 */
export function EditPage<T extends Record<string, unknown>>({
  id,
  data,
  sections,
  action,
  validation,

  // Layout props
  title,
  description,

  // EditForm props
  submitText,
  cancelAction,
  onSuccess,
  grid,
  useTabs,
  hideButtons,
}: EditPageProps<T>) {
  const text = useText()
  const formComponent = (
    <EditForm<T>
      id={id}
      data={data}
      sections={sections}
      action={action}
      validation={validation}
      submitText={text(submitText)}
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
      variant='plain'
    />
  )
}
