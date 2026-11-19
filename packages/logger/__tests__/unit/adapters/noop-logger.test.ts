/**
 * Unit tests for NoOpLogger
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NoOpLogger } from '../../../src/adapters/noop'
import { LogLevel } from '../../../src/core/types'

describe('NoOpLogger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>
    error: ReturnType<typeof vi.spyOn>
    warn: ReturnType<typeof vi.spyOn>
  }

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('creates logger', () => {
      const logger = new NoOpLogger()
      expect(logger).toBeDefined()
    })
  })

  describe('Silent Logging', () => {
    it('debug does not log', () => {
      const logger = new NoOpLogger()
      logger.debug('debug message')
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })

    it('info does not log', () => {
      const logger = new NoOpLogger()
      logger.info('info message')
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })

    it('warn does not log', () => {
      const logger = new NoOpLogger()
      logger.warn('warn message')
      expect(consoleSpy.warn).not.toHaveBeenCalled()
    })

    it('error does not log', () => {
      const logger = new NoOpLogger()
      logger.error('error message')
      expect(consoleSpy.error).not.toHaveBeenCalled()
    })

    it('fatal does not log', () => {
      const logger = new NoOpLogger()
      logger.fatal('fatal message')
      expect(consoleSpy.error).not.toHaveBeenCalled()
    })

    it('success does not log', () => {
      const logger = new NoOpLogger()
      logger.success('success message')
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })

    it('audit does not log', () => {
      const logger = new NoOpLogger()
      logger.audit('user.created', { action: 'user.created' })
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })

    it('perf does not log', () => {
      const logger = new NoOpLogger()
      logger.perf('operation', 123)
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })
  })

  describe('Context Management', () => {
    it('child returns same instance', () => {
      const logger = new NoOpLogger()
      const child = logger.child({ userId: '123' })
      expect(child).toBe(logger)
    })

    it('withRequestId returns same instance', () => {
      const logger = new NoOpLogger()
      const childLogger = logger.withRequestId('req-123')
      expect(childLogger).toBe(logger)
    })

    it('withUser returns same instance', () => {
      const logger = new NoOpLogger()
      const childLogger = logger.withUser({ id: 'user-123' })
      expect(childLogger).toBe(logger)
    })
  })

  describe('Timers', () => {
    it('startTimer returns no-op timer', () => {
      const logger = new NoOpLogger()
      const timer = logger.startTimer('test-op')
      expect(timer).toHaveProperty('done')
      expect(timer).toHaveProperty('elapsed')
      expect(timer).toHaveProperty('getStartTime')
    })

    it('timer.done does not log', () => {
      const logger = new NoOpLogger()
      const timer = logger.startTimer('test-op')
      timer.done('completed')
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })

    it('timer.elapsed returns duration', () => {
      const logger = new NoOpLogger()
      const timer = logger.startTimer('test-op')
      const elapsed = timer.elapsed()
      expect(elapsed).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Level Management', () => {
    it('getLevel returns INFO', () => {
      const logger = new NoOpLogger()
      expect(logger.getLevel()).toBe(LogLevel.INFO)
    })

    it('setLevel does nothing', () => {
      const logger = new NoOpLogger()
      logger.setLevel(LogLevel.DEBUG)
      expect(logger.getLevel()).toBe(LogLevel.INFO)
    })

    it('isLevelEnabled always returns false', () => {
      const logger = new NoOpLogger()
      expect(logger.isLevelEnabled(LogLevel.FATAL)).toBe(false)
      expect(logger.isLevelEnabled(LogLevel.ERROR)).toBe(false)
      expect(logger.isLevelEnabled(LogLevel.WARN)).toBe(false)
      expect(logger.isLevelEnabled(LogLevel.INFO)).toBe(false)
      expect(logger.isLevelEnabled(LogLevel.DEBUG)).toBe(false)
    })
  })
})
