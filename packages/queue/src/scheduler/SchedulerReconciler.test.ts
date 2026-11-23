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

/**
 * Mirrors what `Queue.getJobSchedulers()` returns: job schedulers carry an
 * `iterationCount`, legacy repeatables (created with `add(..., { repeat })`)
 * do not and have a hash (or `name:id:...`) key.
 */
interface FakeSchedule {
  key: string
  name: string
  pattern?: string
  tz?: string
  iterationCount?: number
}

function makeFakeQueue() {
  let schedules: FakeSchedule[] = []
  return {
    getJobSchedulers: vi.fn(async () => schedules),
    upsertJobScheduler: vi.fn(
      async (
        id: string,
        repeat: { pattern: string; tz?: string },
        template?: { name?: string }
      ) => {
        schedules = [
          ...schedules.filter(s => s.key !== id),
          {
            key: id,
            name: template?.name ?? id,
            pattern: repeat.pattern,
            tz: repeat.tz,
            iterationCount: 1,
          },
        ]
        return { id: `repeat:${id}:1` }
      }
    ),
    removeJobScheduler: vi.fn(async (id: string) => {
      schedules = schedules.filter(s => s.key !== id)
      return true
    }),
    removeRepeatableByKey: vi.fn(async (key: string) => {
      schedules = schedules.filter(s => s.key !== key)
      return true
    }),
    // test helper, not part of the real bullmq Queue API
    __setSchedules(next: FakeSchedule[]) {
      schedules = next
    },
    __schedules() {
      return schedules
    },
  }
}

type FakeQueue = ReturnType<typeof makeFakeQueue>

function makeFakeRegistry(): {
  registry: QueueRegistry
  queues: Map<string, FakeQueue>
  queueFor: (name: string) => FakeQueue
} {
  const queues = new Map<string, FakeQueue>()
  const queueFor = (name: string) => {
    if (!queues.has(name)) queues.set(name, makeFakeQueue())
    return queues.get(name)!
  }
  const getQueue = vi.fn(queueFor)
  return { registry: { getQueue } as unknown as QueueRegistry, queues, queueFor }
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

function makeLogger() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}

/** The `{ added, removed, updated }` of the last "completed with changes" log. */
function lastSummary(logger: ReturnType<typeof makeLogger>) {
  const calls = logger.info.mock.calls.filter(([msg]) =>
    String(msg).includes('completed with changes')
  )
  const last = calls.at(-1)?.[1] as
    | { added: number; removed: number; updated: number }
    | undefined
  return last && { added: last.added, removed: last.removed, updated: last.updated }
}

