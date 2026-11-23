/**
 * Logger factory - browser-safe: every factory returns a ConsoleLogger,
 * PrettyLogger or NoOpLogger (no Node.js dependencies).
 */

import { ConsoleLogger } from '../adapters/console.js'
import { NoOpLogger } from '../adapters/noop.js'
import { PrettyLogger } from '../adapters/pretty.js'
import type { ILogger } from './types.js'
import type { LoggerConfig } from './types.js'
import { getLogLevelFromEnv, parseLogLevel } from './levels.js'

// Re-export LoggerConfig for convenience
export type { LoggerConfig } from './types.js'

/**
 * Create logger instance (browser-safe)
 *
 * `format` picks the output: `'simple'` (default) is ConsoleLogger text,
 * `'json'` is ConsoleLogger writing one JSON object per line, `'pretty'` is
 * PrettyLogger. `enabled: false` returns a NoOpLogger.
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
    format = 'simple',
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

  if (format === 'pretty') {
    // Unset colorize falls back to PrettyLogger's TTY/NO_COLOR detection
    return new PrettyLogger({
      level: logLevel,
      context,
      colorize: config?.colorize,
    })
  }

  return new ConsoleLogger({
    level: logLevel,
    context,
    format,
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
