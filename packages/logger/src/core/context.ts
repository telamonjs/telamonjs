/**
 * Context management utilities
 */

import type { LogContext } from './types.js'

/**
 * Merge multiple log contexts
 */
export function mergeContext(
  ...contexts: (LogContext | undefined)[]
): LogContext {
  return Object.assign({}, ...contexts.filter(Boolean))
}

/**
 * Clean context for serialization (remove undefined, functions, etc.)
 */
export function cleanContext(context: LogContext): LogContext {
  const cleaned: LogContext = {}

  for (const [key, value] of Object.entries(context)) {
    if (value === undefined || value === null) {
      continue
    }

    if (typeof value === 'function') {
      continue
    }

    // JSON.stringify throws on BigInt (e.g. Prisma BigInt ids)
    if (typeof value === 'bigint') {
      cleaned[key] = value.toString()
      continue
    }

    // Handle Error objects
    if (value instanceof Error) {
      cleaned[key] = {
        message: value.message,
        name: value.name,
        stack: value.stack,
      }
      continue
    }

    // Handle circular references (basic check)
    if (typeof value === 'object') {
      try {
        JSON.stringify(value)
        cleaned[key] = value
      } catch {
        cleaned[key] = '[Circular]'
      }
      continue
    }

    cleaned[key] = value
  }

  return cleaned
}
