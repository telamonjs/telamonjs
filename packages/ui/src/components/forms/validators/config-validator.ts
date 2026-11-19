/**
 * Form Config Validator
 *
 * Validates FormField and FormSection configurations in development mode
 * to catch configuration errors before runtime.
 *
 * @module config-validator
 */

import type { FormField, FormSection } from '../AdminForm'
import { logger } from '../../../utils/logger'
import { fieldRegistry } from '../../../field-system/field-registry'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validates a single FormField configuration
 *
 * Checks:
 * - Field type exists in registry
 * - Required props for specific field types
 * - Dependencies are valid
 * - Mask patterns are valid (basic check)
 *
 * @param field - The FormField to validate
 * @returns ValidationResult with errors and warnings
 *
 * @example
 * ```typescript
 * const field: FormField = {
 *   name: 'email',
 *   label: 'Email',
 *   type: 'email',
 *   required: true
 * }
 *
 * const result = validateFormField(field)
 * if (!result.valid) {
 *   console.error('Field errors:', result.errors)
 * }
 * ```
 */
export function validateFormField(field: FormField): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 1. Validate field name exists
  if (!field.name || field.name.trim() === '') {
    errors.push(`Field is missing 'name' property`)
  }

  // 2. Validate field type exists in registry
  if (!field.type) {
    errors.push(`Field '${field.name}' is missing 'type' property`)
  } else if (!isValidFieldType(field.type)) {
    errors.push(
      `Field '${field.name}' has invalid type '${field.type}'. Valid types: ${getValidFieldTypes().join(', ')}`
    )
  }

  // 3. Validate type-specific required props
  if (field.type === 'relationship' || field.type === 'multiselect') {
    if (!field.loadField) {
      errors.push(
        `Field '${field.name}' with type '${field.type}' requires 'loadField' function`
      )
    }
  }

  if (field.type === 'image' || field.type === 'file') {
    if (!field.uploadFn) {
      warnings.push(
        `Field '${field.name}' with type '${field.type}' should have 'uploadFn'. File uploads will not work without it.`
      )
    }
  }

  if (field.type === 'component') {
    if (!field.Component) {
      errors.push(
        `Field '${field.name}' with type 'component' requires 'Component' prop`
      )
    }
  }

  if (field.type === 'masked') {
    if (!field.mask) {
      // maskType 'tel' picks the landline/mobile mask by itself (MaskedRenderer)
      if (field.maskType !== 'tel') {
        errors.push(
          `Field '${field.name}' with type 'masked' requires 'mask' prop`
        )
      }
    } else if (!isValidMaskPattern(field.mask)) {
      warnings.push(
        `Field '${field.name}' has potentially invalid mask pattern '${field.mask}'`
      )
    }
  }

  if (field.type === 'crud') {
    // Support both field.fields and field.crudConfig.fields formats
    const crudConfig = field.crudConfig as Record<string, unknown> | undefined
    const hasFields =
      (field.fields && (field.fields as unknown[]).length > 0) ||
      (crudConfig?.fields && (crudConfig.fields as unknown[]).length > 0)
    const hasListingFn = field.listingFn || crudConfig?.loadData

    if (!hasFields) {
      errors.push(
        `Field '${field.name}' with type 'crud' requires 'fields' array`
      )
    }
    if (!hasListingFn) {
      warnings.push(
        `Field '${field.name}' with type 'crud' should have 'listingFn' for data loading`
      )
    }
  }

  // 4. Validate dependsOn field
  if (field.dependsOn && field.dependsOn.trim() === '') {
    warnings.push(
      `Field '${field.name}' has empty 'dependsOn'. This might be unintentional.`
    )
  }

  // 5. Validate label exists (I18nText: a MessageRef always counts as present —
  // only a literal string can be blank)
  if (!field.label || (typeof field.label === 'string' && field.label.trim() === '')) {
    warnings.push(`Field '${field.name}' is missing 'label' property`)
  }

  // 6. Validate span format (if provided)
  if (field.span && !isValidSpan(field.span)) {
    warnings.push(
      `Field '${field.name}' has invalid 'span' value '${field.span}'. Expected: '1' through '12' or 'full' (the renderer prefixes 'col-span-')`
    )
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validates a FormSection configuration
 *
 * Checks:
 * - Section has label
 * - Section has fields
 * - Grid value is valid
 * - All fields in section are valid
 *
 * @param section - The FormSection to validate
 * @param sectionIndex - Index of the section (for error messages)
 * @returns ValidationResult with errors and warnings
 *
 * @example
 * ```typescript
 * const section: FormSection = {
 *   label: 'Personal Info',
 *   grid: '2',
 *   fields: [
 *     { name: 'name', label: 'Name', type: 'text' },
 *     { name: 'email', label: 'Email', type: 'email' }
 *   ]
 * }
 *
 * const result = validateFormSection(section, 0)
 * if (!result.valid) {
 *   console.error('Section errors:', result.errors)
 * }
 * ```
 */
export function validateFormSection(
  section: FormSection,
  sectionIndex: number
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 1. Validate section label (I18nText: a MessageRef always counts as present —
  // only a literal string can be blank)
  if (!section.label || (typeof section.label === 'string' && section.label.trim() === '')) {
    warnings.push(`Section at index ${sectionIndex} is missing 'label'`)
  }

  // 2. Validate section has fields
  if (!section.fields || section.fields.length === 0) {
    errors.push(
      `Section '${section.label || `index ${sectionIndex}`}' has no fields`
    )
  }

  // 3. Validate grid value
  if (section.grid && !isValidGrid(section.grid)) {
    warnings.push(
      `Section '${section.label}' has invalid 'grid' value '${section.grid}'. Expected: '1', '2', '3', or '4'`
    )
  }

  // 4. Validate all fields in section
  if (section.fields) {
    // Check if fields is array of arrays (row layout)
    const isRowLayout = Array.isArray(section.fields[0])

    if (isRowLayout) {
      ;(section.fields as FormField[][]).forEach((row, rowIndex) => {
        row.forEach(field => {
          const fieldResult = validateFormField(field)
          errors.push(
            ...fieldResult.errors.map(
              err => `Section '${section.label}' row ${rowIndex}: ${err}`
            )
          )
          warnings.push(
            ...fieldResult.warnings.map(
              warn => `Section '${section.label}' row ${rowIndex}: ${warn}`
            )
          )
        })
      })
    } else {
      ;(section.fields as FormField[]).forEach(field => {
        const fieldResult = validateFormField(field)
        errors.push(
          ...fieldResult.errors.map(err => `Section '${section.label}': ${err}`)
        )
        warnings.push(
          ...fieldResult.warnings.map(
            warn => `Section '${section.label}': ${warn}`
          )
        )
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validates an array of FormSections
 *
 * @param sections - Array of FormSections to validate
 * @returns ValidationResult with all errors and warnings
 *
 * @example
 * ```typescript
 * const sections: FormSection[] = [
 *   {
 *     label: 'Basic Info',
 *     fields: [
 *       { name: 'name', label: 'Name', type: 'text' }
 *     ]
 *   }
 * ]
 *
 * const result = validateFormSections(sections)
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors)
 * }
 * if (result.warnings.length > 0) {
 *   console.warn('Validation warnings:', result.warnings)
 * }
 * ```
 */
export function validateFormSections(
  sections: FormSection[] | readonly FormSection[]
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!sections || sections.length === 0) {
    errors.push('formSections is empty or undefined')
    return { valid: false, errors, warnings }
  }

  sections.forEach((section, index) => {
    const sectionResult = validateFormSection(section, index)
    errors.push(...sectionResult.errors)
    warnings.push(...sectionResult.warnings)
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Logs validation results to console (development mode only)
 *
 * @param result - ValidationResult to log
 * @param context - Context string (e.g., 'CreateForm', 'EditForm')
 *
 * @example
 * ```typescript
 * const result = validateFormSections(sections)
 * logValidationResult(result, 'CreateForm')
 * // Console output:
 * // ❌ [CreateForm] Validation errors:
 * // - Field 'email' missing required 'loadField'
 * // ⚠️ [CreateForm] Validation warnings:
 * // - Field 'name' is missing 'label' property
 * ```
 */
export function logValidationResult(
  result: ValidationResult,
  context: string
): void {
  // Only log in development
  if (process.env.NODE_ENV !== 'development') return

  if (result.errors.length > 0) {
    logger.error(`[${context}] Form config validation errors`, {
      errors: result.errors,
    })
  }

  if (result.warnings.length > 0) {
    logger.warn(`[${context}] Form config validation warnings`, {
      warnings: result.warnings,
    })
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Checks if a field type exists in the field registry
 */
function isValidFieldType(type: string): boolean {
  try {
    return type in fieldRegistry
  } catch {
    return false
  }
}

/**
 * Gets all valid field types from registry
 */
function getValidFieldTypes(): string[] {
  return Object.keys(fieldRegistry)
}

/**
 * Validates mask pattern (basic check)
 * Masks should contain mask characters: 9 (number), A (letter), * (alphanumeric)
 */
function isValidMaskPattern(mask: string): boolean {
  // Basic check: mask should contain mask characters
  return /[9A*]/.test(mask)
}

/**
 * Validates grid value
 * Valid values: '1', '2', '3', '4'
 */
function isValidGrid(grid: string): boolean {
  return ['1', '2', '3', '4'].includes(grid)
}

/**
 * Validates span value
 * Valid values: 'col-span-1' through 'col-span-12'
 */
// `span` is the class SUFFIX: the renderer (field-group.tsx) builds `col-span-${span}`.
// Accepts '1'..'12' and 'full'; an already-prefixed value ('col-span-2') would produce `col-span-col-span-2`.
function isValidSpan(span: string): boolean {
  return /^([1-9]|1[0-2]|full)$/.test(span)
}
