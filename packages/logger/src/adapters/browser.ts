/**
 * Browser logger (client-side)
 */

import type { LogContext, LogLevel, LoggerConfig } from '../core/types.js'
import { LOG_LEVEL_NAMES_UPPER } from '../core/levels.js'
import { BaseLogger } from './base.js'
import { cleanContext } from '../core/context.js'

/**
 * Browser logger (client-side with DevTools integration)
 */
export class BrowserLogger extends BaseLogger {
  private buffer: Array<{
    level: LogLevel
    message: string
    context?: LogContext
  }> = []
  private bufferSize: number = 100
  private flushInterval: number = 5000 // 5 seconds

  constructor(config?: LoggerConfig) {
    const { level = 3, context = {} } = config || {}
    super(typeof level === 'number' ? level : 3, context)

    // Auto-flush buffer periodically (browser only)
    if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
      setInterval(() => this.flush(), this.flushInterval)
    }
  }

  protected logMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): void {
    // Buffer logs for potential batch sending
    this.buffer.push({ level, message, context })

    // Trim buffer if too large
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift()
    }

    // Immediate console output
    this.writeToConsole(level, message, context)
  }

  private writeToConsole(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): void {
    const levelName = LOG_LEVEL_NAMES_UPPER[level]
    const prefix = `[${levelName}]`
    const cleanedContext = context ? cleanContext(context) : undefined

    // Use appropriate console method with styling
    switch (level) {
      case 0: // FATAL
      case 1: // ERROR
        console.error(
          `%c${prefix}`,
          'color: white; background-color: red; font-weight: bold; padding: 2px 4px;',
          message,
          cleanedContext
        )
        break
      case 2: // WARN
        console.warn(
          `%c${prefix}`,
          'color: orange; font-weight: bold;',
          message,
          cleanedContext
        )
        break
      case 3: // INFO
        if (context?.level === 'success') {
          console.log(
            `%c✓`,
            'color: green; font-weight: bold;',
            message,
            cleanedContext
          )
        } else {
          console.log(`%c${prefix}`, 'color: blue;', message, cleanedContext)
        }
        break
      case 4: // DEBUG
      case 5: // TRACE
        console.debug(`%c${prefix}`, 'color: gray;', message, cleanedContext)
        break
    }
  }

  /**
   * Flush buffered logs (e.g., send to backend)
   */
  flush(): void {
    if (this.buffer.length === 0) {
      return
    }

    // TODO: Send to backend logging service
    // For now, just clear buffer
    this.buffer = []
  }

  /**
   * Get buffered logs
   */
  getBuffer(): Array<{
    level: LogLevel
    message: string
    context?: LogContext
  }> {
    return [...this.buffer]
  }

  /**
   * Clear buffer
   */
  clearBuffer(): void {
    this.buffer = []
  }
}
