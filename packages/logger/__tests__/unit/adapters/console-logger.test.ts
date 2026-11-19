/**
 * Unit tests for ConsoleLogger
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ConsoleLogger } from '../../../src/adapters/console'
import { LogLevel } from '../../../src/core/types'

describe('ConsoleLogger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>
    error: ReturnType<typeof vi.spyOn>
    warn: ReturnType<typeof vi.spyOn>
  }

  beforeEach(() => {
    // Spy on console methods
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    }
  })

  afterEach(() => {
    // Restore mocks
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('creates logger with default level (INFO)', () => {
      const logger = new ConsoleLogger()
      expect(logger.getLevel()).toBe(LogLevel.INFO)
    })

    it('creates logger with custom level', () => {
      const logger = new ConsoleLogger({ level: LogLevel.DEBUG })
      expect(logger.getLevel()).toBe(LogLevel.DEBUG)
    })

    it('creates logger with context', () => {
      const logger = new ConsoleLogger({
        level: LogLevel.INFO,
        context: { service: 'test' },
      })
      logger.info('test message')
      expect(consoleSpy.log).toHaveBeenCalled()
    })
  })

  describe('Logging Methods', () => {
    it('logs debug message', () => {
      const logger = new ConsoleLogger({ level: LogLevel.DEBUG })
      logger.debug('debug message')
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('debug message')
      )
    })

    it('logs info message', () => {
      const logger = new ConsoleLogger({ level: LogLevel.INFO })
      logger.info('info message')
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('info message')
      )
    })

    it('logs warn message', () => {
      const logger = new ConsoleLogger({ level: LogLevel.WARN })
      logger.warn('warn message')
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('warn message')
      )
    })

    it('logs error message', () => {
      const logger = new ConsoleLogger({ level: LogLevel.ERROR })
      logger.error('error message')
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('error message')
      )
    })

    it('logs fatal message', () => {
      const logger = new ConsoleLogger({ level: LogLevel.FATAL })
      logger.fatal('fatal message')
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('fatal message')
      )
    })

    it('logs success message', () => {
      const logger = new ConsoleLogger({ level: LogLevel.INFO })
      logger.success('success message')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('logs audit message', () => {
      const logger = new ConsoleLogger({ level: LogLevel.INFO })
      logger.audit('user.created', { action: 'user.created', userId: '123' })
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('user.created')
      )
    })

    it('logs perf message', () => {
      const logger = new ConsoleLogger({ level: LogLevel.INFO })
      logger.perf('operation', 123)
      expect(consoleSpy.log).toHaveBeenCalled()
    })
  })

  describe('Level Filtering', () => {
    it('respects log level - filters debug when level is INFO', () => {
      const logger = new ConsoleLogger({ level: LogLevel.INFO })
      logger.debug('debug message')
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })

    it('respects log level - logs warn when level is INFO', () => {
      const logger = new ConsoleLogger({ level: LogLevel.INFO })
      logger.warn('warn message')
      expect(consoleSpy.warn).toHaveBeenCalled()
    })

    it('respects log level - logs error when level is INFO', () => {
      const logger = new ConsoleLogger({ level: LogLevel.INFO })
      logger.error('error message')
      expect(consoleSpy.error).toHaveBeenCalled()
    })

    it('isLevelEnabled returns correct value', () => {
      const logger = new ConsoleLogger({ level: LogLevel.INFO })
      expect(logger.isLevelEnabled(LogLevel.DEBUG)).toBe(false)
      expect(logger.isLevelEnabled(LogLevel.INFO)).toBe(true)
      expect(logger.isLevelEnabled(LogLevel.WARN)).toBe(true)
      expect(logger.isLevelEnabled(LogLevel.ERROR)).toBe(true)
      expect(logger.isLevelEnabled(LogLevel.FATAL)).toBe(true)
    })
  })

  describe('Context Management', () => {
    it('creates child logger with additional context', () => {
      const logger = new ConsoleLogger({ level: LogLevel.INFO })
      const child = logger.child({ userId: '123' })
      child.info('test message')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('withRequestId adds request ID to context', () => {
      const logger = new ConsoleLogger({ level: LogLevel.INFO })
      const childLogger = logger.withRequestId('req-123')
      childLogger.info('test message')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('child keeps the parent level and carries the merged context', () => {
      const logger = new ConsoleLogger({ level: LogLevel.DEBUG, context: { app: 'jobs' } })
      logger.child({ userId: '123' }).debug('child debug')
      expect(consoleSpy.log).toHaveBeenCalled()
      const printed = consoleSpy.log.mock.calls.flat().map(String).join(' ')
      expect(printed).toContain('userId')
      expect(printed).toContain('app')
    })

    it('withUser adds user to context', () => {
      const logger = new ConsoleLogger({ level: LogLevel.INFO })
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
      const logger = new ConsoleLogger({ level: LogLevel.INFO })
      const timer = logger.startTimer('test-op')
      expect(timer).toHaveProperty('done')
      expect(timer).toHaveProperty('elapsed')
      expect(timer).toHaveProperty('getStartTime')
    })

    it('timer.done logs duration', () => {
      const logger = new ConsoleLogger({ level: LogLevel.INFO })
      const timer = logger.startTimer('test-op')
      timer.done('operation completed')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('timer.elapsed returns duration without logging', () => {
      const logger = new ConsoleLogger({ level: LogLevel.INFO })
      const timer = logger.startTimer('test-op')
      const elapsed = timer.elapsed()
      expect(elapsed).toBeGreaterThanOrEqual(0)
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('handles null context', () => {
      const logger = new ConsoleLogger({ level: LogLevel.INFO })
      logger.info('test message', undefined)
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('handles empty context', () => {
      const logger = new ConsoleLogger({ level: LogLevel.INFO })
      logger.info('test message', {})
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('handles error objects in context', () => {
      const logger = new ConsoleLogger({ level: LogLevel.ERROR })
      const error = new Error('test error')
      logger.error('error occurred', { error })
      expect(consoleSpy.error).toHaveBeenCalled()
    })

    it('setLevel changes log level dynamically', () => {
      const logger = new ConsoleLogger({ level: LogLevel.INFO })
      logger.debug('debug 1')
      expect(consoleSpy.log).not.toHaveBeenCalled()

      logger.setLevel(LogLevel.DEBUG)
      logger.debug('debug 2')
      expect(consoleSpy.log).toHaveBeenCalled()
    })
  })
})
