/**
 * Performance timer implementation
 */

import type { ILogger, LogContext, LogTimer } from './types.js'

/**
 * Timer implementation
 */
export class Timer implements LogTimer {
  private startTime: number
  private label?: string
  private logger: ILogger

  constructor(logger: ILogger, label?: string) {
    this.logger = logger
    this.label = label
    this.startTime = Date.now()
  }

  done(message?: string, context?: LogContext): void {
    const durationMs = this.elapsed()
    const finalMessage = message || this.label || 'Timer completed'

    this.logger.perf(finalMessage, durationMs, {
      ...context,
      duration: durationMs,
      durationMs,
    })
  }

  elapsed(): number {
    return Date.now() - this.startTime
  }

  getStartTime(): number {
    return this.startTime
  }
}
