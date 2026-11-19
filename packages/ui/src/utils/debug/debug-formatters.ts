/**
 * Debug Formatters
 *
 * Utilities for formatting data in debug logs
 */

/**
 * Format FormData as plain object for logging
 */
export function formatFormData(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {}

  for (const [key, value] of formData.entries()) {
    // Handle File objects specially
    if (value instanceof File) {
      obj[key] = {
        _type: 'File',
        name: value.name,
        size: value.size,
        type: value.type,
      }
    } else {
      obj[key] = value
    }
  }

  return obj
}

/**
 * Format field value for display
 */
export function formatFieldValue(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (value instanceof Date) return value.toISOString()
  if (value instanceof File) return `File(${value.name})`
  if (Array.isArray(value)) return `Array(${value.length})`
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return '[Circular Object]'
    }
  }
  return String(value)
}

/**
 * Analyze data structure (nested vs flat)
 */
export function analyzeStructure(
  data: unknown
): 'nested' | 'flat' | 'empty' | 'invalid' {
  if (!data) return 'empty'
  if (typeof data !== 'object') return 'invalid'

  const values = Object.values(data)
  const hasNestedObjects = values.some(
    v =>
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      !(v instanceof Date) &&
      !(v instanceof File)
  )

  return hasNestedObjects ? 'nested' : 'flat'
}

/**
 * Calculate diff between two objects
 */
export function calculateDiff(
  before: unknown,
  after: unknown
): {
  added: string[]
  removed: string[]
  changed: string[]
  unchanged: string[]
} {
  const beforeObj = (before || {}) as Record<string, unknown>
  const afterObj = (after || {}) as Record<string, unknown>
  const beforeKeys = Object.keys(beforeObj)
  const afterKeys = Object.keys(afterObj)

  const added = afterKeys.filter(k => !beforeKeys.includes(k))
  const removed = beforeKeys.filter(k => !afterKeys.includes(k))
  const commonKeys = beforeKeys.filter(k => afterKeys.includes(k))

  const changed: string[] = []
  const unchanged: string[] = []

  for (const key of commonKeys) {
    if (JSON.stringify(beforeObj[key]) !== JSON.stringify(afterObj[key])) {
      changed.push(key)
    } else {
      unchanged.push(key)
    }
  }

  return { added, removed, changed, unchanged }
}

/**
 * Format diff for display
 */
export function formatDiff(diff: ReturnType<typeof calculateDiff>): string {
  const parts: string[] = []

  if (diff.added.length > 0) {
    parts.push(`Added: ${diff.added.join(', ')}`)
  }
  if (diff.removed.length > 0) {
    parts.push(`Removed: ${diff.removed.join(', ')}`)
  }
  if (diff.changed.length > 0) {
    parts.push(`Changed: ${diff.changed.join(', ')}`)
  }
  if (parts.length === 0) {
    return 'No changes'
  }

  return parts.join(' | ')
}

/**
 * Truncate long strings for display
 */
export function truncate(str: string, maxLength = 100): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}

/**
 * Format object keys for display (show count and first few)
 */
export function formatKeys(obj: unknown, maxDisplay = 5): string {
  if (!obj || typeof obj !== 'object') return '[]'

  const keys = Object.keys(obj)
  if (keys.length === 0) return '[]'
  if (keys.length <= maxDisplay) return `[${keys.join(', ')}]`

  const shown = keys.slice(0, maxDisplay)
  const remaining = keys.length - maxDisplay
  return `[${shown.join(', ')}, +${remaining} more]`
}
