/**
 * Debug Configuration
 *
 * Manages debug mode detection and configuration for telamonjs components.
 * Supports multiple activation methods:
 * - Environment variables (NEXT_PUBLIC_TELAMONJS_DEBUG)
 * - Window object (__TELAMONJS_DEBUG__)
 * - Server-side environment (TELAMONJS_DEBUG)
 */

declare global {
  interface Window {
    /** Runtime debug override: any defined value wins over the env vars (coerced with `Boolean`). */
    __TELAMONJS_DEBUG__?: unknown
  }
}

export type DebugLevel = 'basic' | 'verbose' | 'trace'

export type DebugCategory =
  | 'forms'
  | 'transformations'
  | 'rendering'
  | 'validation'
  | 'state'

export interface DebugConfig {
  enabled: boolean
  level: DebugLevel
  categories: Record<DebugCategory, boolean>
}

/**
 * Detect if debug mode is enabled
 * Checks multiple sources in order of priority:
 * 1. Window object (runtime override)
 * 2. Public env var (client-side)
 * 3. Server env var (server-side)
 */
function isDebugEnabled(): boolean {
  // Runtime override via window
  if (typeof window !== 'undefined') {
    const windowDebug = window.__TELAMONJS_DEBUG__
    if (windowDebug !== undefined) {
      return Boolean(windowDebug)
    }
  }

  // Client-side env var (must be NEXT_PUBLIC_*)
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TELAMONJS_DEBUG) {
    return process.env.NEXT_PUBLIC_TELAMONJS_DEBUG === 'true'
  }

  // Server-side env var
  if (typeof process !== 'undefined' && process.env.TELAMONJS_DEBUG) {
    return process.env.TELAMONJS_DEBUG === 'true'
  }

  return false
}

/**
 * Get debug level from environment
 */
function getDebugLevel(): DebugLevel {
  const level =
    (typeof process !== 'undefined' &&
      process.env.NEXT_PUBLIC_TELAMONJS_DEBUG_LEVEL) ||
    (typeof process !== 'undefined' && process.env.TELAMONJS_DEBUG_LEVEL) ||
    'basic'

  if (level === 'verbose' || level === 'trace') {
    return level
  }

  return 'basic'
}

/**
 * Get current debug configuration
 * Called once per component instance
 */
export function getDebugConfig(): DebugConfig {
  const enabled = isDebugEnabled()
  const level = getDebugLevel()

  return {
    enabled,
    level,
    categories: {
      forms: enabled,
      transformations: enabled,
      rendering: enabled,
      validation: enabled,
      state: enabled,
    },
  }
}

/**
 * Check if verbose logging is enabled
 */
export function isVerboseMode(): boolean {
  const config = getDebugConfig()
  return (
    config.enabled && (config.level === 'verbose' || config.level === 'trace')
  )
}

/**
 * Check if trace logging is enabled (most detailed)
 */
export function isTraceMode(): boolean {
  const config = getDebugConfig()
  return config.enabled && config.level === 'trace'
}
