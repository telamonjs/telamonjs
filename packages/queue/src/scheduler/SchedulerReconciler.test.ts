import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Redis as IORedis } from 'ioredis'
import { SchedulerReconciler } from './SchedulerReconciler'
import { QueueRegistry as RealQueueRegistry } from '../core/QueueRegistry.js'
import { JobConfigStore as RealJobConfigStore } from '../job-config/JobConfigStore.js'
import type { QueueRegistry } from '../core/QueueRegistry.js'
import type { JobConstructor } from '../core/types.js'
import type { JobConfigStore } from '../job-config/JobConfigStore.js'
import type { JobConfig } from '../job-config/types.js'
import {
  SimpleJob,
  JobWithOptions,
  JobWithLegacySchedule,
} from '../test/fixtures/test-jobs'
import { createTestRedisConfig, createTestRawRedis } from '../test/fixtures/test-helpers'
import { closeRedis } from '../utils/redis.js'
import { isRedisAvailable } from '../test/redis-availability'
import type { ILogger } from '@telamonjs/logger'

const redisAvailable = await isRedisAvailable()

// ============================================================================
// Fakes (no Redis needed)
// ============================================================================

interface FakeRepeatable {
  key: string
  name: string
}

function makeFakeQueue() {
  let repeatables: FakeRepeatable[] = []
  return {
    getRepeatableJobs: vi.fn(async () => repeatables),
    removeRepeatableByKey: vi.fn(async (key: string) => {
      repeatables = repeatables.filter(r => r.key !== key)
    }),
    add: vi.fn(async (name: string) => {
      const key = `${name}:repeatable:${repeatables.length + 1}`
      repeatables = [...repeatables, { key, name }]
      return { id: 'job-id' }
    }),
    // test helper, not part of the real bullmq Queue API
    __setRepeatables(jobs: FakeRepeatable[]) {
      repeatables = jobs
    },
  }
}

type FakeQueue = ReturnType<typeof makeFakeQueue>

function makeFakeRegistry(): {
  registry: QueueRegistry
  queues: Map<string, FakeQueue>
} {
  const queues = new Map<string, FakeQueue>()
  const getQueue = vi.fn((name: string) => {
    if (!queues.has(name)) queues.set(name, makeFakeQueue())
    return queues.get(name)!
  })
  return { registry: { getQueue } as unknown as QueueRegistry, queues }
}

function makeConfig(overrides: Partial<JobConfig>): JobConfig {
  return {
    jobName: 'simple-job',
    module: 'simple',
    enabled: true,
    orphan: false,
    timezone: 'UTC',
    priority: 5,
    cronPattern: '*/5 * * * *',
    ...overrides,
  }
}

function makeFakeStore(...configsSequence: JobConfig[][]): {
  store: JobConfigStore
  getEnabledWithCron: ReturnType<typeof vi.fn>
} {
  let call = 0
  const getEnabledWithCron = vi.fn(async () => {
    const result = configsSequence[Math.min(call, configsSequence.length - 1)] ?? []
    call++
    return result
  })
  return {
    store: { getEnabledWithCron } as unknown as JobConfigStore,
    getEnabledWithCron,
  }
}

function jobsMap(...entries: Array<[string, JobConstructor]>) {
  return new Map<string, JobConstructor>(entries)
}

// ============================================================================
// Tests
// ============================================================================