const LEGACY_KEY = '113877dfcad1a0d7f3e67e26864b3550'

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
    it('upserts a job scheduler (id = job name) for each enabled+cron config', async () => {
      const { registry, queues } = makeFakeRegistry()
      const { store } = makeFakeStore([
        makeConfig({ jobName: 'simple-job', cronPattern: '0 9 * * *', timezone: 'UTC', priority: 4 }),
      ])
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])

      const reconciler = new SchedulerReconciler(registry, store, jobs)
      await reconciler.reconcile()

      const queue = queues.get('simple-job')!
      expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
        'simple-job',
        { pattern: '0 9 * * *', tz: 'UTC' },
        { name: 'simple-job', data: {}, opts: expect.objectContaining({ priority: 4 }) }
      )
      expect(queue.removeRepeatableByKey).not.toHaveBeenCalled()
    })

    it('merges Job.options into the scheduler job template (decoupled from any contract map)', async () => {
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
      expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
        'job-with-options',
        expect.anything(),
        expect.objectContaining({
          opts: expect.objectContaining({ attempts: 5 }), // JobWithOptions.options.attempts
        })
      )
    })

    it('leaves jobId/delay out of the template (a scheduler owns both)', async () => {
      class JobWithIdAndDelay extends SimpleJob {
        options = { attempts: 2, jobId: 'fixed', delay: 1000 }
      }
      const { registry, queues } = makeFakeRegistry()
      const { store } = makeFakeStore([makeConfig({ jobName: 'simple-job' })])
      const jobs = jobsMap(['simple-job', JobWithIdAndDelay as unknown as JobConstructor])

      await new SchedulerReconciler(registry, store, jobs).reconcile()

      const [, , template] = queues.get('simple-job')!.upsertJobScheduler.mock.calls[0]
      const opts = (template as { opts: Record<string, unknown> }).opts
      expect(opts).toMatchObject({ attempts: 2 })
      expect(opts).not.toHaveProperty('jobId')
      expect(opts).not.toHaveProperty('delay')
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
      const logger = makeLogger()
      const jobs = jobsMap() // empty - no code class for 'ghost-job'

      const reconciler = new SchedulerReconciler(registry, store, jobs, {
        logger: logger as unknown as ILogger,
      })
      await reconciler.reconcile()

      expect(logger.warn).toHaveBeenCalled()
      expect(reconciler.getStats().scheduledJobs).toBe(0)
    })

    it('does not count a job whose upsert fails, and logs the error', async () => {
      const { registry, queueFor } = makeFakeRegistry()
      queueFor('simple-job').upsertJobScheduler.mockRejectedValueOnce(new Error('NOSCRIPT'))
      const { store } = makeFakeStore([makeConfig({ jobName: 'simple-job' })])
      const logger = makeLogger()
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])

      const reconciler = new SchedulerReconciler(registry, store, jobs, {
        logger: logger as unknown as ILogger,
      })
      await reconciler.reconcile()

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('failed to schedule'),
        expect.objectContaining({ jobName: 'simple-job', error: 'NOSCRIPT' })
      )
      expect(reconciler.getStats().scheduledJobs).toBe(0)
      expect(lastSummary(logger)).toBeUndefined()
    })
  })

  describe('reconcile() - removing jobs', () => {
    it('removes the job scheduler whose config is no longer enabled+cron', async () => {
      const { registry, queues } = makeFakeRegistry()
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])
      const logger = makeLogger()

      // Cycle 1: job desired -> scheduled
      const { store } = makeFakeStore(
        [makeConfig({ jobName: 'simple-job' })],
        [] // Cycle 2: no longer desired (disabled or no cron)
      )
      const reconciler = new SchedulerReconciler(registry, store, jobs, {
        logger: logger as unknown as ILogger,
      })

      await reconciler.reconcile()
      expect(reconciler.getStats().scheduledJobs).toBe(1)

      await reconciler.reconcile()

      const queue = queues.get('simple-job')!
      expect(queue.removeJobScheduler).toHaveBeenCalledWith('simple-job')
      expect(queue.__schedules()).toEqual([])
      expect(reconciler.getStats().scheduledJobs).toBe(0)
      expect(lastSummary(logger)).toEqual({ added: 0, removed: 1, updated: 0 })
    })

    it('removes a schedule left in Redis by a previous process (not in memory)', async () => {
      const { registry, queueFor } = makeFakeRegistry()
      queueFor('simple-job').__setSchedules([
        { key: 'simple-job', name: 'simple-job', pattern: '0 9 * * *', iterationCount: 3 },
      ])
      const { store } = makeFakeStore([])
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])

      await new SchedulerReconciler(registry, store, jobs).reconcile()

      expect(queueFor('simple-job').removeJobScheduler).toHaveBeenCalledWith('simple-job')
      expect(queueFor('simple-job').__schedules()).toEqual([])
    })

    it('ignores schedules of other job names sharing the queue', async () => {
      const { registry, queueFor } = makeFakeRegistry()
      queueFor('simple-job').__setSchedules([
        { key: 'someone-else', name: 'someone-else', pattern: '0 9 * * *', iterationCount: 1 },
      ])
      const { store } = makeFakeStore([])
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])

      await new SchedulerReconciler(registry, store, jobs).reconcile()

      expect(queueFor('simple-job').__schedules()).toHaveLength(1)
    })
  })

  describe('reconcile() - updating jobs', () => {
    it('re-upserts the same scheduler id when cronPattern changes between cycles', async () => {
      const { registry, queues } = makeFakeRegistry()
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])
      const logger = makeLogger()
      const { store } = makeFakeStore(
        [makeConfig({ jobName: 'simple-job', cronPattern: '0 9 * * *' })],
        [makeConfig({ jobName: 'simple-job', cronPattern: '0 10 * * *' })]
      )
      const reconciler = new SchedulerReconciler(registry, store, jobs, {
        logger: logger as unknown as ILogger,
      })

      await reconciler.reconcile()
      expect(lastSummary(logger)).toEqual({ added: 1, removed: 0, updated: 0 })
      await reconciler.reconcile()

      const queue = queues.get('simple-job')!
      expect(queue.upsertJobScheduler).toHaveBeenLastCalledWith(
        'simple-job',
        { pattern: '0 10 * * *', tz: 'UTC' },
        expect.anything()
      )
      // upsert overrides in place - one scheduler, no remove-then-add window
      expect(queue.__schedules()).toEqual([
        expect.objectContaining({ key: 'simple-job', pattern: '0 10 * * *' }),
      ])
      expect(reconciler.getStats().jobs[0].cronPattern).toBe('0 10 * * *')
      expect(lastSummary(logger)).toEqual({ added: 0, removed: 0, updated: 1 })
    })

    it.each([
      ['timezone', { timezone: 'America/Sao_Paulo' }],
      ['priority', { priority: 1 }],
    ])('re-upserts when %s changes', async (_field, change) => {
      const { registry, queues } = makeFakeRegistry()
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])
      const { store } = makeFakeStore(
        [makeConfig({ jobName: 'simple-job' })],
        [makeConfig({ jobName: 'simple-job', ...change })]
      )
      const reconciler = new SchedulerReconciler(registry, store, jobs)

      await reconciler.reconcile()
      await reconciler.reconcile()

      expect(queues.get('simple-job')!.upsertJobScheduler).toHaveBeenCalledTimes(2)
    })

    it('does nothing when the config is unchanged between cycles', async () => {
      const { registry, queues } = makeFakeRegistry()
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])
      const config = makeConfig({ jobName: 'simple-job', cronPattern: '0 9 * * *' })
      const { store } = makeFakeStore([config], [config])
      const reconciler = new SchedulerReconciler(registry, store, jobs)

      await reconciler.reconcile()
      const queue = queues.get('simple-job')!
      const upsertsAfterFirst = queue.upsertJobScheduler.mock.calls.length

      await reconciler.reconcile()

      expect(queue.upsertJobScheduler.mock.calls.length).toBe(upsertsAfterFirst)
    })
  })

  describe('reconcile() - legacy repeatables (pre-upgrade deployments)', () => {
    it('replaces a legacy repeatable with a job scheduler on the first reconcile after upgrade', async () => {
      const { registry, queueFor } = makeFakeRegistry()
      queueFor('simple-job').__setSchedules([
        { key: LEGACY_KEY, name: 'simple-job', pattern: '0 9 * * *', tz: 'UTC' },
      ])
      const { store } = makeFakeStore([
        makeConfig({ jobName: 'simple-job', cronPattern: '0 9 * * *' }),
      ])
      const logger = makeLogger()
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])

      await new SchedulerReconciler(registry, store, jobs, {
        logger: logger as unknown as ILogger,
      }).reconcile()

      const queue = queueFor('simple-job')
      expect(queue.removeRepeatableByKey).toHaveBeenCalledWith(LEGACY_KEY)
      expect(queue.removeJobScheduler).not.toHaveBeenCalled()
      expect(queue.__schedules()).toEqual([
        expect.objectContaining({ key: 'simple-job', iterationCount: 1 }),
      ])
      // Same count a fresh process always reported: one job (re)scheduled.
      expect(lastSummary(logger)).toEqual({ added: 1, removed: 0, updated: 0 })
    })

    it('removes the legacy repeatable before upserting, so the two never coexist', async () => {
      const { registry, queueFor } = makeFakeRegistry()
      const queue = queueFor('simple-job')
      queue.__setSchedules([{ key: LEGACY_KEY, name: 'simple-job', pattern: '0 9 * * *' }])
      const { store } = makeFakeStore([makeConfig({ jobName: 'simple-job' })])
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])

      await new SchedulerReconciler(registry, store, jobs).reconcile()

      const removedAt = queue.removeRepeatableByKey.mock.invocationCallOrder[0]
      const upsertedAt = queue.upsertJobScheduler.mock.invocationCallOrder[0]
      expect(removedAt).toBeLessThan(upsertedAt)
    })

    it('removes every legacy repeatable of a job (old code could leave several)', async () => {
      const { registry, queueFor } = makeFakeRegistry()
      queueFor('simple-job').__setSchedules([
        { key: LEGACY_KEY, name: 'simple-job', pattern: '0 9 * * *' },
        { key: 'simple-job::::0 8 * * *', name: 'simple-job', pattern: '0 8 * * *' },
      ])
      const { store } = makeFakeStore([makeConfig({ jobName: 'simple-job' })])
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])

      await new SchedulerReconciler(registry, store, jobs).reconcile()

      expect(queueFor('simple-job').removeRepeatableByKey).toHaveBeenCalledTimes(2)
      expect(queueFor('simple-job').__schedules()).toHaveLength(1)
    })

    it('removes a legacy repeatable of a job that is no longer desired, counting it as removed', async () => {
      const { registry, queueFor } = makeFakeRegistry()
      queueFor('simple-job').__setSchedules([
        { key: LEGACY_KEY, name: 'simple-job', pattern: '0 9 * * *' },
      ])
      const { store } = makeFakeStore([])
      const logger = makeLogger()
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])

      await new SchedulerReconciler(registry, store, jobs, {
        logger: logger as unknown as ILogger,
      }).reconcile()

      expect(queueFor('simple-job').removeRepeatableByKey).toHaveBeenCalledWith(LEGACY_KEY)
      expect(queueFor('simple-job').__schedules()).toEqual([])
      expect(lastSummary(logger)).toEqual({ added: 0, removed: 1, updated: 0 })
    })

    it('cleans up a legacy repeatable that appears while the job is already scheduled (rolling deploy)', async () => {
      const { registry, queueFor } = makeFakeRegistry()
      const config = makeConfig({ jobName: 'simple-job' })
      const { store } = makeFakeStore([config], [config])
      const logger = makeLogger()
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])
      const reconciler = new SchedulerReconciler(registry, store, jobs, {
        logger: logger as unknown as ILogger,
      })

      await reconciler.reconcile()
      // An instance still on the old version re-creates its repeatable.
      const queue = queueFor('simple-job')
      queue.__setSchedules([
        ...queue.__schedules(),
        { key: LEGACY_KEY, name: 'simple-job', pattern: config.cronPattern! },
      ])

      await reconciler.reconcile()

      expect(queue.removeRepeatableByKey).toHaveBeenCalledWith(LEGACY_KEY)
      expect(queue.__schedules()).toEqual([expect.objectContaining({ key: 'simple-job' })])
      expect(lastSummary(logger)).toEqual({ added: 0, removed: 0, updated: 1 })
    })

    it('removes a stray scheduler with another id but the same job name via removeJobScheduler', async () => {
      const { registry, queueFor } = makeFakeRegistry()
      queueFor('simple-job').__setSchedules([
        { key: 'manual-id', name: 'simple-job', pattern: '0 9 * * *', iterationCount: 2 },
      ])
      const { store } = makeFakeStore([makeConfig({ jobName: 'simple-job' })])
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])

      await new SchedulerReconciler(registry, store, jobs).reconcile()

      expect(queueFor('simple-job').removeJobScheduler).toHaveBeenCalledWith('manual-id')
      expect(queueFor('simple-job').removeRepeatableByKey).not.toHaveBeenCalled()
      expect(queueFor('simple-job').__schedules()).toEqual([
        expect.objectContaining({ key: 'simple-job' }),
      ])
    })

    it('does not upsert (and does not count) when removing the legacy repeatable fails', async () => {
      const { registry, queueFor } = makeFakeRegistry()
      const queue = queueFor('simple-job')
      queue.__setSchedules([{ key: LEGACY_KEY, name: 'simple-job', pattern: '0 9 * * *' }])
      queue.removeRepeatableByKey.mockRejectedValueOnce(new Error('READONLY'))
      const { store } = makeFakeStore([makeConfig({ jobName: 'simple-job' })])
      const logger = makeLogger()
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])
      const reconciler = new SchedulerReconciler(registry, store, jobs, {
        logger: logger as unknown as ILogger,
      })

      await reconciler.reconcile()

      // Upserting anyway would leave the legacy repeatable AND the scheduler
      // both firing; the next cycle retries the whole migration instead.
      expect(queue.upsertJobScheduler).not.toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalled()
      expect(reconciler.getStats().scheduledJobs).toBe(0)
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
      const logger = makeLogger()

      const reconciler = new SchedulerReconciler(registry, store, jobs, {
        logger: logger as unknown as ILogger,
      })

      await expect(reconciler.reconcile()).resolves.not.toThrow()
      expect(logger.error).toHaveBeenCalled()
    })

    it('warns (with job name and message) when reading one job from Redis fails, and keeps going', async () => {
      const { registry, queueFor } = makeFakeRegistry()
      const jobs = jobsMap(['simple-job', SimpleJob as unknown as JobConstructor])
      const { store } = makeFakeStore([])
      const logger = makeLogger()
      queueFor('simple-job').getJobSchedulers.mockRejectedValueOnce(new Error('WRONGTYPE'))

      const reconciler = new SchedulerReconciler(registry, store, jobs, {
        logger: logger as unknown as ILogger,
      })
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

  const jobs = () =>
    new Map<string, JobConstructor>([['simple-job', SimpleJob as unknown as JobConstructor]])

  const enable = (cronPattern = '0 9 * * *') =>
    store.set('simple-job', {
      module: 'simple',
      enabled: true,
      orphan: false,
      cronPattern,
      timezone: 'UTC',
      priority: 5,
    })

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
    await registry.getQueue('simple-job').obliterate({ force: true }).catch(() => {})
    await registry.close()
    const keys = await raw.keys(`${keyPrefix}*`)
    if (keys.length > 0) await raw.del(...keys)
    await store.close()
    await closeRedis(raw)
  })

  it('creates a real BullMQ job scheduler for an enabled config with a cron pattern', async () => {
    await enable()

    reconciler = new SchedulerReconciler(registry, store, jobs())
    await reconciler.reconcile()

    const queue = registry.getQueue('simple-job')
    const schedulers = await queue.getJobSchedulers(0, -1)
    expect(schedulers).toHaveLength(1)
    expect(schedulers[0]).toMatchObject({
      key: 'simple-job',
      name: 'simple-job',
      pattern: '0 9 * * *',
      tz: 'UTC',
    })
    expect(schedulers[0].iterationCount).toBeDefined()
    expect(await queue.getDelayedCount()).toBe(1)
  })

  it('removes the real job scheduler when the config is disabled', async () => {
    await enable()
    reconciler = new SchedulerReconciler(registry, store, jobs())
    await reconciler.reconcile()

    await store.toggleEnabled('simple-job', false)
    await reconciler.reconcile()

    const queue = registry.getQueue('simple-job')
    expect(await queue.getJobSchedulers(0, -1)).toHaveLength(0)
    expect(await queue.getDelayedCount()).toBe(0)
  })

  it('updates the real job scheduler in place when the cron pattern changes', async () => {
    await enable('0 9 * * *')
    reconciler = new SchedulerReconciler(registry, store, jobs())
    await reconciler.reconcile()

    await enable('0 10 * * *')
    await reconciler.reconcile()

    const queue = registry.getQueue('simple-job')
    const schedulers = await queue.getJobSchedulers(0, -1)
    expect(schedulers).toHaveLength(1)
    expect(schedulers[0].pattern).toBe('0 10 * * *')
    expect(await queue.getDelayedCount()).toBe(1)
  })

  it('self-heals after a fresh reconciler instance (restart simulation)', async () => {
    await enable()
    const first = new SchedulerReconciler(registry, store, jobs())
    await first.reconcile()
    first.stop()

    // A brand new reconciler instance (simulating a process restart) reads
    // scheduled state from Redis, not from in-memory state - so it must
    // recognize the already-scheduled job.
    const second = new SchedulerReconciler(registry, store, jobs())
    await second.reconcile()
    reconciler = second

    const queue = registry.getQueue('simple-job')
    // Reconciling twice for the same unchanged config must not create a
    // second, duplicate schedule.
    expect(await queue.getJobSchedulers(0, -1)).toHaveLength(1)
    expect(await queue.getDelayedCount()).toBe(1)
  })

  it('migrates a legacy repeatable (created by the pre-upgrade reconciler) without duplicating it', async () => {
    await enable()
    const queue = registry.getQueue('simple-job')
    // Exactly what the previous reconciler wrote.
    await queue.add('simple-job', {}, { repeat: { pattern: '0 9 * * *', tz: 'UTC' }, priority: 5 })
    const before = await queue.getJobSchedulers(0, -1)
    expect(before).toHaveLength(1)
    expect(before[0].iterationCount).toBeUndefined() // legacy, not a scheduler

    reconciler = new SchedulerReconciler(registry, store, jobs())
    await reconciler.reconcile()

    const after = await queue.getJobSchedulers(0, -1)
    expect(after).toHaveLength(1)
    expect(after[0].key).toBe('simple-job')
    expect(after[0].iterationCount).toBeDefined()
    // The legacy repeatable's pending iteration is gone too: one next run, not two.
    const delayed = await queue.getDelayed()
    expect(delayed.map(j => j.id)).toEqual([expect.stringMatching(/^repeat:simple-job:/)])
  })

  it('removes a legacy repeatable of a job that is disabled after the upgrade', async () => {
    await store.set('simple-job', {
      module: 'simple',
      enabled: false,
      orphan: false,
      cronPattern: '0 9 * * *',
      timezone: 'UTC',
      priority: 5,
    })
    const queue = registry.getQueue('simple-job')
    await queue.add('simple-job', {}, { repeat: { pattern: '0 9 * * *', tz: 'UTC' } })

    reconciler = new SchedulerReconciler(registry, store, jobs())
    await reconciler.reconcile()

    expect(await queue.getJobSchedulers(0, -1)).toHaveLength(0)
    expect(await queue.getDelayedCount()).toBe(0)
  })
})
