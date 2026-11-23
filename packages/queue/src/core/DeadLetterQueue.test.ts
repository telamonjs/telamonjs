import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DeadLetterQueue } from './DeadLetterQueue'
import type { DeadLetterQueueOptions } from './DeadLetterQueue'
import { Queue as BullQueue } from 'bullmq'
import type { RedisConfig } from './types'
import { NoOpLogger } from '@telamonjs/logger'
import { isRedisAvailable, TEST_REDIS } from '../test/redis-availability'

/**
 * DeadLetterQueue Integration Tests
 *
 * ⚠️ REQUIRES REDIS: localhost:6379 by default; override with REDIS_URL or
 * REDIS_HOST/REDIS_PORT (see src/test/redis-availability.ts)
 *
 * To run these tests:
 * 1. Start Redis: `docker run -d -p 6379:6379 redis`
 * 2. Run tests: `pnpm test __tests__/unit/dead-letter-queue.test.ts`
 *
 * No Redis reachable (e.g. CI without a Redis service) -> suite skips
 * instead of hanging forever on ioredis's infinite reconnect retries.
 */
const redisAvailable = await isRedisAvailable()

describe.skipIf(!redisAvailable)('DeadLetterQueue', () => {
  let dlq: DeadLetterQueue
  let testQueue: BullQueue
  const redisConfig: RedisConfig = {
    ...TEST_REDIS,
    maxRetriesPerRequest: null,
  }

  beforeEach(() => {
    dlq = new DeadLetterQueue(redisConfig, 'test', new NoOpLogger())
    // Unique per test run: a fixed 'test-queue' name collides with
    // Queue.test.ts's own fixed 'test-queue' BullQueue when the two files
    // run in parallel worker threads against the same real Redis instance.
    testQueue = new BullQueue(`test-queue-dlq-${Date.now()}-${Math.random()}`, {
      connection: redisConfig,
    })
  })

  afterEach(async () => {
    // Best-effort cleanup: the close()/close() test intentionally closes
    // `dlq` itself inside the test body, so clear()/close() here would
    // otherwise throw "Connection is closed" on that test.
    await dlq.clear().catch(() => {})
    await dlq.close().catch(() => {})
    await testQueue.close().catch(() => {})
  })

  describe('Constructor', () => {
    it('should create DLQ with correct queue name', () => {
      expect(dlq).toBeDefined()
      expect(dlq.getRawQueue().name).toBe('test-dlq')
    })

    it('should use default prefix if not provided', async () => {
      const defaultDlq = new DeadLetterQueue(redisConfig)
      expect(defaultDlq.getRawQueue().name).toBe('telamonjs-dlq')
      await defaultDlq.close()
    })
  })

  describe('add()', () => {
    it('should add a failed job to the DLQ', async () => {
      const error = new Error('Job execution failed')
      const data = { test: 'data' }

      await dlq.add('test-job', 'job-123', data, error, 3)

      const entries = await dlq.list()
      expect(entries).toHaveLength(1)
      expect(entries[0].jobName).toBe('test-job')
      expect(entries[0].originalJobId).toBe('job-123')
      expect(entries[0].data).toEqual(data)
      expect(entries[0].error.message).toBe('Job execution failed')
      expect(entries[0].attempts).toBe(3)
    })

    it('should include error stack trace', async () => {
      const error = new Error('Test error')
      await dlq.add('test-job', 'job-456', {}, error, 1)

      const entries = await dlq.list()
      expect(entries[0].error.stack).toBeDefined()
      expect(entries[0].error.stack).toContain('Error: Test error')
    })

    it('should include error code if present', async () => {
      const error = new Error('Test error') as NodeJS.ErrnoException
      error.code = 'QUEUE_2004'
      await dlq.add('test-job', 'job-789', {}, error, 2)

      const entries = await dlq.list()
      expect(entries[0].error.code).toBe('QUEUE_2004')
    })

    it('should generate DLQ entry ID', async () => {
      await dlq.add('test-job', 'job-123', {}, new Error('Test'), 1)

      const entries = await dlq.list()
      expect(entries[0].id).toBe('dlq-test-job-job-123')
    })

    it('should record failedAt timestamp', async () => {
      const beforeAdd = new Date()
      await dlq.add('test-job', 'job-123', {}, new Error('Test'), 1)
      const afterAdd = new Date()

      const entries = await dlq.list()
      const failedAt = new Date(entries[0].failedAt)

      expect(failedAt.getTime()).toBeGreaterThanOrEqual(beforeAdd.getTime())
      expect(failedAt.getTime()).toBeLessThanOrEqual(afterAdd.getTime())
    })
  })

  describe('list()', () => {
    it('should list all DLQ entries', async () => {
      await dlq.add('job-1', 'id-1', {}, new Error('Error 1'), 1)
      await dlq.add('job-2', 'id-2', {}, new Error('Error 2'), 2)
      await dlq.add('job-3', 'id-3', {}, new Error('Error 3'), 3)

      const entries = await dlq.list()
      expect(entries).toHaveLength(3)
    })

    it('should support pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await dlq.add(`job-${i}`, `id-${i}`, {}, new Error(`Error ${i}`), 1)
      }

      const firstPage = await dlq.list(0, 2)
      const secondPage = await dlq.list(3, 4)

      expect(firstPage).toHaveLength(3)
      expect(secondPage).toHaveLength(2)
    })

    it('should return empty array when DLQ is empty', async () => {
      const entries = await dlq.list()
      expect(entries).toEqual([])
    })
  })

  describe('get()', () => {
    it('should get a specific DLQ entry by ID', async () => {
      await dlq.add('test-job', 'job-123', { foo: 'bar' }, new Error('Test'), 1)

      const entry = await dlq.get('dlq-test-job-job-123')

      expect(entry).toBeDefined()
      expect(entry?.jobName).toBe('test-job')
      expect(entry?.data).toEqual({ foo: 'bar' })
    })

    it('should return null for non-existent ID', async () => {
      const entry = await dlq.get('non-existent-id')
      expect(entry).toBeNull()
    })
  })

  describe('getStats()', () => {
    it('should return stats for empty DLQ', async () => {
      const stats = await dlq.getStats()

      expect(stats.total).toBe(0)
      expect(stats.byJobName).toEqual({})
      expect(stats.oldest).toBeUndefined()
      expect(stats.newest).toBeUndefined()
    })

    it('should count total entries', async () => {
      await dlq.add('job-1', 'id-1', {}, new Error('Error'), 1)
      await dlq.add('job-2', 'id-2', {}, new Error('Error'), 1)

      const stats = await dlq.getStats()
      expect(stats.total).toBe(2)
    })

    it('should count entries by job name', async () => {
      await dlq.add('send-email', 'id-1', {}, new Error('Error'), 1)
      await dlq.add('send-email', 'id-2', {}, new Error('Error'), 1)
      await dlq.add('process-order', 'id-3', {}, new Error('Error'), 1)

      const stats = await dlq.getStats()
      expect(stats.byJobName).toEqual({
        'send-email': 2,
        'process-order': 1,
      })
    })

    it('should track oldest and newest entries', async () => {
      await dlq.add('job-1', 'id-1', {}, new Error('Error'), 1)
      await new Promise(resolve => setTimeout(resolve, 100))
      await dlq.add('job-2', 'id-2', {}, new Error('Error'), 1)

      const stats = await dlq.getStats()

      expect(stats.oldest).toBeDefined()
      expect(stats.newest).toBeDefined()
      expect(stats.oldest!.getTime()).toBeLessThan(stats.newest!.getTime())
    })
  })

  describe('retry()', () => {
    it('should retry a failed job', async () => {
      const data = { test: 'data' }
      await dlq.add('test-job', 'job-123', data, new Error('Test'), 3)

      const success = await dlq.retry('dlq-test-job-job-123', testQueue)

      expect(success).toBe(true)

      // Check job was added to original queue
      const jobs = await testQueue.getJobs(['waiting'])
      expect(jobs).toHaveLength(1)
      expect(jobs[0].data).toEqual(data)
    })

    it('should remove job from DLQ after retry', async () => {
      await dlq.add('test-job', 'job-123', {}, new Error('Test'), 3)

      await dlq.retry('dlq-test-job-job-123', testQueue)

      const entries = await dlq.list()
      expect(entries).toHaveLength(0)
    })

    it('should reset attempts on retry', async () => {
      await dlq.add('test-job', 'job-123', {}, new Error('Test'), 3)

      await dlq.retry('dlq-test-job-job-123', testQueue)

      const jobs = await testQueue.getJobs(['waiting'])
      expect(jobs[0].opts.attempts).toBe(3)
    })

    it('should throw error for non-existent DLQ entry', async () => {
      await expect(dlq.retry('non-existent', testQueue)).rejects.toThrow(
        "DLQ entry 'non-existent' not found"
      )
    })
  })

  describe('delete()', () => {
    it('should delete a DLQ entry', async () => {
      await dlq.add('test-job', 'job-123', {}, new Error('Test'), 1)

      const deleted = await dlq.delete('dlq-test-job-job-123')

      expect(deleted).toBe(true)

      const entries = await dlq.list()
      expect(entries).toHaveLength(0)
    })

    it('should return false for non-existent entry', async () => {
      const deleted = await dlq.delete('non-existent')
      expect(deleted).toBe(false)
    })
  })

  describe('clear()', () => {
    it('should clear all DLQ entries', async () => {
      await dlq.add('job-1', 'id-1', {}, new Error('Error'), 1)
      await dlq.add('job-2', 'id-2', {}, new Error('Error'), 1)
      await dlq.add('job-3', 'id-3', {}, new Error('Error'), 1)

      const cleared = await dlq.clear()

      expect(cleared).toBe(3)

      const entries = await dlq.list()
      expect(entries).toHaveLength(0)
    })

    it('should return 0 when DLQ is already empty', async () => {
      const cleared = await dlq.clear()
      expect(cleared).toBe(0)
    })
  })

  describe('filterByJobName()', () => {
    beforeEach(async () => {
      await dlq.add('send-email', 'id-1', {}, new Error('Error'), 1)
      await dlq.add('send-email', 'id-2', {}, new Error('Error'), 1)
      await dlq.add('process-order', 'id-3', {}, new Error('Error'), 1)
      await dlq.add('generate-report', 'id-4', {}, new Error('Error'), 1)
    })

    it('should filter entries by job name', async () => {
      const emailJobs = await dlq.filterByJobName('send-email')

      expect(emailJobs).toHaveLength(2)
      expect(emailJobs.every(entry => entry.jobName === 'send-email')).toBe(
        true
      )
    })

    it('should return empty array for non-existent job name', async () => {
      const entries = await dlq.filterByJobName('non-existent')
      expect(entries).toEqual([])
    })

    it('should return all entries for a unique job name', async () => {
      const entries = await dlq.filterByJobName('process-order')
      expect(entries).toHaveLength(1)
      expect(entries[0].jobName).toBe('process-order')
    })
  })

  describe('getRawQueue()', () => {
    it('should return the underlying BullMQ queue', () => {
      const rawQueue = dlq.getRawQueue()
      expect(rawQueue).toBeInstanceOf(BullQueue)
      expect(rawQueue.name).toBe('test-dlq')
    })
  })

  describe('close()', () => {
    it('should close the DLQ gracefully', async () => {
      await expect(dlq.close()).resolves.not.toThrow()
    })
  })
})

