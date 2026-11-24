/**
 * Unit tests for the logger factories and LoggerConfig.format
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createBrowserLogger,
  createLogger,
  createTestLogger,
  createWorkerLogger,
} from '../../../src/core/factory'
import { NoOpLogger } from '../../../src/adapters/noop'
import { createServerLogger } from '../../../src/integrations/next'
import { ConsoleLogger } from '../../../src/adapters/console'
import { PrettyLogger } from '../../../src/adapters/pretty'
import { LogLevel } from '../../../src/core/types'

describe('createLogger', () => {
  let log: ReturnType<typeof vi.spyOn>
  let error: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    log = vi.spyOn(console, 'log').mockImplementation(() => {})
    error = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('format', () => {
    it("defaults to text output ('simple')", () => {
      expect(createLogger()).toBeInstanceOf(ConsoleLogger)
      createLogger({ level: LogLevel.INFO, colorize: false }).info('hi')
      expect(() => JSON.parse(log.mock.calls[0][0] as string)).toThrow()
    })

    it("'pretty' returns a PrettyLogger", () => {
      expect(createLogger({ format: 'pretty' })).toBeInstanceOf(PrettyLogger)
    })

    it("'json' writes one JSON object per line", () => {
      const logger = createLogger({
        format: 'json',
        level: LogLevel.INFO,
        context: { service: 'api' },
      })
      logger.info('User created', { userId: '123' })

      const line = log.mock.calls[0][0] as string
      expect(line).not.toContain('\n')
      const entry = JSON.parse(line)
      expect(entry).toEqual({
        timestamp: expect.any(String),
        level: 'info',
        message: 'User created',
        context: { service: 'api', userId: '123' },
      })
      expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp)
    })

    it("'json' serializes errors and routes error levels to stderr", () => {
      createLogger({ format: 'json', level: LogLevel.INFO }).error('boom', {
        error: new Error('db down'),
      })
      expect(log).not.toHaveBeenCalled()
      const entry = JSON.parse(error.mock.calls[0][0] as string)
      expect(entry.level).toBe('error')
      expect(entry.context.error.message).toBe('db down')
    })

    it("'json' omits empty context and keeps child context", () => {
      const logger = createLogger({ format: 'json', level: LogLevel.INFO })
      logger.info('plain')
      expect(JSON.parse(log.mock.calls[0][0] as string)).not.toHaveProperty(
        'context'
      )
      logger.withRequestId('req-1').info('scoped')
      expect(JSON.parse(log.mock.calls[1][0] as string).context.requestId).toBe(
        'req-1'
      )
    })
  })

  it('returns a no-op logger when disabled', () => {
    createLogger({ enabled: false, format: 'json' }).error('x')
    expect(error).not.toHaveBeenCalled()
  })
})

describe('createLogger levels and variants', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('takes the level from the environment by default', () => {
    vi.stubEnv('LOG_LEVEL', 'warn')
    expect(createLogger().getLevel()).toBe(LogLevel.WARN)
  })

  it('accepts a level name', () => {
    expect(createLogger({ level: 'DEBUG' }).getLevel()).toBe(LogLevel.DEBUG)
  })

  it('filters by the configured level', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const logger = createLogger({ level: LogLevel.WARN, format: 'json' })
    logger.info('dropped')
    logger.audit('user.login')
    logger.warn('kept')

    expect(log).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('colorizes outside production only', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.stubEnv('NODE_ENV', 'production')
    createLogger({ level: LogLevel.INFO }).info('plain')
    vi.stubEnv('NODE_ENV', 'development')
    createLogger({ level: LogLevel.INFO }).info('colored')

    expect(log.mock.calls[0][0]).not.toContain('\x1b[')
    expect(log.mock.calls[1][0]).toContain('\x1b[')
  })

  it('createWorkerLogger never colorizes; createBrowserLogger does unless told otherwise', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    createWorkerLogger({ level: LogLevel.INFO }).info('worker')
    createBrowserLogger({ level: LogLevel.INFO }).info('browser')
    createBrowserLogger({ level: LogLevel.INFO, colorize: false }).info('browser-plain')

    expect(log.mock.calls[0][0]).not.toContain('\x1b[')
    expect(log.mock.calls[1][0]).toContain('\x1b[')
    expect(log.mock.calls[2][0]).not.toContain('\x1b[')
  })

  it('createTestLogger is silent whatever the config', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const logger = createTestLogger({ level: LogLevel.TRACE })
    expect(logger).toBeInstanceOf(NoOpLogger)
    logger.info('x')
    expect(log).not.toHaveBeenCalled()
  })
})

describe('createServerLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('emits JSON lines by default', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    createServerLogger({ level: LogLevel.INFO }).info('rendered')
    expect(JSON.parse(log.mock.calls[0][0] as string)).toMatchObject({
      level: 'info',
      message: 'rendered',
    })
  })

  it("can be switched back to text with format: 'simple'", () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    createServerLogger({ level: LogLevel.INFO, format: 'simple' }).info('x')
    expect(() => JSON.parse(log.mock.calls[0][0] as string)).toThrow()
  })
})
