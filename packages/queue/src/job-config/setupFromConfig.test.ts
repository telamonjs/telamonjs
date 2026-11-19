import { describe, it, expect, vi } from 'vitest'
import { setupFromConfig } from './setupFromConfig'
import type { QueueManager } from '../core/QueueManager.js'
import type { JobConstructor } from '../core/types.js'
import type { JobConfigStore, BootstrapResult } from './JobConfigStore.js'
import type { JobConfig } from './types.js'
import type { ILogger } from '@telamonjs/logger'

class FakeJobA {
  name = 'job-a'
  configDefaults = { cronPattern: '0 9 * * *', enabled: true, priority: 3 }
  async process() {}
}
class FakeJobB {
  name = 'job-b'
  async process() {} // no configDefaults
}

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

const emptyBootstrapResult: BootstrapResult = {
  added: 0,
  restored: 0,
  orphaned: 0,
  backfilled: 0,
}

function makeStore(opts: {
  configs?: JobConfig[]
  bootstrapResult?: BootstrapResult
  bootstrapThrows?: boolean
  getAllThrows?: boolean
}): { store: JobConfigStore; bootstrap: ReturnType<typeof vi.fn> } {
  const bootstrap = vi.fn(async () => {
    if (opts.bootstrapThrows) throw new Error('bootstrap Redis unreachable')
    return opts.bootstrapResult ?? emptyBootstrapResult
  })
  const store = {
    bootstrap,
    getAll: vi.fn(async () => {
      if (opts.getAllThrows) throw new Error('getAll Redis unreachable')
      return opts.configs ?? []
    }),
  } as unknown as JobConfigStore
  return { store, bootstrap }
}

function makeQueueManager() {
  return { register: vi.fn() } as unknown as QueueManager
}

describe('setupFromConfig', () => {
  describe('Interactions (bootstrap -> registerFromConfig composition)', () => {
    it('calls store.bootstrap() with job names and derived defaults, then registers enabled jobs', async () => {
      const qm = makeQueueManager()
      const { store, bootstrap } = makeStore({
        configs: [makeConfig({ jobName: 'job-a', enabled: true, orphan: false })],
      })
      const jobs = new Map<string, JobConstructor>([
        ['job-a', FakeJobA as unknown as JobConstructor],
        ['job-b', FakeJobB as unknown as JobConstructor],
      ])

      const result = await setupFromConfig(qm, store, jobs)

      expect(bootstrap).toHaveBeenCalledWith(
        expect.arrayContaining(['job-a', 'job-b']),
        expect.objectContaining({
          'job-a': { cronPattern: '0 9 * * *', enabled: true, priority: 3 },
        })
      )
      expect(result.registered).toEqual(['job-a'])
      expect(qm.register).toHaveBeenCalledTimes(1)
    })

    it('derives defaults only for jobs that declare Job.configDefaults', async () => {
      const qm = makeQueueManager()
      const { store, bootstrap } = makeStore({})
      const jobs = new Map<string, JobConstructor>([
        ['job-a', FakeJobA as unknown as JobConstructor],
        ['job-b', FakeJobB as unknown as JobConstructor],
      ])

      await setupFromConfig(qm, store, jobs)

      const [, defaultsArg] = bootstrap.mock.calls[0]
      expect(defaultsArg).not.toHaveProperty('job-b')
    })

    it('opts.defaults overrides Job.configDefaults for the same job name', async () => {
      const qm = makeQueueManager()
      const { store, bootstrap } = makeStore({})
      const jobs = new Map<string, JobConstructor>([
        ['job-a', FakeJobA as unknown as JobConstructor],
      ])

      await setupFromConfig(qm, store, jobs, {
        defaults: { 'job-a': { priority: 9 } },
      })

      const [, defaultsArg] = bootstrap.mock.calls[0]
      // opts.defaults wins field-by-field over Job.configDefaults
      expect(defaultsArg['job-a'].priority).toBe(9)
      expect(defaultsArg['job-a'].cronPattern).toBe('0 9 * * *')
    })

    it('opts.defaults can seed a job that has no Job.configDefaults at all', async () => {
      const qm = makeQueueManager()
      const { store, bootstrap } = makeStore({})
      const jobs = new Map<string, JobConstructor>([
        ['job-b', FakeJobB as unknown as JobConstructor],
      ])

      await setupFromConfig(qm, store, jobs, {
        defaults: { 'job-b': { enabled: true } },
      })

      const [, defaultsArg] = bootstrap.mock.calls[0]
      expect(defaultsArg['job-b']).toEqual({ enabled: true })
    })

    it('returns the bootstrap result alongside the registration result', async () => {
      const qm = makeQueueManager()
      const bootstrapResult: BootstrapResult = {
        added: 1,
        restored: 0,
        orphaned: 0,
        backfilled: 2,
      }
      const { store } = makeStore({ bootstrapResult })
      const jobs = new Map<string, JobConstructor>([
        ['job-a', FakeJobA as unknown as JobConstructor],
      ])

      const result = await setupFromConfig(qm, store, jobs)

      expect(result.bootstrap).toEqual(bootstrapResult)
    })
  })

  describe('Edge Cases (bootstrap outage is best-effort)', () => {
    it('logs and proceeds to registerFromConfig when store.bootstrap() throws', async () => {
      const qm = makeQueueManager()
      const { store } = makeStore({
        bootstrapThrows: true,
        configs: [makeConfig({ jobName: 'job-a', enabled: true, orphan: false })],
      })
      const jobs = new Map<string, JobConstructor>([
        ['job-a', FakeJobA as unknown as JobConstructor],
      ])
      const logger = {
        debug() {},
        info() {},
        warn() {},
        error: vi.fn(),
      } as unknown as ILogger

      const result = await setupFromConfig(qm, store, jobs, { logger })

      expect(result.bootstrap).toBeNull()
      expect(logger.error).toHaveBeenCalled()
      // registerFromConfig still ran against store.getAll()
      expect(result.registered).toEqual(['job-a'])
    })

    it('falls back to registering every job when store.getAll() also throws', async () => {
      const qm = makeQueueManager()
      const { store } = makeStore({ bootstrapThrows: true, getAllThrows: true })
      const jobs = new Map<string, JobConstructor>([
        ['job-a', FakeJobA as unknown as JobConstructor],
        ['job-b', FakeJobB as unknown as JobConstructor],
      ])

      const result = await setupFromConfig(qm, store, jobs)

      expect(result.mode).toBe('fallback')
      expect(result.registered.sort()).toEqual(['job-a', 'job-b'])
    })
  })
})
