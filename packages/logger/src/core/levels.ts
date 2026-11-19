/**
 * Log level utilities
 */

import { LogLevel } from './types.js'

/**
 * Log level names (uppercase)
 */
export const LOG_LEVEL_NAMES_UPPER: Record<LogLevel, string> = {
  [LogLevel.FATAL]: 'FATAL',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.TRACE]: 'TRACE',
}

/**
 * Parse log level from string
 */
export function parseLogLevel(level: string | LogLevel): LogLevel {
  if (typeof level === 'number') {
    return level
  }

  const levelUpper = level.toUpperCase()

  switch (levelUpper) {
    case 'FATAL':
      return LogLevel.FATAL
    case 'ERROR':
      return LogLevel.ERROR
    case 'WARN':
    case 'WARNING':
      return LogLevel.WARN
    case 'INFO':
      return LogLevel.INFO
    case 'DEBUG':
      return LogLevel.DEBUG
    case 'TRACE':
      return LogLevel.TRACE
    default:
      return LogLevel.INFO
  }
}

/**
 * Check if level should be logged based on minimum level
 */
export function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
  return level <= minLevel
}

/**
 * Get log level from environment
 */
export function getLogLevelFromEnv(): LogLevel {
  const envLevel = process.env.LOG_LEVEL || process.env.NODE_ENV

  if (!envLevel) {
    return LogLevel.INFO
  }

  // Handle NODE_ENV
  if (envLevel === 'development' || envLevel === 'dev') {
    return LogLevel.DEBUG
  }

  if (envLevel === 'production' || envLevel === 'prod') {
    return LogLevel.INFO
  }

  if (envLevel === 'test') {
    return LogLevel.ERROR
  }

  // Parse as log level
  return parseLogLevel(envLevel)
}
