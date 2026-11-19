/**
 * Logger factory - browser-safe: every factory returns a ConsoleLogger or a
 * NoOpLogger (no Node.js dependencies).
 */

import { ConsoleLogger } from '../adapters/console.js'
import { NoOpLogger } from '../adapters/noop.js'
import type { ILogger } from './types.js'
import type { LoggerConfig } from './types.js'
import { getLogLevelFromEnv, parseLogLevel } from './levels.js'

// Re-export LoggerConfig for convenience
export type { LoggerConfig } from './types.js'

/**
 * Create logger instance (browser-safe)
 *
 * Returns ConsoleLogger or NoOpLogger only (no Node.js dependencies)
 *
 * @example
 * ```ts
 * // Auto-detect from environment
 * const logger = createLogger()
 *
 * // Explicit config
 * const logger = createLogger({
 *   level: 'debug',
 *   format: 'pretty',
 *   colorize: true,
 * })
 * ```
 */
export function createLogger(config?: LoggerConfig): ILogger {
  const {
    level = getLogLevelFromEnv(),
    enabled = true,
    context = {},
    colorize = process.env.NODE_ENV !== 'production',
    showTimestamps = true,
    showLevel = true,
    showContext = true,
    maxContextDepth = 3,
  } = config || {}

  // Disabled logger
  if (!enabled) {
    return new NoOpLogger()
  }

  // Parse level if string
  const logLevel = typeof level === 'string' ? parseLogLevel(level) : level

  // Always return ConsoleLogger (browser-safe)
  return new ConsoleLogger({
    level: logLevel,
    context,
    colorize,
    showTimestamps,
    showLevel,
    showContext,
    maxContextDepth,
  })
}

/**
 * Create browser logger
 */
export function createBrowserLogger(config?: LoggerConfig): ILogger {
  return createLogger({
    colorize: true,
    ...config,
  })
}

/**
 * Create worker logger (background jobs)
 */
export function createWorkerLogger(config?: LoggerConfig): ILogger {
  return createLogger({
    colorize: false,
    ...config,
  })
}

/**
 * Create test logger (silent or spy)
 */
export function createTestLogger(_config?: LoggerConfig): ILogger {
  return new NoOpLogger()
}

/**
 * Default logger instance
 */
export const logger = createLogger()
