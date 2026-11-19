import { describe, it, expect, vi } from 'vitest'
import { createWorkersFromConfig } from './createWorkersFromConfig'
import type { QueueManager } from '../core/QueueManager.js'
import type { Worker } from '../core/Worker.js'
import type { JobConfigStore } from './JobConfigStore.js'
import type { JobConfig } from './types.js'
import type { ILogger } from '@telamonjs/logger'

function makeConfig(overrides: Partial<JobConfig>): JobConfig {
  return {
    jobName: 'job-a',
    module: 'job',
    enabled: true,
    orphan: false,
    timezone: 'UTC',
    priority: 5,
    ...overrides,
  }
}

function makeStore(configs: JobConfig[], shouldThrow = false): JobConfigStore {
  return {
    getAll: vi.fn(async () => {
      if (shouldThrow) throw new Error('Redis unreachable')
      return configs
    }),
  } as unknown as JobConfigStore
}

function makeQueueManager(): {
  qm: QueueManager
  createWorkers: ReturnType<typeof vi.fn>
} {
  const createWorkers = vi.fn(async () => [] as Worker[])
  return { qm: { createWorkers } as unknown as QueueManager, createWorkers }
}

describe('createWorkersFromConfig', () => {
  describe('Interactions (concurrency from the store)', () => {
    it('builds concurrencyPerQueue from configs that have a concurrency value', async () => {
      const { qm, createWorkers } = makeQueueManager()
      const store = makeStore([
        makeConfig({ jobName: 'job-a', concurrency: 3 }),
        makeConfig({ jobName: 'job-b', concurrency: undefined }),
      ])

      await createWorkersFromConfig(qm, store)

      expect(createWorkers).toHaveBeenCalledWith(
        expect.objectContaining({
          concurrencyPerQueue: { 'job-a': 3 },
        })
      )
    })

    it('merges the base WorkerConfig with the derived concurrencyPerQueue', async () => {
      const { qm, createWorkers } = makeQueueManager()
      const store = makeStore([makeConfig({ jobName: 'job-a', concurrency: 3 })])

      await createWorkersFromConfig(qm, store, { concurrency: 2, autoRun: false })

      expect(createWorkers).toHaveBeenCalledWith(
        expect.objectContaining({
          concurrency: 2,
          autoRun: false,
          concurrencyPerQueue: { 'job-a': 3 },
        })
      )
    })

    it('an explicit concurrencyPerQueue entry in the call-site config wins over the store', async () => {
      const { qm, createWorkers } = makeQueueManager()
      const store = makeStore([makeConfig({ jobName: 'job-a', concurrency: 3 })])

      await createWorkersFromConfig(qm, store, {
        concurrencyPerQueue: { 'job-a': 9 },
      })

      expect(createWorkers).toHaveBeenCalledWith(
        expect.objectContaining({ concurrencyPerQueue: { 'job-a': 9 } })
      )
    })

    it('returns whatever queueManager.createWorkers() returns', async () => {
      const fakeWorkers = [{ name: 'job-a' }] as unknown as Worker[]
      const qm = {
        createWorkers: vi.fn(async () => fakeWorkers),
      } as unknown as QueueManager
      const store = makeStore([])

      const result = await createWorkersFromConfig(qm, store)

      expect(result).toBe(fakeWorkers)
    })
  })

  describe('Edge Cases (store outage)', () => {
    it('falls back to createWorkers(config) as-is when store.getAll() throws', async () => {
      const { qm, createWorkers } = makeQueueManager()
      const store = makeStore([], true)

      await createWorkersFromConfig(qm, store, { concurrency: 4 })

      expect(createWorkers).toHaveBeenCalledWith({ concurrency: 4 })
    })

    it('logs the fallback', async () => {
      const { qm } = makeQueueManager()
      const store = makeStore([], true)
      const logger = {
        debug() {},
        info() {},
        warn() {},
        error: vi.fn(),
      } as unknown as ILogger

      await createWorkersFromConfig(qm, store, undefined, { logger })

      expect(logger.error).toHaveBeenCalled()
    })
  })
})
