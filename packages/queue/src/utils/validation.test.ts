import { describe, it, expect } from 'vitest'
import {
  validateQueueConfig,
  validateWorkerConfig,
  validateJobOptions,
  validateJobName,
  formatValidationError,
} from './validation'
import { ZodError } from 'zod'

describe('Validation', () => {
  describe('QueueConfig', () => {
    it('should validate valid queue config', () => {
      const config = {
        redis: {
          host: 'localhost',
          port: 6379,
        },
      }

      expect(() => validateQueueConfig(config)).not.toThrow()
    })

    it('should apply defaults', () => {
      const config = {
        redis: {},
      }

      const validated = validateQueueConfig(config)

      expect(validated.prefix).toBe('telamonjs')
      expect(validated.enableMetrics).toBe(false)
    })

    it('should validate nested redis config', () => {
      const config = {
        redis: {
          port: 99999, // Invalid
        },
      }

      expect(() => validateQueueConfig(config)).toThrow(ZodError)
    })

    it('should accept custom prefix', () => {
      const config = {
        redis: {},
        prefix: 'my-queue',
      }

      const validated = validateQueueConfig(config)
      expect(validated.prefix).toBe('my-queue')
    })

    it('should reject prefix too long', () => {
      const config = {
        redis: {},
        prefix: 'a'.repeat(51), // Max is 50
      }

      expect(() => validateQueueConfig(config)).toThrow(ZodError)
    })

    it('should preserve enableDLQ: false instead of stripping it (bug fixed in 3.2.0)', () => {
      const config = { redis: {}, enableDLQ: false }

      const validated = validateQueueConfig(config)

      expect(validated.enableDLQ).toBe(false)
    })

    it('should leave enableDLQ undefined when absent, not defaulted to true', () => {
      const validated = validateQueueConfig({ redis: {} })

      expect(validated.enableDLQ).toBeUndefined()
    })

    it('should preserve enableDLQ: true when explicit', () => {
      const validated = validateQueueConfig({ redis: {}, enableDLQ: true })

      expect(validated.enableDLQ).toBe(true)
    })
  })

  describe('WorkerConfig', () => {
    it('should validate valid worker config', () => {
      const config = {
        concurrency: 10,
        limiter: {
          max: 100,
          duration: 1000,
        },
      }

      expect(() => validateWorkerConfig(config)).not.toThrow()
    })

    it('should apply defaults', () => {
      const config = {}
      const validated = validateWorkerConfig(config)

      expect(validated.concurrency).toBe(5)
      expect(validated.autoRun).toBe(true)
      expect(validated.metrics).toBe(false)
    })

    it('should reject concurrency out of range', () => {
      expect(() => validateWorkerConfig({ concurrency: 0 })).toThrow(ZodError)
      expect(() => validateWorkerConfig({ concurrency: 101 })).toThrow(ZodError)
    })

    it('should validate limiter', () => {
      const config = {
        limiter: {
          max: -1, // Invalid
          duration: 1000,
        },
      }

      expect(() => validateWorkerConfig(config)).toThrow(ZodError)
    })
  })

  describe('JobOptions', () => {
    it('should validate valid job options', () => {
      const options = {
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 1000 },
        priority: 5,
        timeout: 30000,
      }

      expect(() => validateJobOptions(options)).not.toThrow()
    })

    it('should apply defaults', () => {
      const options = {}
      const validated = validateJobOptions(options)

      expect(validated.attempts).toBe(3)
    })

    it('should accept numeric backoff', () => {
      const options = {
        backoff: 2000,
      }

      expect(() => validateJobOptions(options)).not.toThrow()
    })

    it('should accept backoff object', () => {
      const options = {
        backoff: {
          type: 'fixed' as const,
          delay: 1000,
        },
      }

      expect(() => validateJobOptions(options)).not.toThrow()
    })

    /**
     * Regression: up to 3.2.0 the validator only accepted boolean|number, but
     * `JobOptions.removeOnComplete` always declared `boolean | number | KeepJobs`.
     * TypeScript compiled and `add()` blew up at runtime -- that's how a
     * consumer's queue stopped in production without a single test going red.
     */
    it('should accept KeepJobs object on removeOnComplete (count + age)', () => {
      expect(() =>
        validateJobOptions({ removeOnComplete: { count: 10000, age: 86400 } })
      ).not.toThrow()
    })

    it('should accept KeepJobs object on removeOnFail (age only)', () => {
      expect(() =>
        validateJobOptions({ removeOnFail: { age: 7 * 24 * 3600 } })
      ).not.toThrow()
    })

    it('should still accept boolean and number forms', () => {
      expect(() => validateJobOptions({ removeOnComplete: true })).not.toThrow()
      expect(() => validateJobOptions({ removeOnComplete: 100 })).not.toThrow()
      expect(() => validateJobOptions({ removeOnFail: false })).not.toThrow()
    })

    it('should reject unknown keys inside KeepJobs', () => {
      expect(() =>
        validateJobOptions({ removeOnComplete: { cont: 10 } })
      ).toThrow(ZodError)
    })

    it('should reject attempts out of range', () => {
      expect(() => validateJobOptions({ attempts: 0 })).toThrow(ZodError)
      expect(() => validateJobOptions({ attempts: 101 })).toThrow(ZodError)
    })

    it('should reject priority out of range', () => {
      expect(() => validateJobOptions({ priority: 0 })).toThrow(ZodError)
      expect(() => validateJobOptions({ priority: 11 })).toThrow(ZodError)
    })

    it('should reject negative timeout', () => {
      expect(() => validateJobOptions({ timeout: -1 })).toThrow(ZodError)
    })
  })

  describe('JobName', () => {
    it('should validate valid job names', () => {
      expect(() => validateJobName('send-email')).not.toThrow()
      expect(() => validateJobName('process_data')).not.toThrow()
      expect(() => validateJobName('job123')).not.toThrow()
      expect(() => validateJobName('import-csv-data')).not.toThrow()
    })

    it('should reject empty name', () => {
      expect(() => validateJobName('')).toThrow(ZodError)
    })

    it('should reject uppercase', () => {
      expect(() => validateJobName('SendEmail')).toThrow(ZodError)
    })

    it('should reject spaces', () => {
      expect(() => validateJobName('send email')).toThrow(ZodError)
    })

    it('should reject special characters', () => {
      expect(() => validateJobName('send@email')).toThrow(ZodError)
      expect(() => validateJobName('send.email')).toThrow(ZodError)
    })

    it('should reject name too long', () => {
      const longName = 'a'.repeat(101)
      expect(() => validateJobName(longName)).toThrow(ZodError)
    })
  })


  describe('formatValidationError', () => {
    it('should format single error', () => {
      try {
        validateJobName('')
      } catch (error) {
        if (error instanceof ZodError) {
          const formatted = formatValidationError(error)

          expect(formatted).toContain('Validation failed')
          expect(formatted).toContain('Job name cannot be empty')
        }
      }
    })

    it('should format multiple errors', () => {
      try {
        validateJobOptions({
          attempts: 0, // Invalid
          priority: 11, // Invalid
        })
      } catch (error) {
        if (error instanceof ZodError) {
          const formatted = formatValidationError(error)

          expect(formatted).toContain('Validation failed')
          expect(formatted).toContain('attempts')
          expect(formatted).toContain('priority')
        }
      }
    })
  })

  describe('Integration Tests', () => {
    it('should validate complete queue config', () => {
      const config = {
        redis: {
          host: 'localhost',
          port: 6379,
          password: 'secret',
          db: 1,
        },
        prefix: 'my-queue',
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: 'exponential' as const,
            delay: 2000,
          },
          timeout: 60000,
        },
        enableMetrics: true,
      }

      const validated = validateQueueConfig(config)

      expect(validated.redis.host).toBe('localhost')
      expect(validated.redis.port).toBe(6379)
      expect(validated.prefix).toBe('my-queue')
      expect(validated.defaultJobOptions?.attempts).toBe(5)
      expect(validated.enableMetrics).toBe(true)
    })

    it('should validate worker config with limiter', () => {
      const config = {
        concurrency: 20,
        limiter: {
          max: 50,
          duration: 5000,
        },
        autoRun: false,
        metrics: true,
      }

      const validated = validateWorkerConfig(config)

      expect(validated.concurrency).toBe(20)
      expect(validated.limiter?.max).toBe(50)
      expect(validated.autoRun).toBe(false)
      expect(validated.metrics).toBe(true)
    })
  })
})
