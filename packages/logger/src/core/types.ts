/**
 * Core types for @telamonjs/logger
 *
 * @module core/types
 */

/**
 * Log levels (RFC 5424)
 */
export enum LogLevel {
  FATAL = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
  TRACE = 5,
}

/**
 * Log context - Metadata attached to log entries
 */
export interface LogContext {
  // User context
  userId?: string
  userEmail?: string
  userRole?: string

  // Request context
  requestId?: string
  correlationId?: string
  sessionId?: string

  // Application context
  route?: string
  method?: string
  statusCode?: number
  userAgent?: string
  ip?: string

  // Technical context
  component?: string
  module?: string
  function?: string
  line?: number

  // Error context
  error?: Error | string
  errorType?: string
  stackTrace?: string

  // Performance context
  duration?: number
  durationMs?: number

  // Custom metadata
  [key: string]: unknown
}

/**
 * Audit actions
 */
export type AuditAction =
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.login'
  | 'user.logout'
  | 'permission.granted'
  | 'permission.revoked'
  | 'data.exported'
  | 'data.deleted'
  | 'settings.changed'
  | string // Allow custom actions

/**
 * Audit context - Extended context for audit logs
 */
export interface AuditContext extends LogContext {
  action: AuditAction
  resource?: string
  resourceId?: string
  changes?: Record<string, { before: unknown; after: unknown }>
  reason?: string
  compliance?: string[] // e.g., ['GDPR', 'LGPD', 'SOC2']
}

/**
 * Timer for performance tracking
 */
export interface LogTimer {
  /**
   * Finish timer and log duration
   */
  done(message?: string, context?: LogContext): void

  /**
   * Get elapsed time without logging
   */
  elapsed(): number

  /**
   * Get start time
   */
  getStartTime(): number
}

/**
 * Logger interface - Single abstraction for all contexts
 *
 * @example
 * ```ts
 * const logger = createLogger()
 * logger.info('User created', { userId: '123' })
 * ```
 */
export interface ILogger {
  // ──────────────────────────────────────────────────────────────────────
  // Standard levels (RFC 5424)
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Debug-level message (verbose, development only)
   */
  debug(message: string, context?: LogContext): void

  /**
   * Info-level message (general information)
   */
  info(message: string, context?: LogContext): void

  /**
   * Warning-level message (potential issues)
   */
  warn(message: string, context?: LogContext): void

  /**
   * Error-level message (errors that need attention)
   */
  error(message: string, context?: LogContext): void

  /**
   * Fatal-level message (critical errors, app crashes)
   */
  fatal(message: string, context?: LogContext): void

  // ──────────────────────────────────────────────────────────────────────
  // TelamonJS Extensions (DX improvements)
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Success message (positive feedback, green in terminal)
   * @telamonjs Extension for better DX
   */
  success(message: string, context?: LogContext): void

  /**
   * Audit log (compliance, security events)
   * @telamonjs Extension for audit trails
   */
  audit(action: AuditAction, context?: Omit<AuditContext, 'action'>): void

  /**
   * Performance metric (duration tracking)
   * @telamonjs Extension for performance monitoring
   */
  perf(label: string, durationMs: number, context?: LogContext): void

  // ──────────────────────────────────────────────────────────────────────
  // Context Management
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Create child logger with additional context
   * @example logger.child({ userId: '123' })
   */
  child(context: LogContext): ILogger

  /**
   * Create logger with request correlation ID
   * @example logger.withRequestId(req.headers['x-request-id'])
   */
  withRequestId(requestId: string): ILogger

  /**
   * Create logger with user context
   * @example logger.withUser(user)
   */
  withUser(user: { id: string; email?: string; role?: string }): ILogger

  // ──────────────────────────────────────────────────────────────────────
  // Timer Utilities (Performance Tracking)
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Start a timer for duration tracking
   * @returns Timer object with done() method
   *
   * @example
   * const timer = logger.startTimer()
   * await doWork()
   * timer.done('Work completed')  // Logs: "Work completed (1234ms)"
   */
  startTimer(label?: string): LogTimer

  // ──────────────────────────────────────────────────────────────────────
  // Configuration
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void

  /**
   * Get current log level
   */
  getLevel(): LogLevel

  /**
   * Check if level is enabled
   */
  isLevelEnabled(level: LogLevel): boolean
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level?: LogLevel | keyof typeof LogLevel
  enabled?: boolean
  context?: LogContext
  format?: 'json' | 'pretty' | 'simple'
  colorize?: boolean
  showTimestamps?: boolean
  showLevel?: boolean
  showContext?: boolean
  maxContextDepth?: number
}
