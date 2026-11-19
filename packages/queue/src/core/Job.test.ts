/**
 * Unit tests for Job class
 */

import { describe, it, expect } from 'vitest'
import {
  SimpleJob,
  JobWithOptions,
  JobWithHooks,
  JobWithValidation,
  JobWithTransform,
  SlowJob,
  JobWithConfigDefaults,
} from '../test/fixtures/test-jobs'

describe('Job', () => {
  describe('Basic Properties', () => {
    it('should have a name', () => {
      const job = new SimpleJob()
      expect(job.name).toBe('simple-job')
    })

    it('should have default options', () => {
      const job = new SimpleJob()

      expect(job.options).toBeDefined()
      expect(job.options.attempts).toBe(3)
      expect(job.options.backoff).toEqual({
        type: 'exponential',
        delay: 1000,
      })
    })

    it('should leave configDefaults undefined by default', () => {
      const job = new SimpleJob()
      expect(job.configDefaults).toBeUndefined()
    })

    it('should allow a job class to seed job-config bootstrap defaults', () => {
      const job = new JobWithConfigDefaults()
      expect(job.configDefaults).toEqual({
        cronPattern: '0 9 * * *',
        enabled: true,
        priority: 3,
        concurrency: 2,
        description: 'Seeded via Job.configDefaults',
      })
    })

    it('should allow custom options', () => {
      const job = new JobWithOptions()

      expect(job.options.attempts).toBe(5)
      expect(job.options.backoff).toEqual({
        type: 'exponential',
        delay: 2000,
      })
      expect(job.options.timeout).toBe(10000)
    })
  })

  describe('process()', () => {
    it('should process data and return result', async () => {
      const job = new SimpleJob()
      const result = await job.process({ message: 'Hello' })

      expect(result).toBe('Processed: Hello')
    })

    it('should handle different data types', async () => {
      const job = new JobWithOptions()
      const result = await job.process({ value: 5 })

      expect(result).toBe(10)
    })
  })

  describe('Hooks', () => {
    it('should have hooks object', () => {
      const job = new JobWithHooks()

      expect(job.hooks).toBeDefined()
      expect(job.hooks.onActive).toBeDefined()
      expect(job.hooks.onCompleted).toBeDefined()
      expect(job.hooks.onFailed).toBeDefined()
      expect(job.hooks.onProgress).toBeDefined()
    })

    it('should call onActive hook', async () => {
      const job = new JobWithHooks()

      await job.onActive!({ id: '123' })

      expect(job.onActiveCalled).toBe(true)
    })

    it('should call onCompleted hook', async () => {
      const job = new JobWithHooks()

      await job.onCompleted!(undefined)

      expect(job.onCompletedCalled).toBe(true)
    })

    it('should call onFailed hook', async () => {
      const job = new JobWithHooks()

      await job.onFailed!(new Error('Test error'))

      expect(job.onFailedCalled).toBe(true)
    })

    it('should call onProgress hook', async () => {
      const job = new JobWithHooks()

      await job.onProgress!(50)

      expect(job.onProgressCalled).toBe(true)
    })

    it('should bind hooks to job instance', () => {
      const job = new JobWithHooks()
      const hooks = job.hooks

      // Hooks should be bound to the instance
      expect(hooks.onActive).toBeDefined()

      // Call hook and check it modifies the instance
      hooks.onActive!({ id: 'test' })
      expect(job.onActiveCalled).toBe(true)
    })
  })

  describe('validate()', () => {
    it('should validate data', async () => {
      const job = new JobWithValidation()

      await expect(
        job.validate!({ email: 'test@example.com' })
      ).resolves.not.toThrow()
    })

    it('should throw on invalid data', async () => {
      const job = new JobWithValidation()

      await expect(job.validate!({ email: 'invalid-email' })).rejects.toThrow(
        'Invalid email'
      )
    })
  })

  describe('transform()', () => {
    it('should transform data before processing', async () => {
      const job = new JobWithTransform()

      const transformed = await job.transform!({ text: 'hello' })

      expect(transformed.text).toBe('HELLO')
    })

    it('should return original data by default', async () => {
      const job = new SimpleJob()
      const data = { message: 'test' }

      const result = await job.transform!(data)

      expect(result).toBe(data)
    })
  })

  describe('serialize() and deserialize()', () => {
    it('should serialize data', () => {
      const job = new SimpleJob()
      const data = { message: 'test' }

      const serialized = job.serialize!(data)

      expect(serialized).toEqual(data)
    })

    it('should deserialize data', () => {
      const job = new SimpleJob()
      const data = { message: 'test' }

      const deserialized = job.deserialize!(data)

      expect(deserialized).toEqual(data)
    })
  })

  describe('Job Options', () => {
    it('should have timeout option', () => {
      const job = new SlowJob()

      expect(job.options.timeout).toBe(1000)
    })

    it('should have removeOnComplete option', () => {
      const job = new JobWithOptions()

      expect(job.options.removeOnComplete).toBe(50)
    })

    it('should have removeOnFail option', () => {
      const job = new JobWithOptions()

      expect(job.options.removeOnFail).toBe(200)
    })
  })

  describe('Type Safety', () => {
    it('should enforce data type', async () => {
      const job = new SimpleJob()

      // This should compile (TypeScript will catch wrong types)
      const result = await job.process({ message: 'test' })
      expect(result).toBeDefined()
    })

    it('should enforce result type', async () => {
      const job = new JobWithOptions()

      // Result should be a number
      const result = await job.process({ value: 10 })
      expect(typeof result).toBe('number')
    })
  })
})
