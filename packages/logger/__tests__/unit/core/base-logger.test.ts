/**
 * BaseLogger behaviour shared by every adapter: level filtering, child
 * loggers, audit()/perf()/success() and timers. Exercised through a
 * recording subclass so the assertions see exactly what reaches the sink.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { BaseLogger } from '../../../src/adapters/base'
import { ConsoleLogger } from '../../../src/adapters/console'
import { PrettyLogger } from '../../../src/adapters/pretty'
import type { ILogger, LogContext } from '../../../src/core/types'
import { LogLevel } from '../../../src/core/types'

interface Entry {
  level: LogLevel
  message: string
  context?: LogContext
}

class RecordingLogger extends BaseLogger {
  constructor(
    level: LogLevel,
    context: LogContext = {},
    readonly entries: Entry[] = []
  ) {
    super(level, context)
  }

  protected logMessage(level: LogLevel, message: string, context?: LogContext): void {
    this.entries.push({ level, message, context })
  }
}

const recorder = (level = LogLevel.TRACE, context: LogContext = {}) =>
  new RecordingLogger(level, context)

describe('BaseLogger', () => {
  describe('Level filtering', () => {
    it('maps each method to its level', () => {
      const log = recorder()
      log.fatal('f')
      log.error('e')
      log.warn('w')
      log.info('i')
      log.debug('d')

      expect(log.entries.map(e => e.level)).toEqual([
        LogLevel.FATAL,
        LogLevel.ERROR,
        LogLevel.WARN,
        LogLevel.INFO,
        LogLevel.DEBUG,
      ])
    })

    it('drops everything less severe than the configured level', () => {
      const log = recorder(LogLevel.WARN)
      log.debug('d')
      log.info('i')
      log.success('s')
      log.perf('p', 1)
      log.warn('w')
      log.error('e')

      expect(log.entries.map(e => e.message)).toEqual(['w', 'e'])
    })

    it('setLevel changes the filter at runtime', () => {
      const log = recorder(LogLevel.ERROR)
      log.info('hidden')
      log.setLevel(LogLevel.INFO)
      log.info('shown')

      expect(log.getLevel()).toBe(LogLevel.INFO)
      expect(log.entries.map(e => e.message)).toEqual(['shown'])
      expect(log.isLevelEnabled(LogLevel.DEBUG)).toBe(false)
    })
  })

  describe('Child loggers', () => {
    it('merges the child context over the parent context', () => {
      const parent = recorder(LogLevel.INFO, { service: 'api', region: 'br' })
      parent.child({ region: 'us', requestId: 'r1' }).info('hi', { extra: 1 })

      expect(parent.entries[0].context).toEqual({
        service: 'api',
        region: 'us',
        requestId: 'r1',
        extra: 1,
      })
    })

    it('does not leak child context back into the parent', () => {
      const parent = recorder(LogLevel.INFO, { service: 'api' })
      parent.child({ requestId: 'r1' })
      parent.info('plain')

      expect(parent.entries[0].context).toEqual({ service: 'api' })
    })

    it('call-site context wins over the logger context', () => {
      const log = recorder(LogLevel.INFO, { userId: 'a' })
      log.info('x', { userId: 'b' })
      expect(log.entries[0].context?.userId).toBe('b')
    })

    it('inherits the level, but setLevel on a child stays on the child', () => {
      const parent = recorder(LogLevel.WARN)
      const child = parent.child({ c: 1 })
      expect(child.getLevel()).toBe(LogLevel.WARN)

      child.setLevel(LogLevel.DEBUG)
      expect(parent.getLevel()).toBe(LogLevel.WARN)
    })

    it('children of children accumulate context and stay real adapters', () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {})
      const root: ILogger = new ConsoleLogger({ level: LogLevel.INFO, format: 'json' })
      root.child({ a: 1 }).child({ b: 2 }).info('deep')

      expect(JSON.parse(log.mock.calls[0][0] as string).context).toEqual({ a: 1, b: 2 })
      log.mockRestore()
    })

    it('withRequestId sets requestId and correlationId; withUser the user fields', () => {
      const log = recorder(LogLevel.INFO)
      log.withRequestId('req-9').info('a')
      log.withUser({ id: 'u1', email: 'u@x.io', role: 'admin' }).info('b')

      expect(log.entries[0].context).toEqual({ requestId: 'req-9', correlationId: 'req-9' })
      expect(log.entries[1].context).toEqual({
        userId: 'u1',
        userEmail: 'u@x.io',
        userRole: 'admin',
      })
    })
  })

  describe('audit / perf / success', () => {
    it('audit() logs at INFO with the action tagged in the context', () => {
      const log = recorder(LogLevel.INFO, { service: 'api' })
      log.audit('user.deleted', { resource: 'user', resourceId: '42', compliance: ['LGPD'] })

      expect(log.entries[0]).toEqual({
        level: LogLevel.INFO,
        message: '[AUDIT] user.deleted',
        context: {
          service: 'api',
          resource: 'user',
          resourceId: '42',
          compliance: ['LGPD'],
          auditAction: 'user.deleted',
          level: 'audit',
        },
      })
    })

    // Audit entries are compliance records: the level filter is for
    // diagnostics and must not silently drop the audit trail.
    it('audit() is written whatever the level, with the logger context', () => {
      const log = recorder(LogLevel.FATAL, { service: 'api' })
      log.child({ requestId: 'r1' }).audit('permission.revoked', { resourceId: '7' })
      log.info('dropped')

      expect(log.entries).toEqual([
        {
          level: LogLevel.INFO,
          message: '[AUDIT] permission.revoked',
          context: {
            service: 'api',
            requestId: 'r1',
            resourceId: '7',
            auditAction: 'permission.revoked',
            level: 'audit',
          },
        },
      ])
    })

    it('perf() logs the label with the duration in the message and context', () => {
      const log = recorder(LogLevel.INFO)
      log.perf('db.query', 37, { table: 'users' })

      expect(log.entries[0]).toEqual({
        level: LogLevel.INFO,
        message: '[PERF] db.query (37ms)',
        context: { table: 'users', duration: 37, durationMs: 37, level: 'perf' },
      })
    })

    it('the tag cannot be overridden by the caller context', () => {
      const log = recorder(LogLevel.INFO)
      log.audit('x', { level: 'info' } as never)
      log.perf('y', 1, { duration: 999, level: 'info' })

      expect(log.entries[0].context?.level).toBe('audit')
      expect(log.entries[1].context).toMatchObject({ duration: 1, level: 'perf' })
    })

    it('success() prefixes the message and tags the context', () => {
      const log = recorder(LogLevel.INFO)
      log.success('Saved')
      expect(log.entries[0]).toMatchObject({
        level: LogLevel.INFO,
        message: '✓ Saved',
        context: { level: 'success' },
      })
    })
  })

  describe('Timers', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('done() reports the elapsed time through perf()', () => {
      vi.useFakeTimers({ now: 1_000 })
      const log = recorder(LogLevel.INFO)
      const timer = log.startTimer('import')

      vi.advanceTimersByTime(250)
      expect(timer.elapsed()).toBe(250)
      expect(timer.getStartTime()).toBe(1_000)
      timer.done(undefined, { rows: 10 })

      expect(log.entries[0]).toEqual({
        level: LogLevel.INFO,
        message: '[PERF] import (250ms)',
        context: { rows: 10, duration: 250, durationMs: 250, level: 'perf' },
      })
    })

    it('done(message) overrides the label; no label falls back to a default', () => {
      vi.useFakeTimers({ now: 0 })
      const log = recorder(LogLevel.INFO)
      log.startTimer('label').done('custom')
      log.startTimer().done()

      expect(log.entries.map(e => e.message)).toEqual([
        '[PERF] custom (0ms)',
        '[PERF] Timer completed (0ms)',
      ])
    })
  })
})

describe('adapters never throw on hard-to-serialize context', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const circular = () => {
    const node: Record<string, unknown> = { id: 1 }
    node.self = node
    return node
  }

  it.each([
    ['ConsoleLogger (simple)', () => new ConsoleLogger({ level: LogLevel.INFO, colorize: false })],
    ['ConsoleLogger (json)', () => new ConsoleLogger({ level: LogLevel.INFO, format: 'json' })],
    ['PrettyLogger', () => new PrettyLogger({ level: LogLevel.INFO, colorize: false })],
  ])('%s logs BigInt and circular values', (_name, make) => {
    const out = vi.spyOn(console, 'log').mockImplementation(() => {})
    const logger = make()

    expect(() => logger.info('big', { id: 12n })).not.toThrow()
    expect(() => logger.info('loop', { node: circular() })).not.toThrow()
    expect(out.mock.calls[0][0]).toContain('"12"')
    expect(out.mock.calls[1][0]).toContain('[Circular]')
  })

  it('PrettyLogger keeps the message of an Error in the context', () => {
    const out = vi.spyOn(console, 'log').mockImplementation(() => {})
    new PrettyLogger({ level: LogLevel.INFO, colorize: false }).error('failed', {
      error: new Error('db down'),
    })
    expect(out.mock.calls[0][0]).toContain('db down')
  })
})