describe('SchedulerReconciler', () => {
  describe('Constructor guard (Job.schedule deprecation)', () => {
    it('throws if any job in the list still declares the removed schedule field', () => {
      const { registry } = makeFakeRegistry()
      const { store } = makeFakeStore([])
      const jobs = jobsMap(
        ['simple-job', SimpleJob as unknown as JobConstructor],
        ['job-with-legacy-schedule', JobWithLegacySchedule as unknown as JobConstructor]
      )

      expect(() => new SchedulerReconciler(registry, store, jobs)).toThrow(
        /job-with-legacy-schedule/
      )
    })

    it('does not throw when no job in the list has Job.schedule set', () => {
      const { registry } = makeFakeRegistry()
      const { store } = makeFakeStore([])
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])

      expect(() => new SchedulerReconciler(registry, store, jobs)).not.toThrow()
    })
  })

  describe('reconcile() - adding jobs', () => {
    it('schedules a repeatable job for each enabled+cron config not yet scheduled', async () => {
      const { registry, queues } = makeFakeRegistry()
      const { store } = makeFakeStore([
        makeConfig({ jobName: 'simple-job', cronPattern: '0 9 * * *', timezone: 'UTC', priority: 4 }),
      ])
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])

      const reconciler = new SchedulerReconciler(registry, store, jobs)
      await reconciler.reconcile()

      const queue = queues.get('simple-job')!
      expect(queue.add).toHaveBeenCalledWith(
        'simple-job',
        {},
        expect.objectContaining({
          repeat: { pattern: '0 9 * * *', tz: 'UTC' },
          priority: 4,
        })
      )
    })

    it('merges Job.options into the repeatable job options (decoupled from any contract map)', async () => {
      const { registry, queues } = makeFakeRegistry()
      const { store } = makeFakeStore([
        makeConfig({ jobName: 'job-with-options', cronPattern: '0 9 * * *' }),
      ])
      const jobs = jobsMap([
        'job-with-options',
        JobWithOptions as unknown as JobConstructor,
      ])

      const reconciler = new SchedulerReconciler(registry, store, jobs)
      await reconciler.reconcile()

      const queue = queues.get('job-with-options')!
      expect(queue.add).toHaveBeenCalledWith(
        'job-with-options',
        {},
        expect.objectContaining({ attempts: 5 }) // JobWithOptions.options.attempts
      )
    })

    it('updates getStats() after scheduling', async () => {
      const { registry } = makeFakeRegistry()
      const { store } = makeFakeStore([
        makeConfig({ jobName: 'simple-job', cronPattern: '0 9 * * *' }),
      ])
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])

      const reconciler = new SchedulerReconciler(registry, store, jobs)
      await reconciler.reconcile()

      const stats = reconciler.getStats()
      expect(stats.scheduledJobs).toBe(1)
      expect(stats.jobs[0]).toMatchObject({
        name: 'simple-job',
        cronPattern: '0 9 * * *',
      })
    })

    it('skips (and warns) a desired config whose job class is not in the code map', async () => {
      const { registry } = makeFakeRegistry()
      const { store } = makeFakeStore([
        makeConfig({ jobName: 'ghost-job', cronPattern: '0 9 * * *' }),
      ])
      const logger = {
        debug() {},
        info() {},
        warn: vi.fn(),
        error: vi.fn(),
      } as unknown as ILogger
      const jobs = jobsMap() // empty - no code class for 'ghost-job'

      const reconciler = new SchedulerReconciler(registry, store, jobs, { logger })
      await reconciler.reconcile()

      expect(logger.warn).toHaveBeenCalled()
      expect(reconciler.getStats().scheduledJobs).toBe(0)
    })
  })

  describe('reconcile() - removing jobs', () => {
    it('removes a scheduled repeatable whose config is no longer enabled+cron', async () => {
      const { registry, queues } = makeFakeRegistry()
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])

      // Cycle 1: job desired -> scheduled
      const { store } = makeFakeStore(
        [makeConfig({ jobName: 'simple-job' })],
        [] // Cycle 2: no longer desired (disabled or no cron)
      )
      const reconciler = new SchedulerReconciler(registry, store, jobs)

      await reconciler.reconcile()
      expect(reconciler.getStats().scheduledJobs).toBe(1)

      await reconciler.reconcile()

      const queue = queues.get('simple-job')!
      expect(queue.removeRepeatableByKey).toHaveBeenCalled()
      expect(reconciler.getStats().scheduledJobs).toBe(0)
    })
  })

  describe('reconcile() - updating jobs', () => {
    it('removes and re-adds when cronPattern changes between cycles', async () => {
      const { registry, queues } = makeFakeRegistry()
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])
      const { store } = makeFakeStore(
        [makeConfig({ jobName: 'simple-job', cronPattern: '0 9 * * *' })],
        [makeConfig({ jobName: 'simple-job', cronPattern: '0 10 * * *' })]
      )
      const reconciler = new SchedulerReconciler(registry, store, jobs)

      await reconciler.reconcile()
      await reconciler.reconcile()

      const queue = queues.get('simple-job')!
      expect(queue.removeRepeatableByKey).toHaveBeenCalled()
      expect(reconciler.getStats().jobs[0].cronPattern).toBe('0 10 * * *')
    })

    it('does nothing when the config is unchanged between cycles', async () => {
      const { registry, queues } = makeFakeRegistry()
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])
      const config = makeConfig({ jobName: 'simple-job', cronPattern: '0 9 * * *' })
      const { store } = makeFakeStore([config], [config])
      const reconciler = new SchedulerReconciler(registry, store, jobs)

      await reconciler.reconcile()
      const queue = queues.get('simple-job')!
      const addCallsAfterFirst = queue.add.mock.calls.length

      await reconciler.reconcile()

      expect(queue.add.mock.calls.length).toBe(addCallsAfterFirst)
    })
  })

  describe('Edge Cases (resilience)', () => {
    it('does not throw when the store rejects, and logs the error instead', async () => {
      const { registry } = makeFakeRegistry()
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])
      const store = {
        getEnabledWithCron: vi.fn(async () => {
          throw new Error('Redis unreachable')
        }),
      } as unknown as JobConfigStore
      const logger = {
        debug() {},
        info() {},
        warn() {},
        error: vi.fn(),
      } as unknown as ILogger

      const reconciler = new SchedulerReconciler(registry, store, jobs, { logger })

      await expect(reconciler.reconcile()).resolves.not.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })

    it('warns (with job name and message) when reading one job from Redis fails, and keeps going', async () => {
      const { registry, queues } = makeFakeRegistry()
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])
      const { store } = makeFakeStore([])
      const logger = {
        debug() {},
        info() {},
        warn: vi.fn(),
        error: vi.fn(),
      } as unknown as ILogger
      const queue = makeFakeQueue()
      queue.getRepeatableJobs.mockRejectedValueOnce(new Error('WRONGTYPE'))
      queues.set('simple-job', queue)

      const reconciler = new SchedulerReconciler(registry, store, jobs, { logger })
      await expect(reconciler.reconcile()).resolves.not.toThrow()

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('SchedulerReconciler'),
        expect.objectContaining({ jobName: 'simple-job', error: 'WRONGTYPE' })
      )
      expect(logger.error).not.toHaveBeenCalled()
    })
  })

  describe('start()/stop() lifecycle', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('start() reconciles immediately and then on the configured interval', async () => {
      const { registry } = makeFakeRegistry()
      const { store, getEnabledWithCron } = makeFakeStore([])
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])
      const reconciler = new SchedulerReconciler(registry, store, jobs, {
        reconcileIntervalMs: 1000,
      })

      await reconciler.start()
      expect(getEnabledWithCron).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(1000)
      expect(getEnabledWithCron).toHaveBeenCalledTimes(2)

      reconciler.stop()
    })

    it('stop() halts the interval loop', async () => {
      const { registry } = makeFakeRegistry()
      const { store, getEnabledWithCron } = makeFakeStore([])
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])
      const reconciler = new SchedulerReconciler(registry, store, jobs, {
        reconcileIntervalMs: 1000,
      })

      await reconciler.start()
      reconciler.stop()

      const callsAtStop = getEnabledWithCron.mock.calls.length
      await vi.advanceTimersByTimeAsync(5000)

      expect(getEnabledWithCron.mock.calls.length).toBe(callsAtStop)
    })

    it('stop() does not close the caller-owned QueueRegistry or JobConfigStore', async () => {
      const { registry } = makeFakeRegistry()
      const { store } = makeFakeStore([])
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])
      const closeRegistry = vi.fn()
      ;(registry as unknown as { close: typeof closeRegistry }).close = closeRegistry
      const closeStore = vi.fn()
      ;(store as unknown as { close: typeof closeStore }).close = closeStore

      const reconciler = new SchedulerReconciler(registry, store, jobs)
      await reconciler.start()
      reconciler.stop()

      expect(closeRegistry).not.toHaveBeenCalled()
      expect(closeStore).not.toHaveBeenCalled()
    })
  })
})

