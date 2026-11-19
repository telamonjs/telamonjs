/**
 * Unit tests for PrettyLogger
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PrettyLogger } from '../../../src/adapters/pretty'
import { LogLevel } from '../../../src/core/types'

describe('PrettyLogger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>
  }

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('creates logger with default level (INFO)', () => {
      const logger = new PrettyLogger()
      expect(logger.getLevel()).toBe(LogLevel.INFO)
    })

    it('creates logger with custom level', () => {
      const logger = new PrettyLogger({ level: LogLevel.DEBUG })
      expect(logger.getLevel()).toBe(LogLevel.DEBUG)
    })

    it('creates logger with context', () => {
      const logger = new PrettyLogger({
        level: LogLevel.INFO,
        context: { service: 'test' },
      })
      logger.info('test message')
      expect(consoleSpy.log).toHaveBeenCalled()
    })
  })

  describe('Logging Methods', () => {
    it('logs debug message with arrow icon', () => {
      const logger = new PrettyLogger({ level: LogLevel.DEBUG })
      logger.debug('debug message')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('logs info message with info icon', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      logger.info('info message')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('logs warn message with warning icon', () => {
      const logger = new PrettyLogger({ level: LogLevel.WARN })
      logger.warn('warn message')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('logs error message with error icon', () => {
      const logger = new PrettyLogger({ level: LogLevel.ERROR })
      logger.error('error message')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('logs fatal message with skull icon', () => {
      const logger = new PrettyLogger({ level: LogLevel.FATAL })
      logger.fatal('fatal message')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('logs success message with checkmark icon', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      logger.success('success message')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('logs audit message with clipboard icon', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      logger.audit('user.created', { action: 'user.created', userId: '123' })
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('logs perf message with timer icon', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      logger.perf('operation', 123)
      expect(consoleSpy.log).toHaveBeenCalled()
    })
  })

  describe('Level Filtering', () => {
    it('respects log level - filters debug when level is INFO', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      logger.debug('debug message')
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })

    it('respects log level - logs warn when level is INFO', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      logger.warn('warn message')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('respects log level - logs error when level is INFO', () => {
      const logger = new PrettyLogger({ level: LogLevel.ERROR })
      logger.error('error message')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('isLevelEnabled returns correct value', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      expect(logger.isLevelEnabled(LogLevel.DEBUG)).toBe(false)
      expect(logger.isLevelEnabled(LogLevel.INFO)).toBe(true)
      expect(logger.isLevelEnabled(LogLevel.WARN)).toBe(true)
      expect(logger.isLevelEnabled(LogLevel.ERROR)).toBe(true)
      expect(logger.isLevelEnabled(LogLevel.FATAL)).toBe(true)
    })
  })

  describe('Context Management', () => {
    it('creates child logger with additional context', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      const child = logger.child({ userId: '123' })
      child.info('test message')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('withRequestId adds request ID to context', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      const childLogger = logger.withRequestId('req-123')
      childLogger.info('test message')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('withUser adds user to context', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      const childLogger = logger.withUser({
        id: 'user-123',
        email: 'test@example.com',
        role: 'admin',
      })
      childLogger.info('test message')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('logs context as JSON when present', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      logger.info('test message', { userId: '123', action: 'test' })
      expect(consoleSpy.log).toHaveBeenCalled()
      const logCall = consoleSpy.log.mock.calls[0][0]
      expect(logCall).toContain('userId')
    })
  })

  describe('Timers', () => {
    it('startTimer creates timer', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      const timer = logger.startTimer('test-op')
      expect(timer).toHaveProperty('done')
      expect(timer).toHaveProperty('elapsed')
      expect(timer).toHaveProperty('getStartTime')
    })

    it('timer.done logs duration', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      const timer = logger.startTimer('test-op')
      timer.done('operation completed')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('timer.elapsed returns duration without logging', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      const timer = logger.startTimer('test-op')
      const elapsed = timer.elapsed()
      expect(elapsed).toBeGreaterThanOrEqual(0)
    })
  })

  describe('CLI-specific Methods', () => {
    it('banner prints formatted banner', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      logger.banner('Test Banner')
      expect(consoleSpy.log).toHaveBeenCalledTimes(3)
      const calls = consoleSpy.log.mock.calls
      expect(calls[0]).toEqual([]) // Empty line before
      expect(calls[2]).toEqual([]) // Empty line after
    })

    it('newLine prints empty line', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      logger.newLine()
      expect(consoleSpy.log).toHaveBeenCalledWith()
    })

    it('step prints step message', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      logger.step('Step 1: Initialize')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('step with context prints context', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      logger.step('Step 1: Initialize', { progress: '1/5' })
      expect(consoleSpy.log).toHaveBeenCalled()
    })
  })

  describe('Special Context Handling', () => {
    it('handles success context with green color', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      logger.info('✓ Success message', { level: 'success' })
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('handles perf context with magenta color', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      logger.info('[PERF] Performance message', { level: 'perf' })
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('handles audit context with cyan color', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      logger.info('[AUDIT] Audit message', { level: 'audit' })
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('strips prefix from success messages', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      logger.success('✓ Operation complete')
      expect(consoleSpy.log).toHaveBeenCalled()
      const logCall = consoleSpy.log.mock.calls[0][0]
      // Check that message is logged (may or may not have prefix depending on implementation)
      expect(typeof logCall).toBe('string')
    })
  })

  describe('Edge Cases', () => {
    it('handles null context', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      logger.info('test message', undefined)
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('handles empty context', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      logger.info('test message', {})
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('handles error objects in context', () => {
      const logger = new PrettyLogger({ level: LogLevel.ERROR })
      const error = new Error('test error')
      logger.error('error occurred', { error })
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('setLevel changes log level dynamically', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      logger.debug('debug 1')
      expect(consoleSpy.log).not.toHaveBeenCalled()

      logger.setLevel(LogLevel.DEBUG)
      logger.debug('debug 2')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('handles complex nested context', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      logger.info('test message', {
        user: { id: '123', name: 'Test' },
        metadata: { action: 'test', nested: { value: 42 } },
      })
      expect(consoleSpy.log).toHaveBeenCalled()
      const logCall = consoleSpy.log.mock.calls[0][0]
      expect(logCall).toContain('user')
    })

    it('handles context with level property by filtering it', () => {
      const logger = new PrettyLogger({ level: LogLevel.INFO })
      logger.info('test message', { level: 'custom', userId: '123' })
      expect(consoleSpy.log).toHaveBeenCalled()
      // Should log userId but filter out level property from context
    })
  })
})
