import { z } from 'zod'
import { FormField } from '../types/forms/admin-form'

/**
 * pickSectionValidation - Derive a partial Zod schema for a single form
 * section from a monolithic (whole-entity) validation schema.
 *
 * Internal helper for ViewPortalDialog's inline section editing: a section
 * only submits the names in its own `fields`, so validating against the
 * full entity schema would fail on fields the section never renders.
 *
 * Only `z.ZodObject` schemas can be picked from. Any other schema shape
 * (e.g. `z.ZodEffects` from `.refine()`/`.superRefine()`, or no schema at
 * all) returns `undefined` — the caller falls back to no validation for
 * that section rather than guessing at a cross-field refinement.
 *
 * Field names that don't exist in the schema's shape (e.g. `space`/
 * `component` layout-only fields) are silently skipped, not an error.
 *
 * Detects a ZodObject by duck-typing (`_def.typeName` + a `.pick` method)
 * instead of `instanceof z.ZodObject` — in link mode the consumer app and
 * the lib can each resolve their own copy of the `zod` module, so a schema
 * built with the consumer's `z` fails `instanceof` against the lib's `z`
 * even though it is structurally a ZodObject. `instanceof` silently fell
 * back to "no validation" for that section.
 *
 * Internal — not exported from the package barrel.
 *
 * @category Forms
 */
function isZodObject(
  validation: z.ZodType
): validation is z.ZodObject<z.ZodRawShape> {
  const def = (validation as { _def?: { typeName?: string } })._def
  return (
    def?.typeName === 'ZodObject' &&
    typeof (validation as { pick?: unknown }).pick === 'function'
  )
}

export function pickSectionValidation(
  validation: z.ZodType | undefined,
  fields: FormField[] | FormField[][]
): z.ZodType | undefined {
  if (!validation || !isZodObject(validation)) {
    return undefined
  }

  const flatFields = Array.isArray(fields[0])
    ? (fields as FormField[][]).flat()
    : (fields as FormField[])

  const shape = validation.shape as Record<string, z.ZodTypeAny>
  const mask: Partial<Record<string, true>> = {}
  for (const { name } of flatFields) {
    if (name in shape) mask[name] = true
  }

  if (Object.keys(mask).length === 0) return undefined

  return validation.pick(mask as Partial<Record<keyof typeof shape, true>>)
}