describe.skipIf(!redisAvailable)('DeadLetterQueue retention', () => {
  const redisConfig: RedisConfig = { ...TEST_REDIS, maxRetriesPerRequest: null }
  const opened: DeadLetterQueue[] = []

  // A unique prefix per DLQ keeps these tests isolated from the shared
  // `test-dlq` used by the suite above.
  function makeDlq(options?: DeadLetterQueueOptions): DeadLetterQueue {
    const prefix = `test-retention-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const dlq = new DeadLetterQueue(redisConfig, prefix, new NoOpLogger(), options)
    opened.push(dlq)
    return dlq
  }

  // Seeds an entry whose BullMQ timestamp is `ageMs` in the past - the field
  // retention measures age against.
  async function seedOldEntry(dlq: DeadLetterQueue, id: string, ageMs: number) {
    const failedAt = new Date(Date.now() - ageMs)
    await dlq.getRawQueue().add(
      'old-job',
      {
        id,
        jobName: 'old-job',
        data: {},
        error: { message: 'old' },
        attempts: 1,
        failedAt,
        originalJobId: id,
      },
      { jobId: id, timestamp: failedAt.getTime() }
    )
  }

  afterEach(async () => {
    for (const dlq of opened.splice(0)) {
      await dlq.getRawQueue().obliterate({ force: true }).catch(() => {})
      await dlq.close().catch(() => {})
    }
  })

  describe('defaults', () => {
    it('keeps every entry when no retention option is set', async () => {
      const dlq = makeDlq()
      await seedOldEntry(dlq, 'ancient', 365 * 24 * 60 * 60 * 1000)
      for (let i = 0; i < 5; i++) {
        await dlq.add('job', `id-${i}`, {}, new Error('boom'), 1)
      }

      expect((await dlq.list(0, -1)).length).toBe(6)
    })
  })

  describe('maxAge', () => {
    it('drops entries older than maxAge when a new entry is added', async () => {
      const dlq = makeDlq({ maxAge: 60_000 })
      await seedOldEntry(dlq, 'stale', 120_000)

      await dlq.add('job', 'fresh', {}, new Error('boom'), 1)

      expect((await dlq.list(0, -1)).map(e => e.id)).toEqual(['dlq-job-fresh'])
    })
  })

  describe('maxLen', () => {
    it('keeps only the newest maxLen entries after each add', async () => {
      const dlq = makeDlq({ maxLen: 2 })
      await seedOldEntry(dlq, 'oldest', 30_000)
      await seedOldEntry(dlq, 'older', 20_000)

      await dlq.add('job', 'newest', {}, new Error('boom'), 1)

      const ids = (await dlq.list(0, -1)).map(e => e.id).sort()
      expect(ids).toEqual(['dlq-job-newest', 'older'])
    })

    it('does nothing while the DLQ is under maxLen', async () => {
      const dlq = makeDlq({ maxLen: 10 })
      await dlq.add('job', 'a', {}, new Error('boom'), 1)
      await dlq.add('job', 'b', {}, new Error('boom'), 1)

      expect((await dlq.list(0, -1)).length).toBe(2)
    })

    it('applies maxAge and maxLen together', async () => {
      const dlq = makeDlq({ maxAge: 60_000, maxLen: 1 })
      await seedOldEntry(dlq, 'stale', 120_000)
      await seedOldEntry(dlq, 'recent', 1_000)

      await dlq.add('job', 'newest', {}, new Error('boom'), 1)

      expect((await dlq.list(0, -1)).map(e => e.id)).toEqual(['dlq-job-newest'])
    })
  })

  describe('purgeOlderThan()', () => {
    it('removes entries older than the given age and returns how many were removed', async () => {
      const dlq = makeDlq()
      await seedOldEntry(dlq, 'stale-1', 120_000)
      await seedOldEntry(dlq, 'stale-2', 90_000)
      await dlq.add('job', 'fresh', {}, new Error('boom'), 1)

      const removed = await dlq.purgeOlderThan(60_000)

      expect(removed).toBe(2)
      expect((await dlq.list(0, -1)).map(e => e.id)).toEqual(['dlq-job-fresh'])
    })

    it('returns 0 when nothing is old enough', async () => {
      const dlq = makeDlq()
      await dlq.add('job', 'fresh', {}, new Error('boom'), 1)

      expect(await dlq.purgeOlderThan(60_000)).toBe(0)
    })
  })

  describe('validation', () => {
    it.each([[{ maxAge: 0 }], [{ maxAge: -1 }], [{ maxLen: 0 }], [{ maxLen: 1.5 }]])(
      'rejects invalid retention %o',
      options => {
        expect(
          () => new DeadLetterQueue(redisConfig, 'test-invalid', new NoOpLogger(), options)
        ).toThrow(/DeadLetterQueue/)
      }
    )
  })
})
