/**
 * No-op logger (testing, silent mode)
 */

import type { ILogger, LogLevel, LogTimer } from '../core/types.js'

/**
 * No-op timer
 */
class NoOpTimer implements LogTimer {
  private startTime: number = Date.now()

  done(): void {
    // No-op
  }

  elapsed(): number {
    return Date.now() - this.startTime
  }

  getStartTime(): number {
    return this.startTime
  }
}

/**
 * No-op logger (does nothing, for testing or silent mode)
 */
export class NoOpLogger implements ILogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
  fatal(): void {}
  success(): void {}
  audit(): void {}
  perf(): void {}

  child(): ILogger {
    return this
  }

  withRequestId(): ILogger {
    return this
  }

  withUser(): ILogger {
    return this
  }

  startTimer(): LogTimer {
    return new NoOpTimer()
  }

  setLevel(): void {}

  getLevel(): LogLevel {
    return 3 // INFO
  }

  isLevelEnabled(): boolean {
    return false
  }
}
