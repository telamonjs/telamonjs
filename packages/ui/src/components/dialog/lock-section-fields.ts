import type { FormSection } from '../forms/AdminForm'
import type { FormField } from '../../types/forms/admin-form'

/** `lockedFields` → `readOnly` (flat or row-based sections), same references when empty */
export function lockSectionFields<S extends FormSection>(
  sections: readonly S[],
  lockedFields?: readonly string[]
): S[] {
  if (!lockedFields?.length) return sections as S[]
  const lock = (f: FormField) =>
    lockedFields.includes(f.name) ? { ...f, readOnly: true } : f
  return sections.map(section => ({
    ...section,
    fields: (section.fields as (FormField | FormField[])[]).map(f =>
      Array.isArray(f) ? f.map(lock) : lock(f)
    ),
  })) as S[]
}
