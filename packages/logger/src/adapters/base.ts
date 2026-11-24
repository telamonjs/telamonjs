/**
 * Base logger implementation with common functionality
 */

import type {
  ILogger,
  LogContext,
  LogLevel,
  LogTimer,
  AuditAction,
  AuditContext,
} from '../core/types.js'
import { shouldLog } from '../core/levels.js'
import { mergeContext } from '../core/context.js'
import { Timer } from '../core/timer.js'

/**
 * Base logger with shared functionality
 */
export abstract class BaseLogger implements ILogger {
  protected level: LogLevel
  protected context: LogContext

  constructor(level: LogLevel, context: LogContext = {}) {
    this.level = level
    this.context = context
  }

  // ──────────────────────────────────────────────────────────────────────
  // Abstract methods (must be implemented by subclasses)
  // ──────────────────────────────────────────────────────────────────────

  protected abstract logMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): void

  // ──────────────────────────────────────────────────────────────────────
  // Standard levels
  // ──────────────────────────────────────────────────────────────────────

  debug(message: string, context?: LogContext): void {
    this.log(0x4 as LogLevel, message, context) // DEBUG = 4
  }

  info(message: string, context?: LogContext): void {
    this.log(0x3 as LogLevel, message, context) // INFO = 3
  }

  warn(message: string, context?: LogContext): void {
    this.log(0x2 as LogLevel, message, context) // WARN = 2
  }

  error(message: string, context?: LogContext): void {
    this.log(0x1 as LogLevel, message, context) // ERROR = 1
  }

  fatal(message: string, context?: LogContext): void {
    this.log(0x0 as LogLevel, message, context) // FATAL = 0
  }

  // ──────────────────────────────────────────────────────────────────────
  // TelamonJS extensions
  // ──────────────────────────────────────────────────────────────────────

  success(message: string, context?: LogContext): void {
    this.log(0x3 as LogLevel, `✓ ${message}`, { ...context, level: 'success' })
  }

  /**
   * Audit entries are compliance records, not diagnostics: they bypass the
   * level filter (a production `LOG_LEVEL=warn` must not drop the audit
   * trail) and are written at INFO severity. Only a disabled logger
   * (`NoOpLogger`) stays silent.
   */
  audit(action: AuditAction, context?: Omit<AuditContext, 'action'>): void {
    this.logMessage(
      0x3 as LogLevel,
      `[AUDIT] ${action}`,
      mergeContext(this.context, {
        ...context,
        auditAction: action,
        level: 'audit',
      })
    )
  }

  perf(label: string, durationMs: number, context?: LogContext): void {
    this.log(0x3 as LogLevel, `[PERF] ${label} (${durationMs}ms)`, {
      ...context,
      duration: durationMs,
      durationMs,
      level: 'perf',
    })
  }

  // ──────────────────────────────────────────────────────────────────────
  // Context management
  // ──────────────────────────────────────────────────────────────────────

  child(context: LogContext): ILogger {
    // Clone the instance: subclass constructors take a config object, so
    // re-constructing would drop the level and formatting options.
    const child: this = Object.assign(Object.create(Object.getPrototypeOf(this)), this)
    child.context = mergeContext(this.context, context)
    return child
  }

  withRequestId(requestId: string): ILogger {
    return this.child({ requestId, correlationId: requestId })
  }

  withUser(user: { id: string; email?: string; role?: string }): ILogger {
    return this.child({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
    })
  }

  // ──────────────────────────────────────────────────────────────────────
  // Timer utilities
  // ──────────────────────────────────────────────────────────────────────

  startTimer(label?: string): LogTimer {
    return new Timer(this, label)
  }

  // ──────────────────────────────────────────────────────────────────────
  // Configuration
  // ──────────────────────────────────────────────────────────────────────

  setLevel(level: LogLevel): void {
    this.level = level
  }

  getLevel(): LogLevel {
    return this.level
  }

  isLevelEnabled(level: LogLevel): boolean {
    return shouldLog(level, this.level)
  }

  // ──────────────────────────────────────────────────────────────────────
  // Internal helpers
  // ──────────────────────────────────────────────────────────────────────

  protected log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.isLevelEnabled(level)) {
      return
    }

    const mergedContext = mergeContext(this.context, context)
    this.logMessage(level, message, mergedContext)
  }
}
