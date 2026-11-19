import type { FormField, FormSection } from '../../types/forms/admin-form'
import type { useText } from '../../i18n/use-t'

type Text = ReturnType<typeof useText>

/** `FormField` with `label`/`placeholder`/`description` already resolved to plain strings. */
export type ResolvedFormField = Omit<FormField, 'label' | 'placeholder' | 'description'> & {
  label: string
  placeholder?: string
  description?: string
}

/** `FormSection` with `label`/`description` (and its fields') already resolved to plain strings. */
export type ResolvedFormSection = Omit<FormSection, 'label' | 'description' | 'fields'> & {
  label: string
  description?: string
  fields: ResolvedFormField[] | ResolvedFormField[][]
}

/**
 * Resolves a `FormField`'s `label`/`placeholder`/`description` (I18nText) to plain
 * strings, once, at the BaseForm/AdminForm boundary — the field-system renderers and
 * the admin-form field-group layout keep receiving strings, unchanged.
 */
function resolveFormField(field: FormField, text: Text): ResolvedFormField {
  return {
    ...field,
    label: text(field.label) ?? '',
    placeholder: text(field.placeholder),
    description: text(field.description),
  }
}

function resolveFormFields(
  fields: FormField[] | FormField[][],
  text: Text
): ResolvedFormField[] | ResolvedFormField[][] {
  if (Array.isArray(fields[0])) {
    return (fields as FormField[][]).map(row =>
      row.map(f => resolveFormField(f, text))
    )
  }
  return (fields as FormField[]).map(f => resolveFormField(f, text))
}

/** Resolves a `FormSection`'s `label`/`description` and its fields' I18nText slots. */
export function resolveFormSection(
  section: FormSection,
  text: Text
): ResolvedFormSection {
  return {
    ...section,
    label: text(section.label) ?? '',
    description: text(section.description),
    fields: resolveFormFields(section.fields, text),
  }
}

export function resolveFormSections(
  sections: FormSection[] | readonly FormSection[] | undefined,
  text: Text
): ResolvedFormSection[] | undefined {
  return sections?.map(s => resolveFormSection(s, text))
}

export function resolveFormFieldsList(
  fields: FormField[] | readonly FormField[] | undefined,
  text: Text
): ResolvedFormField[] | undefined {
  return fields?.map(f => resolveFormField(f, text))
}
