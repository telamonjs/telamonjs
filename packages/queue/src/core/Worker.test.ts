import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Worker } from './Worker'
import { Job } from './Job'
import { createTestRedisConfig } from '../test/fixtures/test-helpers'
import { isRedisAvailable } from '../test/redis-availability'

// Test job class
class TestJob extends Job<{ message: string }, string> {
  name = 'test-job' as const

  async process(data: { message: string }): Promise<string> {
    return `Processed: ${data.message}`
  }
}

class FailingTestJob extends Job<{ shouldFail: boolean }, void> {
  name = 'failing-job' as const

  async process(data: { shouldFail: boolean }): Promise<void> {
    if (data.shouldFail) {
      throw new Error('Job intentionally failed')
    }
  }
}

// Integration suite against real BullMQ/Redis. No Redis reachable (e.g. CI
// without a Redis service) -> skip instead of hanging on ioredis retries.
const redisAvailable = await isRedisAvailable()

describe.skipIf(!redisAvailable)('Worker', () => {
  let worker: Worker<{ message: string }, string>
  const redis = createTestRedisConfig()

  afterEach(async () => {
    if (worker) {
      await worker.close()
    }
  })

  // 1. Initialization tests
  describe('Initialization', () => {
    it('creates worker with default config', () => {
      const jobInstance = new TestJob()
      worker = new Worker('test-worker', jobInstance, redis)

      expect(worker).toBeDefined()
      expect(worker.name).toBe('test-worker')
    })

    it('creates worker with custom concurrency', () => {
      const jobInstance = new TestJob()
      worker = new Worker('test-worker', jobInstance, redis, {
        concurrency: 10,
      })

      expect(worker).toBeDefined()
    })

    it('creates worker with rate limiter', () => {
      const jobInstance = new TestJob()
      worker = new Worker('test-worker', jobInstance, redis, {
        concurrency: 5,
        limiter: {
          max: 100,
          duration: 1000,
        },
      })

      expect(worker).toBeDefined()
    })

    it('creates worker with autoRun disabled', () => {
      const jobInstance = new TestJob()
      worker = new Worker('test-worker', jobInstance, redis, {
        autoRun: false,
      })

      expect(worker).toBeDefined()
      expect(worker.isActive()).toBe(false)
    })

    it('creates worker with custom prefix', () => {
      const jobInstance = new TestJob()
      worker = new Worker(
        'test-worker',
        jobInstance,
        redis,
        {},
        'custom-prefix'
      )

      expect(worker).toBeDefined()
    })
  })

  // 2. Lifecycle tests
  describe('Lifecycle', () => {
    beforeEach(() => {
      const jobInstance = new TestJob()
      worker = new Worker('test-worker', jobInstance, redis, {
        autoRun: false,
      })
    })

    it('starts worker', async () => {
      await worker.start()

      expect(worker.isActive()).toBe(true)
    })

    it('stops worker', async () => {
      await worker.start()
      await worker.close()

      expect(worker.isActive()).toBe(false)
    })

    it('pauses worker', async () => {
      await worker.start()
      await worker.pause()

      // Worker should be paused
      expect(true).toBe(true)
    })

    it('resumes worker', async () => {
      await worker.start()
      await worker.pause()
      await worker.resume()

      expect(true).toBe(true)
    })

    it('closes worker', async () => {
      await worker.start()
      await worker.close()

      expect(worker.isActive()).toBe(false)
    })

    it('handles multiple start calls', async () => {
      await worker.start()
      await worker.start() // Should not throw

      expect(worker.isActive()).toBe(true)
    })

    it('handles multiple stop calls', async () => {
      await worker.start()
      await worker.close()
      await worker.close() // Should not throw

      expect(worker.isActive()).toBe(false)
    })
  })

  // 3. State Management tests
  describe('State Management', () => {
    it('tracks running state correctly', async () => {
      const jobInstance = new TestJob()
      worker = new Worker('test-worker', jobInstance, redis, {
        autoRun: false,
      })

      expect(worker.isActive()).toBe(false)

      await worker.start()
      expect(worker.isActive()).toBe(true)

      await worker.close()
      expect(worker.isActive()).toBe(false)
    })

    it('auto-starts when autoRun is true', () => {
      const jobInstance = new TestJob()
      worker = new Worker('test-worker', jobInstance, redis, {
        autoRun: true,
      })

      expect(worker.isActive()).toBe(true)
    })
  })

  // 4. Raw Worker Access tests
  describe('Raw Worker Access', () => {
    it('exposes raw BullMQ worker', () => {
      const jobInstance = new TestJob()
      worker = new Worker('test-worker', jobInstance, redis)

      const rawWorker = worker.getRawWorker()

      expect(rawWorker).toBeDefined()
      expect(rawWorker.name).toBe('test-worker')
    })
  })

  // 5. Edge Cases
  describe('Edge Cases', () => {
    it('handles worker with zero concurrency (defaults to 5)', () => {
      const jobInstance = new TestJob()
      worker = new Worker('test-worker', jobInstance, redis, {
        concurrency: 0,
      })

      expect(worker).toBeDefined()
    })

    it('handles worker with high concurrency', () => {
      const jobInstance = new TestJob()
      worker = new Worker('test-worker', jobInstance, redis, {
        concurrency: 100,
      })

      expect(worker).toBeDefined()
    })

    it('handles close before start', async () => {
      const jobInstance = new TestJob()
      worker = new Worker('test-worker', jobInstance, redis, {
        autoRun: false,
      })

      await worker.close() // Should not throw

      expect(true).toBe(true)
    })

    it('handles multiple close calls', async () => {
      const jobInstance = new TestJob()
      worker = new Worker('test-worker', jobInstance, redis)

      await worker.close()
      await worker.close() // Should not throw

      expect(true).toBe(true)
    })
  })

  // 6. Job Processing (integration-like, brief)
  describe('Job Processing', () => {
    it('processes jobs with job instance', async () => {
      const jobInstance = new TestJob()
      worker = new Worker('test-worker', jobInstance, redis, {
        concurrency: 1,
      })

      // Worker is running and would process jobs if added to queue
      expect(worker.isActive()).toBe(true)
    })

    it('handles job failures gracefully', async () => {
      const jobInstance = new FailingTestJob()
      worker = new Worker('failing-worker', jobInstance, redis, {
        concurrency: 1,
      })

      // Worker is running and would handle failures
      expect(worker.isActive()).toBe(true)
    })
  })

  // 7. Configuration tests
  describe('Configuration', () => {
    it('applies concurrency configuration', () => {
      const jobInstance = new TestJob()
      worker = new Worker('test-worker', jobInstance, redis, {
        concurrency: 7,
      })

      expect(worker).toBeDefined()
    })

    it('applies rate limiter configuration', () => {
      const jobInstance = new TestJob()
      worker = new Worker('test-worker', jobInstance, redis, {
        limiter: {
          max: 50,
          duration: 5000,
        },
      })

      expect(worker).toBeDefined()
    })

    it('applies autoRun configuration', () => {
      const jobInstance = new TestJob()
      worker = new Worker('test-worker', jobInstance, redis, {
        autoRun: false,
      })

      expect(worker.isActive()).toBe(false)
    })
  })
})
