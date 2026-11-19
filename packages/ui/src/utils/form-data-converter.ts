/**
 * Form Data Converter
 *
 * Utilities for converting between nested (Prisma) and flat (dot notation) structures
 * Used by EditForm to auto-detect and normalize data formats
 */

// `any` kept intentionally: genuinely dynamic form data (Prisma responses).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NestedRecord = Record<string, any>

/**
 * Detects if an object has nested structure (contains objects as values)
 * Used to determine if conversion is needed
 *
 * @example
 * hasNestedStructure({ person: { name: "John" } }) // true
 * hasNestedStructure({ "person.name": "John" }) // false
 */
export function hasNestedStructure(data: NestedRecord): boolean {
  if (!data || typeof data !== 'object') return false

  for (const value of Object.values(data)) {
    // Check if value is a plain object (not Date, Array, null)
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date) &&
      Object.keys(value).length > 0
    ) {
      return true
    }
  }

  return false
}
