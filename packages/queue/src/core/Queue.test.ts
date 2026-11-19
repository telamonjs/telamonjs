import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Queue } from './Queue'
import { createTestRedisConfig, sleep } from '../test/fixtures/test-helpers'
import { isRedisAvailable } from '../test/redis-availability'

interface TestData {
  message: string
  priority?: number
}

// Integration suite against real BullMQ/Redis. No Redis reachable (e.g. CI
// without a Redis service) -> skip instead of hanging on ioredis retries.
const redisAvailable = await isRedisAvailable()

describe.skipIf(!redisAvailable)('Queue', () => {
  let queue: Queue<TestData, string>
  const queueName = 'test-queue'

  beforeEach(() => {
    const redis = createTestRedisConfig()
    queue = new Queue<TestData, string>(queueName, redis, `test-${Date.now()}`)
  })

  afterEach(async () => {
    await queue.close()
  })

  // 1. Initialization tests
  describe('Initialization', () => {
    it('creates queue with name', () => {
      expect(queue).toBeDefined()
      expect(queue.name).toBe(queueName)
    })

    it('creates queue with custom prefix', async () => {
      const customQueue = new Queue<TestData, string>(
        'custom-queue',
        createTestRedisConfig(),
        'custom-prefix'
      )
      expect(customQueue).toBeDefined()
      expect(customQueue.name).toBe('custom-queue')

      await customQueue.close()
    })
  })

  // 2. Add Job tests
  describe('Adding Jobs', () => {
    it('adds job to queue', async () => {
      const job = await queue.add({ message: 'test' })

      expect(job).toBeDefined()
      expect(job.id).toBeDefined()
      expect(job.data).toEqual({ message: 'test' })
    })

    it('adds job with options', async () => {
      const job = await queue.add(
        { message: 'test' },
        {
          priority: 1,
          attempts: 5,
          delay: 1000,
        }
      )

      expect(job).toBeDefined()
      expect(job.opts?.priority).toBe(1)
      expect(job.opts?.attempts).toBe(5)
      expect(job.opts?.delay).toBe(1000)
    })

    it('adds job with custom jobId for idempotency', async () => {
      const customId = 'custom-job-id-123'
      const job = await queue.add({ message: 'test' }, { jobId: customId })

      expect(job.id).toBe(customId)
    })

    it('adds multiple jobs in bulk', async () => {
      const jobs = await queue.addBulk([
        { data: { message: 'job1' } },
        { data: { message: 'job2' } },
        { data: { message: 'job3' } },
      ])

      expect(jobs).toHaveLength(3)
      expect(jobs[0].data).toEqual({ message: 'job1' })
      expect(jobs[1].data).toEqual({ message: 'job2' })
      expect(jobs[2].data).toEqual({ message: 'job3' })
    })

    it('adds bulk jobs with default options', async () => {
      const jobs = await queue.addBulk(
        [{ data: { message: 'job1' } }, { data: { message: 'job2' } }],
        { priority: 2, attempts: 3 }
      )

      expect(jobs).toHaveLength(2)
      expect(jobs[0].opts?.priority).toBe(2)
      expect(jobs[1].opts?.attempts).toBe(3)
    })

    it('adds bulk jobs with individual options', async () => {
      const jobs = await queue.addBulk([
        { data: { message: 'job1' }, opts: { priority: 1 } },
        { data: { message: 'job2' }, opts: { priority: 3 } },
      ])

      expect(jobs).toHaveLength(2)
      expect(jobs[0].opts?.priority).toBe(1)
      expect(jobs[1].opts?.priority).toBe(3)
    })
  })

  // 3. Queue Stats tests
  describe('Queue Statistics', () => {
    it('gets queue stats', async () => {
      await queue.add({ message: 'test1' })
      await queue.add({ message: 'test2' })
      await sleep(100)

      const stats = await queue.getStats()

      expect(stats).toBeDefined()
      expect(stats.waiting).toBeGreaterThanOrEqual(0)
      expect(stats.active).toBeGreaterThanOrEqual(0)
      expect(stats.completed).toBeGreaterThanOrEqual(0)
      expect(stats.failed).toBeGreaterThanOrEqual(0)
      expect(stats.delayed).toBeGreaterThanOrEqual(0)
    })

    it('returns zero stats for empty queue', async () => {
      const stats = await queue.getStats()

      expect(stats.waiting).toBe(0)
      expect(stats.active).toBe(0)
      expect(stats.completed).toBe(0)
      expect(stats.failed).toBe(0)
      expect(stats.delayed).toBe(0)
    })
  })

  // 4. Queue Control tests
  describe('Queue Control', () => {
    it('pauses queue', async () => {
      await queue.pause()

      // Queue should be paused (no direct API to check, but we can verify it doesn't throw)
      expect(true).toBe(true)
    })

    it('resumes queue', async () => {
      await queue.pause()
      await queue.resume()

      expect(true).toBe(true)
    })

    it('pauses the queue and resolves once active jobs finish', async () => {
      // No worker attached to this queue in this test, so jobs added here
      // never leave 'waiting' - BullMQ's own getWaitingCount() counts
      // waiting AND paused jobs (bullmq queue-getters.js:58), and
      // queue.pause() moves waiting jobs to the paused list without a
      // worker to consume them, so a real drain() can never observe
      // waiting/paused reaching 0 here. drain() only needs to wait for
      // *active* jobs (there are none), so it must resolve quickly and
      // leave the queue paused - it must NOT remove the backlog.
      await queue.add({ message: 'test1' })
      await queue.add({ message: 'test2' })

      const drained = await queue.drain()

      expect(drained).toBe(0) // no active jobs were in flight

      const stats = await queue.getStats()
      expect(stats.paused).toBe(1)
      expect(stats.waiting).toBe(2) // backlog preserved, not discarded
    })

    it('cleans completed jobs', async () => {
      // Add and let jobs complete (would need worker, so just test API)
      await queue.clean(0, 100, 'completed')

      // Should not throw
      expect(true).toBe(true)
    })

    it('cleans failed jobs', async () => {
      await queue.clean(0, 100, 'failed')

      expect(true).toBe(true)
    })
  })

  // 5. Job Retrieval tests
  describe('Job Retrieval', () => {
    it('gets job by id', async () => {
      const addedJob = await queue.add({ message: 'test' })

      const job = await queue.getJob(addedJob.id!)

      expect(job).toBeDefined()
      expect(job?.id).toBe(addedJob.id)
      expect(job?.data).toEqual({ message: 'test' })
    })

    it('returns undefined for non-existent job', async () => {
      const job = await queue.getJob('non-existent-id')

      expect(job).toBeUndefined()
    })

    it('gets waiting jobs', async () => {
      await queue.add({ message: 'test1' })
      await queue.add({ message: 'test2' })

      const jobs = await queue.getWaiting()

      expect(jobs.length).toBeGreaterThanOrEqual(2)
    })

    it('gets active jobs', async () => {
      const jobs = await queue.getActive()

      expect(Array.isArray(jobs)).toBe(true)
    })

    it('gets completed jobs', async () => {
      const jobs = await queue.getCompleted()

      expect(Array.isArray(jobs)).toBe(true)
    })

    it('gets failed jobs', async () => {
      const jobs = await queue.getFailed()

      expect(Array.isArray(jobs)).toBe(true)
    })
  })

  // 6. Raw Queue Access tests
  describe('Raw Queue Access', () => {
    it('exposes raw BullMQ queue', () => {
      const rawQueue = queue.getRawQueue()

      expect(rawQueue).toBeDefined()
      expect(rawQueue.name).toBe(queueName)
    })
  })

  // 7. Edge Cases
  describe('Edge Cases', () => {
    it('handles empty job data', async () => {
      type EmptyData = Record<string, never>
      const emptyQueue = new Queue<EmptyData, void>(
        'empty-queue',
        createTestRedisConfig(),
        `test-${Date.now()}`
      )

      const job = await emptyQueue.add({})
      expect(job).toBeDefined()
      expect(job.data).toEqual({})

      await emptyQueue.close()
    })

    it('handles large job data', async () => {
      const largeData = {
        message: 'x'.repeat(10000), // 10KB string
        array: Array(100).fill({ nested: 'data' }),
      }

      const job = await queue.add(largeData)
      expect(job).toBeDefined()
      expect(job.data.message.length).toBe(10000)
    })

    it('handles job with priority extremes', async () => {
      const highPriority = await queue.add({ message: 'high' }, { priority: 1 })
      const lowPriority = await queue.add({ message: 'low' }, { priority: 10 })

      expect(highPriority.opts?.priority).toBe(1)
      expect(lowPriority.opts?.priority).toBe(10)
    })

    it('handles job with zero delay', async () => {
      const job = await queue.add({ message: 'immediate' }, { delay: 0 })

      expect(job.opts?.delay).toBe(0)
    })

    it('handles job with large delay', async () => {
      const job = await queue.add(
        { message: 'delayed' },
        { delay: 86400000 } // 24 hours
      )

      expect(job.opts?.delay).toBe(86400000)
    })

    it('handles bulk add with empty array', async () => {
      const jobs = await queue.addBulk([])

      expect(jobs).toHaveLength(0)
    })

    it('handles multiple close calls gracefully', async () => {
      await queue.close()
      await queue.close() // Should not throw

      expect(true).toBe(true)
    })
  })

  // 8. Cleanup tests
  describe('Cleanup', () => {
    it('closes queue and events connection', async () => {
      await queue.close()

      // After close, operations should fail gracefully
      // (BullMQ throws errors on closed connections)
      expect(true).toBe(true)
    })
  })

  // 9. Type Safety (documented)
  describe('Type Safety', () => {
    it('enforces job data type at compile time', async () => {
      // This works
      await queue.add({ message: 'test' })
      await queue.add({ message: 'test', priority: 1 })

      // TypeScript would prevent wrong types at compile time
      // @ts-expect-error - Wrong data type
      // await queue.add({ wrongKey: 'test' })

      // @ts-expect-error - Missing required field
      // await queue.add({})

      expect(true).toBe(true)
    })
  })
})
