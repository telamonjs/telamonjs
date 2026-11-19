'use client'

import type { FormField } from '../../../types/forms/admin-form'

/** Get a nested value from an object using dot notation (e.g. 'pessoa.nome'). */
export const getNestedValue = (
  obj: Record<string, unknown> | undefined,
  path: string
): unknown => {
  if (!obj) return undefined
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

/** Check if a flat or row-structured field list contains a 'crud' field. */
export const hasCrudFields = (
  fields: readonly FormField[] | readonly (readonly FormField[])[]
): boolean => {
  const checkFields = (fieldArray: readonly FormField[]): boolean => {
    return fieldArray.some(field => field.type === 'crud')
  }

  // Check if it's a row structure (nested arrays)
  if (fields.length > 0 && Array.isArray(fields[0])) {
    const rows = fields as readonly (readonly FormField[])[]
    return rows.some(row => checkFields(row))
  }

  // Flat structure
  return checkFields(fields as readonly FormField[])
}

/**
 * Nested-aware error lookup: RHF stores errors for dot-notation field
 * names in nested structure (e.g., errors.pessoa.nome for 'pessoa.nome').
 */
export const getFieldError = (
  errors: Record<string, unknown>,
  name: string
): { message?: string } | undefined => {
  return (errors[name] ?? getNestedValue(errors, name)) as
    | { message?: string }
    | undefined
}
