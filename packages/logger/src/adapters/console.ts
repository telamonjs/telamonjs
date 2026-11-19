/**
 * Console logger (development + browser)
 */

import type { LogContext, LogLevel, LoggerConfig } from '../core/types.js'
import { LOG_LEVEL_NAMES_UPPER } from '../core/levels.js'
import { BaseLogger } from './base.js'
import { cleanContext } from '../core/context.js'

/**
 * Console logger configuration
 */
export interface ConsoleLoggerConfig extends LoggerConfig {
  colorize?: boolean
  showTimestamps?: boolean
  showLevel?: boolean
  showContext?: boolean
  maxContextDepth?: number
}

/**
 * Console logger (simple, for development and browser)
 */
export class ConsoleLogger extends BaseLogger {
  private colorize: boolean
  private showTimestamps: boolean
  private showLevel: boolean
  private showContext: boolean

  constructor(config?: ConsoleLoggerConfig) {
    const {
      level = 3, // INFO
      context = {},
      colorize = true,
      showTimestamps = true,
      showLevel = true,
      showContext = true,
    } = config || {}

    super(typeof level === 'number' ? level : 3, context)
    this.colorize = colorize
    this.showTimestamps = showTimestamps
    this.showLevel = showLevel
    this.showContext = showContext
  }

  protected logMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): void {
    const parts: string[] = []

    // Timestamp
    if (this.showTimestamps) {
      const timestamp = new Date().toISOString()
      parts.push(this.colorize ? `\x1b[90m${timestamp}\x1b[0m` : timestamp)
    }

    // Level
    if (this.showLevel) {
      const levelName = LOG_LEVEL_NAMES_UPPER[level]
      const coloredLevel = this.colorize
        ? this.colorizeLevel(level, levelName)
        : `[${levelName}]`
      parts.push(coloredLevel)
    }

    // Message
    parts.push(message)

    // Context
    if (this.showContext && context && Object.keys(context).length > 0) {
      const cleanedContext = cleanContext(context)
      const contextStr = JSON.stringify(cleanedContext, null, 2)
      parts.push(this.colorize ? `\x1b[90m${contextStr}\x1b[0m` : contextStr)
    }

    // Output
    this.writeToConsole(level, parts.join(' '))
  }

  private colorizeLevel(level: LogLevel, levelName: string): string {
    const colors: Record<LogLevel, string> = {
      0: '\x1b[41m\x1b[37m', // FATAL: red bg, white text
      1: '\x1b[31m', // ERROR: red
      2: '\x1b[33m', // WARN: yellow
      3: '\x1b[36m', // INFO: cyan
      4: '\x1b[90m', // DEBUG: gray
      5: '\x1b[90m', // TRACE: gray
    }

    const color = colors[level] || '\x1b[0m'
    return `${color}[${levelName}]\x1b[0m`
  }

  private writeToConsole(level: LogLevel, output: string): void {
    switch (level) {
      case 0: // FATAL
      case 1: // ERROR
        console.error(output)
        break
      case 2: // WARN
        console.warn(output)
        break
      default:
        console.log(output)
    }
  }
}
