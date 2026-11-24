/**
 * @telamonjs/logger
 *
 * Professional logging system for telamonjs
 *
 * @example
 * ```ts
 * import { logger } from '@telamonjs/logger'
 *
 * logger.info('User created', { userId: '123' })
 * logger.error('Payment failed', { orderId: '456', error: err.message })
 *
 * const timer = logger.startTimer()
 * await doWork()
 * timer.done('Work completed')
 * ```
 *
 * @packageDocumentation
 */

// ──────────────────────────────────────────────────────────────────────────
// Core
// ──────────────────────────────────────────────────────────────────────────
export {
  LogLevel,
  type ILogger,
  type LogContext,
  type LogTimer,
  type AuditAction,
  type AuditContext,
  type LoggerConfig,
} from './core/types.js'

export {
  createLogger,
  createBrowserLogger,
  createWorkerLogger,
  createTestLogger,
  logger,
} from './core/factory.js'

// ──────────────────────────────────────────────────────────────────────────
// Adapters (browser-safe)
// ──────────────────────────────────────────────────────────────────────────
export { BaseLogger } from './adapters/base.js'
export { ConsoleLogger } from './adapters/console.js'
export { NoOpLogger } from './adapters/noop.js'
export { PrettyLogger } from './adapters/pretty.js'
export {
  BrowserLogger,
  type BrowserLoggerConfig,
  type BrowserLogTransport,
  type BrowserLogEntry,
} from './adapters/browser.js'

// ──────────────────────────────────────────────────────────────────────────
// Integrations
// ──────────────────────────────────────────────────────────────────────────
export { createServerLogger } from './integrations/next.js'
