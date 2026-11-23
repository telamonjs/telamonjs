import type { FormField, FormSection } from '../../../types/forms/admin-form'

/** Flatten a section's fields (flat array or row-of-arrays) into FormField[]. */
function flattenSectionFields(fields: FormSection['fields']): FormField[] {
  const first = fields[0]
  return Array.isArray(first)
    ? (fields as FormField[][]).flat()
    : (fields as FormField[])
}

/**
 * Names of every field currently hidden by a `visibleWhen` predicate — its
 * own, or its section's (a hidden section hides all of its fields). Used to
 * strip hidden fields from validation errors and from submitted values.
 */
export function collectHiddenFieldNames(
  config: {
    fields?: readonly FormField[]
    sections?: readonly FormSection[]
  },
  values: Record<string, unknown>
): Set<string> {
  const hidden = new Set<string>()

  const visit = (fields: FormField[], sectionHidden: boolean) => {
    for (const field of fields) {
      if (sectionHidden || (field.visibleWhen && !field.visibleWhen(values))) {
        hidden.add(field.name)
      }
    }
  }

  if (config.fields) visit(config.fields as FormField[], false)

  for (const section of config.sections || []) {
    const sectionHidden = !!(
      section.visibleWhen && !section.visibleWhen(values)
    )
    visit(flattenSectionFields(section.fields), sectionHidden)
  }

  return hidden
}

// A field name is config-controlled, but a path through these keys would
// reach (and delete from) Object.prototype.
const UNSAFE_PATH_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype'])

/** Delete a (possibly dotted, e.g. 'pessoa.cpf') path from a plain object. */
function deleteAtPath(obj: Record<string, unknown>, path: string) {
  const parts = path.split('.')
  if (parts.some(p => UNSAFE_PATH_SEGMENTS.has(p))) return
  let target: Record<string, unknown> = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const next = target[parts[i]]
    if (!next || typeof next !== 'object') return
    target = next as Record<string, unknown>
  }
  delete target[parts[parts.length - 1]]
}

// ponytail: recurses into plain objects/arrays only — File/Date/class
// instances are kept by reference (never descended into), sidestepping
// structuredClone's failure on File in submit payloads.
function cloneForOmit(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneForOmit)
  if (value && typeof value === 'object' && value.constructor === Object) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = cloneForOmit(v)
    return out
  }
  return value
}

/** Clone of `values` with every hidden field's path deleted. */
export function omitHiddenFields<T extends Record<string, unknown>>(
  values: T,
  hidden: Set<string>
): T {
  if (hidden.size === 0) return values
  const clone = cloneForOmit(values) as Record<string, unknown>
  for (const name of hidden) deleteAtPath(clone, name)
  return clone as T
}

/**
 * Drop RHF error entries (including nested dot-paths) for hidden fields.
 * `errors` is a fresh object returned by this same resolver call (not
 * RHF's committed state), so mutating it in place is safe.
 */
export function stripHiddenErrors<E extends Record<string, unknown>>(
  errors: E,
  hidden: Set<string>
): E {
  if (hidden.size === 0) return errors
  for (const name of hidden) deleteAtPath(errors, name)
  return errors
}