// ============================================================================
// Integration (real Redis + real QueueRegistry/JobConfigStore/BullMQ)
// ============================================================================

describe.skipIf(!redisAvailable)('SchedulerReconciler (integration)', () => {
  let raw: IORedis
  let prefix: string
  let keyPrefix: string
  let registry: RealQueueRegistry
  let store: RealJobConfigStore
  let reconciler: SchedulerReconciler | undefined

  beforeEach(() => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    prefix = `test-scheduler-${unique}`
    keyPrefix = `test:scheduler-config:${unique}:`
    raw = createTestRawRedis()
    registry = new RealQueueRegistry({ redis: createTestRedisConfig(), prefix })
    store = new RealJobConfigStore({ redis: createTestRedisConfig(), keyPrefix })
  })

  afterEach(async () => {
    reconciler?.stop()
    reconciler = undefined
    await registry.close()
    const keys = await raw.keys(`${keyPrefix}*`)
    if (keys.length > 0) await raw.del(...keys)
    await store.close()
    await closeRedis(raw)
  })

  it('creates a real BullMQ repeatable job for an enabled config with a cron pattern', async () => {
    const jobs = new Map<string, JobConstructor>([
      ['simple-job', SimpleJob as unknown as JobConstructor],
    ])
    await store.set('simple-job', {
      module: 'simple',
      enabled: true,
      orphan: false,
      cronPattern: '0 9 * * *',
      timezone: 'UTC',
      priority: 5,
    })

    reconciler = new SchedulerReconciler(registry, store, jobs)
    await reconciler.reconcile()

    const queue = registry.getQueue('simple-job')
    const repeatables = await queue.getRepeatableJobs()
    expect(repeatables).toHaveLength(1)
    expect(repeatables[0].pattern).toBe('0 9 * * *')
  })

  it('removes the real repeatable job when the config is disabled', async () => {
    const jobs = new Map<string, JobConstructor>([
      ['simple-job', SimpleJob as unknown as JobConstructor],
    ])
    await store.set('simple-job', {
      module: 'simple',
      enabled: true,
      orphan: false,
      cronPattern: '0 9 * * *',
      timezone: 'UTC',
      priority: 5,
    })
    reconciler = new SchedulerReconciler(registry, store, jobs)
    await reconciler.reconcile()

    await store.toggleEnabled('simple-job', false)
    await reconciler.reconcile()

    const queue = registry.getQueue('simple-job')
    const repeatables = await queue.getRepeatableJobs()
    expect(repeatables).toHaveLength(0)
  })

  it('self-heals after a fresh reconciler instance (restart simulation)', async () => {
    const jobs = new Map<string, JobConstructor>([
      ['simple-job', SimpleJob as unknown as JobConstructor],
    ])
    await store.set('simple-job', {
      module: 'simple',
      enabled: true,
      orphan: false,
      cronPattern: '0 9 * * *',
      timezone: 'UTC',
      priority: 5,
    })
    const first = new SchedulerReconciler(registry, store, jobs)
    await first.reconcile()
    first.stop()

    // A brand new reconciler instance (simulating a process restart) reads
    // scheduled state from Redis via getRepeatableJobsFromRedis(), not from
    // in-memory state - so it must recognize the already-scheduled job.
    const second = new SchedulerReconciler(registry, store, jobs)
    await second.reconcile()
    reconciler = second

    const queue = registry.getQueue('simple-job')
    const repeatables = await queue.getRepeatableJobs()
    // Reconciling twice for the same unchanged config must not create a
    // second, duplicate repeatable job.
    expect(repeatables).toHaveLength(1)
  })
})
