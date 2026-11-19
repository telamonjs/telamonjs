/**
 * Unit tests for BrowserLogger
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BrowserLogger } from '../../../src/adapters/browser'
import { LogLevel } from '../../../src/core/types'

describe('BrowserLogger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>
    error: ReturnType<typeof vi.spyOn>
    warn: ReturnType<typeof vi.spyOn>
    debug: ReturnType<typeof vi.spyOn>
  }

  beforeEach(() => {
    vi.useFakeTimers()
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('creates logger with default level (INFO)', () => {
      const logger = new BrowserLogger()
      expect(logger.getLevel()).toBe(LogLevel.INFO)
    })

    it('creates logger with custom level', () => {
      const logger = new BrowserLogger({ level: LogLevel.DEBUG })
      expect(logger.getLevel()).toBe(LogLevel.DEBUG)
    })

    it('creates logger with context', () => {
      const logger = new BrowserLogger({
        level: LogLevel.INFO,
        context: { service: 'test' },
      })
      logger.info('test message')
      expect(consoleSpy.log).toHaveBeenCalled()
    })
  })

  describe('Logging Methods', () => {
    it('logs debug message', () => {
      const logger = new BrowserLogger({ level: LogLevel.DEBUG })
      logger.debug('debug message')
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        '%c[DEBUG]',
        expect.any(String),
        'debug message',
        {}
      )
    })

    it('logs info message', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })
      logger.info('info message')
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '%c[INFO]',
        expect.any(String),
        'info message',
        {}
      )
    })

    it('logs warn message', () => {
      const logger = new BrowserLogger({ level: LogLevel.WARN })
      logger.warn('warn message')
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        '%c[WARN]',
        expect.any(String),
        'warn message',
        {}
      )
    })

    it('logs error message', () => {
      const logger = new BrowserLogger({ level: LogLevel.ERROR })
      logger.error('error message')
      expect(consoleSpy.error).toHaveBeenCalledWith(
        '%c[ERROR]',
        expect.any(String),
        'error message',
        {}
      )
    })

    it('logs fatal message', () => {
      const logger = new BrowserLogger({ level: LogLevel.FATAL })
      logger.fatal('fatal message')
      expect(consoleSpy.error).toHaveBeenCalledWith(
        '%c[FATAL]',
        expect.any(String),
        'fatal message',
        {}
      )
    })

    it('logs success message with checkmark', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })
      logger.success('success message')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('logs audit message', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })
      logger.audit('user.created', { action: 'user.created', userId: '123' })
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('logs perf message', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })
      logger.perf('operation', 123)
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('logs message with context', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })
      logger.info('test message', { userId: '123', action: 'test' })
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.any(String),
        'test message',
        expect.objectContaining({ userId: '123', action: 'test' })
      )
    })
  })

  describe('Level Filtering', () => {
    it('respects log level - filters debug when level is INFO', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })
      logger.debug('debug message')
      expect(consoleSpy.debug).not.toHaveBeenCalled()
    })

    it('respects log level - logs warn when level is INFO', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })
      logger.warn('warn message')
      expect(consoleSpy.warn).toHaveBeenCalled()
    })

    it('respects log level - logs error when level is INFO', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })
      logger.error('error message')
      expect(consoleSpy.error).toHaveBeenCalled()
    })

    it('isLevelEnabled returns correct value', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })
      expect(logger.isLevelEnabled(LogLevel.DEBUG)).toBe(false)
      expect(logger.isLevelEnabled(LogLevel.INFO)).toBe(true)
      expect(logger.isLevelEnabled(LogLevel.WARN)).toBe(true)
      expect(logger.isLevelEnabled(LogLevel.ERROR)).toBe(true)
      expect(logger.isLevelEnabled(LogLevel.FATAL)).toBe(true)
    })
  })

  describe('Context Management', () => {
    it('creates child logger with additional context', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })
      const child = logger.child({ userId: '123' })
      child.info('test message')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('withRequestId adds request ID to context', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })
      const childLogger = logger.withRequestId('req-123')
      childLogger.info('test message')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('withUser adds user to context', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })
      const childLogger = logger.withUser({
        id: 'user-123',
        email: 'test@example.com',
        role: 'admin',
      })
      childLogger.info('test message')
      expect(consoleSpy.log).toHaveBeenCalled()
    })
  })

  describe('Timers', () => {
    it('startTimer creates timer', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })
      const timer = logger.startTimer('test-op')
      expect(timer).toHaveProperty('done')
      expect(timer).toHaveProperty('elapsed')
      expect(timer).toHaveProperty('getStartTime')
    })

    it('timer.done logs duration', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })
      const timer = logger.startTimer('test-op')
      timer.done('operation completed')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('timer.elapsed returns duration without logging', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })
      const timer = logger.startTimer('test-op')
      const elapsed = timer.elapsed()
      expect(elapsed).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Buffer Management', () => {
    it('buffers logs', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })
      logger.info('message 1')
      logger.info('message 2')
      logger.info('message 3')

      const buffer = logger.getBuffer()
      expect(buffer).toHaveLength(3)
      expect(buffer[0]).toMatchObject({
        level: LogLevel.INFO,
        message: 'message 1',
      })
    })

    it('trims buffer when exceeding 100 items', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })

      // Log 101 messages
      for (let i = 0; i < 101; i++) {
        logger.info(`message ${i}`)
      }

      const buffer = logger.getBuffer()
      expect(buffer).toHaveLength(100)
      // First message should be shifted out
      expect(buffer[0].message).toBe('message 1')
    })

    it('flush clears buffer', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })
      logger.info('message 1')
      logger.info('message 2')

      expect(logger.getBuffer()).toHaveLength(2)

      logger.flush()

      expect(logger.getBuffer()).toHaveLength(0)
    })

    it('clearBuffer clears buffer', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })
      logger.info('message 1')
      logger.info('message 2')

      expect(logger.getBuffer()).toHaveLength(2)

      logger.clearBuffer()

      expect(logger.getBuffer()).toHaveLength(0)
    })

    it('getBuffer returns copy of buffer', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })
      logger.info('message 1')

      const buffer1 = logger.getBuffer()
      const buffer2 = logger.getBuffer()

      expect(buffer1).not.toBe(buffer2)
      expect(buffer1).toEqual(buffer2)
    })

    it('flush handles empty buffer', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })

      expect(() => logger.flush()).not.toThrow()
      expect(logger.getBuffer()).toHaveLength(0)
    })
  })

  describe('Console Styling', () => {
    it('uses styled console output for error', () => {
      const logger = new BrowserLogger({ level: LogLevel.ERROR })
      logger.error('error message')

      expect(consoleSpy.error).toHaveBeenCalledWith(
        '%c[ERROR]',
        expect.stringContaining('color'),
        'error message',
        {}
      )
    })

    it('uses styled console output for warn', () => {
      const logger = new BrowserLogger({ level: LogLevel.WARN })
      logger.warn('warn message')

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        '%c[WARN]',
        expect.stringContaining('color'),
        'warn message',
        {}
      )
    })

    it('uses styled console output for info', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })
      logger.info('info message')

      expect(consoleSpy.log).toHaveBeenCalledWith(
        '%c[INFO]',
        expect.stringContaining('color'),
        'info message',
        {}
      )
    })

    it('uses styled console output for success', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })
      logger.success('success message')

      // Success uses checkmark and green styling
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('✓'),
        expect.stringContaining('color'),
        expect.any(String),
        expect.any(Object)
      )
    })
  })

  describe('Edge Cases', () => {
    it('handles null context', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })
      logger.info('test message', undefined)
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('handles empty context', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })
      logger.info('test message', {})
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('handles error objects in context', () => {
      const logger = new BrowserLogger({ level: LogLevel.ERROR })
      const error = new Error('test error')
      logger.error('error occurred', { error })
      expect(consoleSpy.error).toHaveBeenCalled()
    })

    it('setLevel changes log level dynamically', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })
      logger.debug('debug 1')
      expect(consoleSpy.debug).not.toHaveBeenCalled()

      logger.setLevel(LogLevel.DEBUG)
      logger.debug('debug 2')
      expect(consoleSpy.debug).toHaveBeenCalled()
    })

    it('handles complex nested context', () => {
      const logger = new BrowserLogger({ level: LogLevel.INFO })
      logger.info('test message', {
        user: { id: '123', name: 'Test' },
        metadata: { action: 'test', nested: { value: 42 } },
      })
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'test message',
        expect.objectContaining({
          user: { id: '123', name: 'Test' },
          metadata: { action: 'test', nested: { value: 42 } },
        })
      )
    })
  })
})
