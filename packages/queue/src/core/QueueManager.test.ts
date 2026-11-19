/**
 * Unit tests for QueueManager
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { QueueManager } from './QueueManager'
import { InvalidJobOptionsError } from '../utils/errors'
import { NoOpLogger } from '@telamonjs/logger'
import { JobRegistry } from './JobRegistry'
import { SimpleJob, JobWithOptions, JobWithLegacySchedule } from '../test/fixtures/test-jobs'
import {
  createTestQueueManager,
  createMockLogger,
} from '../test/fixtures/test-helpers'
import { isRedisAvailable, TEST_REDIS } from '../test/redis-availability'

// Integration suite against real BullMQ/Redis. No Redis reachable (e.g. CI
// without a Redis service) -> skip instead of hanging on ioredis retries.
const redisAvailable = await isRedisAvailable()

describe.skipIf(!redisAvailable)('QueueManager', () => {
  let queueManager: QueueManager

  beforeEach(() => {
    // Clear registry before each test
    JobRegistry.getInstance()['jobs'].clear()

    queueManager = createTestQueueManager()
  })

  afterEach(async () => {
    // Clean up
    await queueManager.close()
  })

  describe('Constructor', () => {
    it('should create QueueManager with config', () => {
      expect(queueManager).toBeDefined()
      expect(queueManager).toBeInstanceOf(QueueManager)
    })

    it('should use default prefix', async () => {
      const qm = new QueueManager({
        redis: TEST_REDIS,
      })

      // Check that it initializes (prefix will be used internally)
      expect(qm).toBeDefined()
      await qm.close()
    })

    it('should accept custom prefix', async () => {
      const qm = new QueueManager({
        redis: TEST_REDIS,
        prefix: 'custom-prefix',
      })

      expect(qm).toBeDefined()
      await qm.close()
    })

    it('creates the DLQ by default (enableDLQ absent)', async () => {
      const qm = new QueueManager({ redis: TEST_REDIS })
      expect(qm.getDLQ()).not.toBeNull()
      await qm.close()
    })

    it('honors enableDLQ: false (contract for the 3.2.0 fix — this field used to be silently stripped by QueueConfigSchema, so the DLQ was always created regardless)', async () => {
      const qm = new QueueManager({
        redis: TEST_REDIS,
        enableDLQ: false,
      })
      expect(qm.getDLQ()).toBeNull()
      await qm.close()
    })
  })

  describe('register()', () => {
    it('should register a job', () => {
      queueManager.register(SimpleJob)

      const registry = JobRegistry.getInstance()
      expect(registry.has('simple-job')).toBe(true)
    })

    it('should create queue for registered job', () => {
      queueManager.register(SimpleJob)

      const queue = queueManager.getQueue('simple-job')
      expect(queue).toBeDefined()
    })

    it('should throw when a job still declares the removed schedule field', () => {
      expect(() => queueManager.register(JobWithLegacySchedule)).toThrow(
        /job-with-legacy-schedule.*was removed/
      )

      const registry = JobRegistry.getInstance()
      expect(registry.has('job-with-legacy-schedule')).toBe(false)
    })
  })

  describe('registerMany()', () => {
    it('should register multiple jobs', () => {
      queueManager.registerMany([SimpleJob, JobWithOptions])

      const registry = JobRegistry.getInstance()
      expect(registry.has('simple-job')).toBe(true)
      expect(registry.has('job-with-options')).toBe(true)
    })

    it('should create queues for all jobs', () => {
      queueManager.registerMany([SimpleJob, JobWithOptions])

      expect(queueManager.getQueue('simple-job')).toBeDefined()
      expect(queueManager.getQueue('job-with-options')).toBeDefined()
    })
  })

  describe('add()', () => {
    beforeEach(() => {
      queueManager.register(SimpleJob)
    })

    it('should add job to queue', async () => {
      await expect(
        queueManager.add(SimpleJob, { message: 'Hello' })
      ).resolves.not.toThrow()
    })

    it('should throw if job not registered', async () => {
      await expect(
        queueManager.add(JobWithOptions, { value: 10 })
      ).rejects.toThrow('not registered')
    })

    it('should merge job options', async () => {
      queueManager.register(JobWithOptions)

      await queueManager.add(JobWithOptions, { value: 5 }, { priority: 1 })

      // Job should be added with merged options
      // (we can't easily check this without Redis, but it shouldn't throw)
      const stats = await queueManager.getStats()
      expect(stats['job-with-options']).toBeDefined()
    })

    it('should accept custom job options', async () => {
      await queueManager.add(
        SimpleJob,
        { message: 'test' },
        {
          priority: 1,
          delay: 1000,
          attempts: 5,
        }
      )

      const stats = await queueManager.getStats()
      expect(stats['simple-job']).toBeDefined()
    })
  })

  describe('addBulk()', () => {
    beforeEach(() => {
      queueManager.register(SimpleJob)
    })

    it('should add multiple jobs in bulk', async () => {
      const jobs = [
        { data: { message: 'Hello 1' } },
        { data: { message: 'Hello 2' } },
        { data: { message: 'Hello 3' } },
      ]

      await expect(queueManager.addBulk(SimpleJob, jobs)).resolves.not.toThrow()
    })

    it('should throw if job not registered', async () => {
      await expect(
        queueManager.addBulk(JobWithOptions, [{ data: { value: 10 } }])
      ).rejects.toThrow('not registered')
    })

    it('rejects invalid per-job options, like add() does', async () => {
      await expect(
        queueManager.addBulk(SimpleJob, [{ data: { message: 'x' }, opts: { attempts: -1 } }])
      ).rejects.toThrow(InvalidJobOptionsError)
    })

    it('should accept job-specific options', async () => {
      const jobs = [
        { data: { message: 'Low priority' }, opts: { priority: 10 } },
        { data: { message: 'High priority' }, opts: { priority: 1 } },
      ]

      await queueManager.addBulk(SimpleJob, jobs)

      const stats = await queueManager.getStats()
      expect(stats['simple-job']).toBeDefined()
    })
  })

  describe('getQueue()', () => {
    it('should return queue by name', () => {
      queueManager.register(SimpleJob)

      const queue = queueManager.getQueue('simple-job')
      expect(queue).toBeDefined()
      expect(queue?.name).toBe('simple-job')
    })

    it('should return undefined for non-existent queue', () => {
      const queue = queueManager.getQueue('non-existent')
      expect(queue).toBeUndefined()
    })
  })

  describe('getWorker()', () => {
    it('should return worker by name after creation', async () => {
      queueManager.register(SimpleJob)
      await queueManager.createWorkers()

      const worker = queueManager.getWorker('simple-job')
      expect(worker).toBeDefined()
    })

    it('should return undefined before worker creation', () => {
      queueManager.register(SimpleJob)

      const worker = queueManager.getWorker('simple-job')
      expect(worker).toBeUndefined()
    })
  })

  describe('createWorkers()', () => {
    it('should create workers for all registered jobs', async () => {
      queueManager.registerMany([SimpleJob, JobWithOptions])

      const workers = await queueManager.createWorkers()

      expect(workers).toHaveLength(2)
      expect(queueManager.getWorker('simple-job')).toBeDefined()
      expect(queueManager.getWorker('job-with-options')).toBeDefined()
    })

    it('should accept concurrency config', async () => {
      queueManager.register(SimpleJob)

      const workers = await queueManager.createWorkers({
        concurrency: 10,
      })

      expect(workers).toHaveLength(1)
    })

    it('should accept limiter config', async () => {
      queueManager.register(SimpleJob)

      const workers = await queueManager.createWorkers({
        limiter: {
          max: 100,
          duration: 1000,
        },
      })

      expect(workers).toHaveLength(1)
    })

    it('should apply per-queue concurrency override from concurrencyPerQueue', async () => {
      queueManager.registerMany([SimpleJob, JobWithOptions])

      const workers = await queueManager.createWorkers({
        concurrency: 5,
        concurrencyPerQueue: { 'simple-job': 1 },
      })

      const overridden = workers.find(w => w.name === 'simple-job')
      const inheriting = workers.find(w => w.name === 'job-with-options')

      expect(overridden?.getRawWorker().opts.concurrency).toBe(1)
      // Jobs not listed in concurrencyPerQueue fall back to the global concurrency
      expect(inheriting?.getRawWorker().opts.concurrency).toBe(5)
    })

    it('should reject concurrencyPerQueue value of 0', async () => {
      queueManager.register(SimpleJob)

      await expect(
        queueManager.createWorkers({
          concurrencyPerQueue: { 'simple-job': 0 },
        })
      ).rejects.toThrow()
    })

    it('should reject concurrencyPerQueue value above 100', async () => {
      queueManager.register(SimpleJob)

      await expect(
        queueManager.createWorkers({
          concurrencyPerQueue: { 'simple-job': 101 },
        })
      ).rejects.toThrow()
    })
  })

  describe('getStats()', () => {
    it('should return stats for all queues', async () => {
      queueManager.registerMany([SimpleJob, JobWithOptions])

      const stats = await queueManager.getStats()

      expect(stats).toHaveProperty('simple-job')
      expect(stats).toHaveProperty('job-with-options')
    })

    it('should return empty stats for new queues', async () => {
      queueManager.register(SimpleJob)

      const stats = await queueManager.getStats()

      expect(stats['simple-job']).toEqual({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0,
      })
    })
  })

  describe('getRegistryStats()', () => {
    it('should return registry stats', () => {
      queueManager.registerMany([SimpleJob, JobWithOptions])

      const stats = queueManager.getRegistryStats()

      expect(stats.total).toBe(2)
      expect(stats.jobs).toContain('simple-job')
      expect(stats.jobs).toContain('job-with-options')
    })
  })

  describe('pauseAll() and resumeAll()', () => {
    beforeEach(async () => {
      queueManager.registerMany([SimpleJob, JobWithOptions])
      await queueManager.createWorkers()
    })

    it('should pause all workers', async () => {
      await expect(queueManager.pauseAll()).resolves.not.toThrow()
    })

    it('should resume all workers', async () => {
      await queueManager.pauseAll()
      await expect(queueManager.resumeAll()).resolves.not.toThrow()
    })
  })

  describe('validate()', () => {
    it('should validate registered jobs', () => {
      queueManager.register(SimpleJob)

      expect(() => {
        queueManager.validate()
      }).not.toThrow()
    })

    it('should throw if no jobs registered', () => {
      expect(() => {
        queueManager.validate()
      }).toThrow('No jobs registered')
    })
  })

  describe('close()', () => {
    it('should close all workers and queues', async () => {
      queueManager.registerMany([SimpleJob, JobWithOptions])
      await queueManager.createWorkers()

      await expect(queueManager.close()).resolves.not.toThrow()
    })

    it('should clear workers map', async () => {
      queueManager.register(SimpleJob)
      await queueManager.createWorkers()

      await queueManager.close()

      expect(queueManager.getWorker('simple-job')).toBeUndefined()
    })

    it('should handle close when no workers created', async () => {
      queueManager.register(SimpleJob)

      await expect(queueManager.close()).resolves.not.toThrow()
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid job class gracefully', async () => {
      // Don't register job
      await expect(
        queueManager.add(SimpleJob, { message: 'test' })
      ).rejects.toThrow()
    })

    it('should handle Redis connection errors gracefully', async () => {
      const qm = new QueueManager({
        redis: {
          // A loopback address with nothing listening fails synchronously
          // (ECONNREFUSED). An unresolvable hostname instead goes through
          // async DNS lookup, whose timing can outlive this test and its
          // qm.close() call, surfacing as an unhandled rejection later.
          host: '127.0.0.1',
          port: 9,
          maxRetriesPerRequest: 1, // Fail fast on commands
          // maxRetriesPerRequest only bounds per-command retries, not the
          // underlying connection-level reconnect loop - ioredis's default
          // retryStrategy backs off but never gives up, so an unreachable
          // host hangs both this test and the later qm.close() forever
          // without an explicit retryStrategy that stops retrying.
          retryStrategy: () => null,
        },
        prefix: 'test-error',
      })

      qm.register(SimpleJob)

      // Should handle connection error
      // (exact behavior depends on BullMQ/Redis client). close()'s own
      // settle window (see QueueManager.ts) gives the several independent
      // connections created above (Queue, QueueEvents, DeadLetterQueue)
      // time to fail and be observed via their 'error' listeners before
      // being torn down - this deliberately-broken connection is the
      // scenario that window exists for.
      await qm.close()
    })
  })

  describe('Integration with JobRegistry', () => {
    it('should use singleton registry', () => {
      const registry1 = JobRegistry.getInstance()

      queueManager.register(SimpleJob)

      const registry2 = JobRegistry.getInstance()

      expect(registry1).toBe(registry2)
      expect(registry2.has('simple-job')).toBe(true)
    })
  })

  describe('options precedence (defaults < Job.options < call-site)', () => {
    // Contract test documenting a 3.0.0 breaking fix: QueueManager.ts used to
    // merge as `{ ...jobInstance.options, ...this.config.defaultJobOptions,
    // ...options }`, so a manager-level default clobbered the job class's
    // own options - the opposite of what any caller would expect. The fix
    // reorders the spread to `defaults < Job.options < call-site`.
    it('Job.options wins over the manager defaultJobOptions', async () => {
      const qm = createTestQueueManager({
        defaultJobOptions: { attempts: 1 },
      })
      qm.register(JobWithOptions) // JobWithOptions.options.attempts = 5

      await qm.add(JobWithOptions, { value: 1 }, { jobId: 'precedence-1' })

      const queue = qm.getQueue('job-with-options')
      const job = await queue?.getRawQueue().getJob('precedence-1')
      expect(job?.opts.attempts).toBe(5)

      await qm.close()
    })

    it('call-site options win over both Job.options and manager defaults', async () => {
      const qm = createTestQueueManager({
        defaultJobOptions: { attempts: 1 },
      })
      qm.register(JobWithOptions)

      await qm.add(
        JobWithOptions,
        { value: 1 },
        { jobId: 'precedence-2', attempts: 9 }
      )

      const queue = qm.getQueue('job-with-options')
      const job = await queue?.getRawQueue().getJob('precedence-2')
      expect(job?.opts.attempts).toBe(9)

      await qm.close()
    })

    it('manager defaultJobOptions still applies fields Job.options does not set', async () => {
      const qm = createTestQueueManager({
        defaultJobOptions: { priority: 2 },
      })
      qm.register(SimpleJob) // SimpleJob has no own `options` override -> inherits base Job defaults, no priority

      await qm.add(SimpleJob, { message: 'x' }, { jobId: 'precedence-3' })

      const queue = qm.getQueue('simple-job')
      const job = await queue?.getRawQueue().getJob('precedence-3')
      expect(job?.opts.priority).toBe(2)

      await qm.close()
    })

    it('applies the same precedence in addBulk()', async () => {
      const qm = createTestQueueManager({
        defaultJobOptions: { attempts: 1 },
      })
      qm.register(JobWithOptions)

      await qm.addBulk(JobWithOptions, [
        { data: { value: 1 }, opts: { jobId: 'precedence-bulk-1' } },
      ])

      const queue = qm.getQueue('job-with-options')
      const job = await queue?.getRawQueue().getJob('precedence-bulk-1')
      expect(job?.opts.attempts).toBe(5) // Job.options, not the manager default of 1

      await qm.close()
    })
  })

  describe('Logger Integration', () => {
    it('should use custom logger when provided', async () => {
      const mockLogger = createMockLogger()

      const qm = new QueueManager({
        redis: TEST_REDIS,
        prefix: 'test-logger',
        logger: mockLogger,
      })

      // QueueManager logs initialization. The DLQ is constructed first
      // (QueueManager.ts constructor builds DeadLetterQueue before its own
      // "QueueManager initialized" log), so it isn't necessarily logs[0].
      expect(mockLogger.logs.length).toBeGreaterThan(0)
      const initLog = mockLogger.logs.find(
        log => log.message === 'QueueManager initialized'
      )
      expect(initLog).toBeDefined()
      expect(initLog?.level).toBe('info')
      await qm.close()
    })

    it('should log job registration', async () => {
      const mockLogger = createMockLogger()

      const qm = new QueueManager({
        redis: TEST_REDIS,
        logger: mockLogger,
      })

      mockLogger.clear()
      qm.register(SimpleJob)

      // Should log job registration
      const registrationLog = mockLogger.logs.find(
        log => log.message === 'Job registered'
      )
      expect(registrationLog).toBeDefined()
      expect(registrationLog?.meta?.jobName).toBe('simple-job')
      await qm.close()
    })

    it('should accept NoOpLogger as logger to silence the manager', async () => {
      const qm = createTestQueueManager({ logger: new NoOpLogger() })
      expect(qm).toBeDefined()
      await qm.close()
    })
  })
})
