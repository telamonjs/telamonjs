/**
 * Browser logger (client-side)
 */

import { LogLevel, type LogContext, type LoggerConfig } from '../core/types.js'
import { LOG_LEVEL_NAMES_UPPER, parseLogLevel } from '../core/levels.js'
import { BaseLogger } from './base.js'
import { cleanContext } from '../core/context.js'

/** One log entry as the transport sends it. */
export interface BrowserLogEntry {
  level: LogLevel
  /** `'ERROR'`, `'WARN'`, … */
  levelName: string
  message: string
  /** ISO 8601 */
  timestamp: string
  /** The logger context, without PII keys unless `includePii` is set. */
  context: LogContext
}

/**
 * Opt-in shipping of browser logs to your backend, in batches. Give an
 * `endpoint` (receives `POST { logs: BrowserLogEntry[] }` as JSON; a same-origin
 * route is simplest) or a `send` function.
 */
export interface BrowserLogTransport {
  endpoint?: string
  /** Receives each batch instead of the built-in `fetch`/`sendBeacon`. */
  send?: (logs: BrowserLogEntry[]) => void | Promise<void>
  /** Least severe level shipped (default `LogLevel.WARN`). The console still follows the logger level. */
  level?: LogLevel
  /** Ship as soon as this many entries are queued (default 20). */
  batchSize?: number
  /** Ship what is queued every N ms (default 5000). */
  flushIntervalMs?: number
  /**
   * Keep context keys that usually hold personal data (`userEmail`, `ip`,
   * `userAgent`, tokens, passwords, cookies, phone, CPF…). Default `false`:
   * they are dropped at any depth. Messages are sent as written.
   */
  includePii?: boolean
}

export interface BrowserLoggerConfig extends LoggerConfig {
  transport?: BrowserLogTransport
}

/** Context keys dropped before shipping unless `includePii` is set. */
const PII_KEY =
  /e-?mail|password|passwd|secret|token|authorization|cookie|session|^ip$|useragent|phone|cpf|cnpj|ssn/i

/** Queue + delivery shared by a logger and its children. */
class LogShipper {
  private queue: BrowserLogEntry[] = []
  private readonly level: LogLevel
  private readonly batchSize: number

  constructor(private readonly transport: BrowserLogTransport) {
    this.level = transport.level ?? LogLevel.WARN
    this.batchSize = transport.batchSize ?? 20
    setInterval(() => this.flush(), transport.flushIntervalMs ?? 5000)
    // Last chance before the tab is hidden or closed: beacons survive unload
    const onHide = () => this.flush(true)
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') onHide()
    })
  }

  push(level: LogLevel, message: string, context: LogContext): void {
    if (level > this.level) return
    const safe = JSON.stringify(cleanContext(context), (key, value: unknown) =>
      !this.transport.includePii && PII_KEY.test(key) ? undefined : value
    )
    this.queue.push({
      level,
      levelName: LOG_LEVEL_NAMES_UPPER[level],
      message,
      timestamp: new Date().toISOString(),
      context: JSON.parse(safe) as LogContext,
    })
    if (this.queue.length >= this.batchSize) this.flush()
  }

  /** Sends the queue; failures are dropped (a logger must not throw or loop). */
  flush(beacon = false): void {
    const logs = this.queue.splice(0)
    if (logs.length === 0) return
    const { send, endpoint } = this.transport
    try {
      if (send) {
        void Promise.resolve(send(logs)).catch(() => {})
        return
      }
      if (!endpoint) return
      const body = JSON.stringify({ logs })
      if (
        beacon &&
        navigator.sendBeacon?.(endpoint, new Blob([body], { type: 'application/json' }))
      ) {
        return
      }
      void fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    } catch {
      // ponytail: no retry — a dropped batch beats a logger that grows or throws
    }
  }
}

/**
 * Browser logger (client-side with DevTools integration). Pass `transport` to
 * also ship logs to your backend.
 */
export class BrowserLogger extends BaseLogger {
  private buffer: Array<{
    level: LogLevel
    message: string
    context?: LogContext
  }> = []
  private bufferSize: number = 100
  private readonly shipper?: LogShipper

  constructor(config?: BrowserLoggerConfig) {
    const { level = 3, context = {}, transport } = config || {}
    super(parseLogLevel(level), context)

    // Browser only: nothing to ship (or listen to) during SSR
    if (transport && typeof window !== 'undefined') {
      this.shipper = new LogShipper(transport)
    }
  }

  protected logMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): void {
    // Recent history, for getBuffer()
    this.buffer.push({ level, message, context })

    // Trim buffer if too large
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift()
    }

    this.shipper?.push(level, message, context ?? {})

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
   * Ship queued logs now (when a `transport` is set) and clear the buffer.
   */
  flush(): void {
    this.shipper?.flush()
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
