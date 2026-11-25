/**
 * FlowProducer against real BullMQ/Redis: the flow tree it builds, the
 * manager's Redis/prefix it inherits, job-option precedence and the
 * children-before-parent execution order.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { FlowProducer } from './FlowProducer'
import { Job } from './Job'
import { JobRegistry } from './JobRegistry'
import type { QueueManager } from './QueueManager'
import { Queue as BullQueue } from 'bullmq'
import {
  createMockLogger,
  createTestQueueManager,
  waitFor,
} from '../test/fixtures/test-helpers'
import { SimpleJob, JobWithOptions } from '../test/fixtures/test-jobs'
import { isRedisAvailable, TEST_REDIS } from '../test/redis-availability'
import { InvalidJobOptionsError } from '../utils/errors'

// Integration suite against real BullMQ/Redis. No Redis reachable (e.g. CI
// without a Redis service) -> skip instead of hanging on ioredis retries.
const redisAvailable = await isRedisAvailable()

const ran: string[] = []

class ParentJob extends Job<{ id: string }, string> {
  name = 'flow-parent' as const
  async process(): Promise<string> {
    ran.push(this.name)
    return 'parent'
  }
}

class ChildAJob extends Job<{ id: string }, string> {
  name = 'flow-child-a' as const
  async process(): Promise<string> {
    ran.push(this.name)
    return 'a'
  }
}

class ChildBJob extends Job<{ id: string }, string> {
  name = 'flow-child-b' as const
  async process(): Promise<string> {
    ran.push(this.name)
    return 'b'
  }
}

describe.skipIf(!redisAvailable)('FlowProducer', () => {
  let manager: QueueManager
  let logger: ReturnType<typeof createMockLogger>
  let flow: FlowProducer

  beforeEach(() => {
    JobRegistry.getInstance()['jobs'].clear()
    ran.length = 0
    logger = createMockLogger()
    manager = createTestQueueManager({ logger })
    flow = new FlowProducer({ queueManager: manager })
  })

  afterEach(async () => {
    await flow.close()
    await manager.close()
  })

  describe('Building the flow tree', () => {
    it('adds the root and nested children with their data, in their own queues', async () => {
      await flow.add({
        name: 'import-flow',
        job: ParentJob,
        data: { id: 'root' },
        options: { jobId: 'flow-1' },
        children: [
          {
            job: ChildAJob,
            data: { id: 'a' },
            children: [{ job: 'flow-child-b', data: { id: 'b' } }],
          },
        ],
      })

      const tree = await flow.getFlow('flow-1', 'flow-parent')
      expect(tree.job).toMatchObject({ name: 'import-flow', data: { id: 'root' } })
      expect(tree.job.queueName).toBe('flow-parent')

      expect(tree.children).toHaveLength(1)
      const [a] = tree.children!
      expect(a.job).toMatchObject({ name: 'flow-child-a', data: { id: 'a' } })
      expect(a.job.queueName).toBe('flow-child-a')

      expect(a.children).toHaveLength(1)
      expect(a.children![0].job).toMatchObject({ name: 'flow-child-b', data: { id: 'b' } })
      expect(a.children![0].children ?? []).toHaveLength(0)
    })

    it('puts a root without a job in the "default" queue', async () => {
      await flow.add({ name: 'orphan-root', options: { jobId: 'flow-2' } })

      const tree = await flow.getFlow('flow-2')
      expect(tree.job.queueName).toBe('default')
      expect(tree.job.name).toBe('orphan-root')
    })

    it('returns the created tree, so the flow can be tracked without a custom jobId', async () => {
      const node = await flow.add({
        name: 'tracked',
        job: ParentJob,
        data: { id: 'root' },
        children: [{ job: ChildAJob, data: { id: 'a' } }],
      })

      expect(node.job.id).toEqual(expect.any(String))
      expect(node.job.queueName).toBe('flow-parent')
      expect(node.children).toHaveLength(1)
      expect(node.children![0].job.id).toEqual(expect.any(String))

      const tree = await flow.getFlow(node.job.id!, node.job.queueName)
      expect(tree.children![0].job.id).toBe(node.children![0].job.id)
    })

    it('logs each added flow with its root job id', async () => {
      const node = await flow.add({ name: 'logged-flow', job: SimpleJob, data: { message: 'x' } })

      expect(logger.logs).toContainEqual({
        level: 'info',
        message: 'Flow added',
        meta: { flowName: 'logged-flow', jobId: node.job.id },
      })
    })
  })

  describe('Connection', () => {
    // Regression guard: without the manager's prefix the jobs landed under
    // BullMQ's default "bull" prefix, where no worker of the manager listens.
    it("writes under the manager's prefix", async () => {
      await flow.add({
        name: 'prefixed',
        job: SimpleJob,
        data: { message: 'x' },
        options: { jobId: 'flow-3' },
      })

      const queue = new BullQueue('simple-job', {
        connection: { ...TEST_REDIS, maxRetriesPerRequest: null },
        prefix: manager['config'].prefix,
      })
      const job = await queue.getJob('flow-3')
      await queue.close()
      expect(job?.name).toBe('prefixed')
    })

    it('accepts an explicit connection', async () => {
      const custom = new FlowProducer({
        queueManager: manager,
        options: { connection: { ...TEST_REDIS, maxRetriesPerRequest: null } },
      })
      await custom.add({ name: 'custom', job: SimpleJob, data: { message: 'x' }, options: { jobId: 'flow-4' } })

      expect((await custom.getFlow('flow-4', 'simple-job')).job.name).toBe('custom')
      await custom.close()
    })
  })

  describe('Job options', () => {
    // Same precedence as QueueManager.add: manager defaults < Job.options <
    // the flow's own options. A flow used to drop the class options, so a
    // job with `attempts: 5` ran once when it was part of a flow.
    it("applies the job class options, overridable per flow node", async () => {
      await flow.add({
        name: 'opts-flow',
        job: JobWithOptions,
        data: { value: 1 },
        options: { jobId: 'flow-5', attempts: 2 },
        children: [{ job: JobWithOptions, data: { value: 2 } }],
      })

      const tree = await flow.getFlow('flow-5', 'job-with-options')
      expect(tree.job.opts.attempts).toBe(2)
      expect(tree.children![0].job.opts).toMatchObject({
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
      })
    })

    it("falls back to the manager's defaultJobOptions", async () => {
      await flow.close()
      await manager.close()
      manager = createTestQueueManager({ logger, defaultJobOptions: { priority: 7 } })
      flow = new FlowProducer({ queueManager: manager })

      await flow.add({ name: 'defaults', job: 'flow-child-a', data: {}, options: { jobId: 'flow-6' } })

      expect((await flow.getFlow('flow-6', 'flow-child-a')).job.opts.priority).toBe(7)
    })

    it('rejects invalid options on any node before adding anything, like add() does', async () => {
      await expect(
        flow.add({
          name: 'bad-opts',
          job: SimpleJob,
          data: { message: 'root' },
          options: { jobId: 'flow-7' },
          children: [{ job: SimpleJob, data: { message: 'child' }, options: { attempts: -1 } }],
        })
      ).rejects.toThrow(InvalidJobOptionsError)

      const queue = new BullQueue('simple-job', {
        connection: { ...TEST_REDIS, maxRetriesPerRequest: null },
        prefix: manager['config'].prefix,
      })
      const root = await queue.getJob('flow-7')
      await queue.close()
      expect(root).toBeUndefined()
    })
  })

  describe('Execution', () => {
    it('runs the children before the parent', async () => {
      manager.registerMany([ParentJob, ChildAJob, ChildBJob])
      await manager.createWorkers()

      await flow.add({
        name: 'run-flow',
        job: ParentJob,
        data: { id: 'root' },
        children: [
          { job: ChildAJob, data: { id: 'a' } },
          { job: ChildBJob, data: { id: 'b' } },
        ],
      })

      await waitFor(() => ran.length === 3, { timeout: 10_000 })
      expect(ran[2]).toBe('flow-parent')
      expect(ran.slice(0, 2).sort()).toEqual(['flow-child-a', 'flow-child-b'])
    })
  })

  describe('Lifecycle', () => {
    it('logs when closed', async () => {
      await flow.close()
      expect(logger.logs.some(l => l.message === 'FlowProducer closed')).toBe(true)
      // afterEach closes again: closing twice must be harmless
    })
  })
})
