import type { QueueRegistry } from '../core/QueueRegistry.js'
import type { JobConstructor } from '../core/types.js'
import { assertNoLegacySchedule } from '../core/Job.js'
import type { JobConfigStore } from '../job-config/JobConfigStore.js'
import type { JobConfig } from '../job-config/types.js'
import type { ILogger } from '@telamonjs/logger'
import { NoOpLogger } from '@telamonjs/logger'

export interface SchedulerReconcilerOptions {
  /**
   * How often (ms) `start()` re-runs `reconcile()`.
   * @default 60000
   */
  reconcileIntervalMs?: number

  logger?: ILogger
}

interface ScheduledJob {
  cronPattern: string
  timezone: string
  priority: number
}

/**
 * One entry of BullMQ's `repeat` set for a job we manage. Job schedulers and
 * legacy repeatables (`queue.add(name, data, { repeat })`, what this class
 * wrote before it moved to job schedulers) live in the same set;
 * `getJobSchedulers()` reports an `iterationCount` only for real schedulers.
 */
interface RedisSchedule {
  key: string
  legacy: boolean
}

export interface SchedulerReconcilerStats {
  scheduledJobs: number
  jobs: Array<{
    name: string
    cronPattern: string
    timezone: string
    priority: number
  }>
  reconcileIntervalMs: number
}

/**
 * Reconciliation loop that keeps BullMQ job schedulers in sync with the
 * desired state in a `JobConfigStore` - enable/disable and cron edits via a
 * dashboard take effect with no redeploy, and a restart self-heals (schedulers
 * are read back from Redis, not from in-memory state).
 *
 * Each job gets one job scheduler whose id is the job name, written with
 * `upsertJobScheduler` (idempotent, updates in place). Legacy repeatables of
 * a managed job - left by versions that used `add(..., { repeat })` - are
 * removed (with their pending iteration) before the scheduler is upserted,
 * so an upgraded deployment never runs a job twice.
 *
 * Job options come from `new JobClass().options` (`Job.options`, minus
 * `jobId`/`delay`, which a scheduler owns); timezone/priority are read straight
 * off `JobConfig` (already resolved by `JobConfigStore`'s own defaults - see
 * `JobConfigStoreOptions.defaultTimezone`), never a hardcoded timezone.
 *
 * Depends on `QueueRegistry` (not `QueueManager`) so every reconcile cycle
 * reuses the same `Queue` instances over one shared Redis connection -
 * `QueueRegistry` exists specifically because a per-tick `new Queue()` here
 * caused ~1,980 Redis connections/hour upstream.
 *
 * The constructor throws if any job in `jobs` still declares a `schedule`
 * field (`Job.schedule` was removed and would be silently ignored).
 */
export class SchedulerReconciler {
  private readonly reconcileIntervalMs: number
  private readonly logger: ILogger
  private scheduledJobs = new Map<string, ScheduledJob>()
  private isRunning = false
  private reconcileTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly queueRegistry: QueueRegistry,
    private readonly store: JobConfigStore,
    private readonly jobs: Map<string, JobConstructor>,
    opts?: SchedulerReconcilerOptions
  ) {
    for (const [name, JobClass] of jobs) {
      assertNoLegacySchedule(name, new JobClass())
    }

    this.reconcileIntervalMs = opts?.reconcileIntervalMs ?? 60000
    this.logger = opts?.logger ?? new NoOpLogger()
  }

  /**
   * Runs one reconciliation immediately, then starts the interval loop.
   */
  async start(): Promise<void> {
    this.logger.info('SchedulerReconciler starting', {
      reconcileIntervalMs: this.reconcileIntervalMs,
    })

    await this.reconcile()

    this.isRunning = true
    this.reconcileTimer = setInterval(() => {
      if (this.isRunning) void this.reconcile()
    }, this.reconcileIntervalMs)

    this.logger.info('SchedulerReconciler started', { status: 'ready' })
  }

  /**
   * Reconciles desired state (`JobConfigStore`) with actual state (BullMQ job
   * schedulers). Never throws - a failure is logged and the next cycle
   * (interval or manual) tries again, matching the upstream resilience
   * contract (a bad reconcile cycle must not crash the scheduler process).
   *
   * Counts in the "completed with changes" log: `added` = a job scheduled by
   * this instance for the first time (every job after a restart, including a
   * legacy repeatable migrated to a scheduler); `removed` = one schedule entry
   * removed because its job is no longer enabled with a cron; `updated` = a
   * scheduled job re-upserted because its cron/timezone/priority changed or
   * a stray legacy repeatable for it reappeared.
   */
  async reconcile(): Promise<void> {
    const startTime = Date.now()

    try {
      const desiredConfigs = await this.store.getEnabledWithCron()
      const desiredJobs = new Map<string, JobConfig>()
      for (const config of desiredConfigs) {
        desiredJobs.set(config.jobName, config)
      }

      let added = 0
      let removed = 0
      let updated = 0

      const current = await this.getSchedulesFromRedis()

      for (const [jobName, schedules] of current) {
        if (!desiredJobs.has(jobName)) {
          for (const schedule of schedules) {
            await this.removeSchedule(jobName, schedule).catch((err: unknown) => {
              this.logger.error('SchedulerReconciler failed to remove job', {
                jobName,
                key: schedule.key,
                error: err instanceof Error ? err.message : String(err),
              })
            })
            removed++
          }
          this.scheduledJobs.delete(jobName)
        }
      }

      for (const [jobName, config] of desiredJobs) {
        const scheduled = this.scheduledJobs.get(jobName)
        // Anything for this job other than its own scheduler: a legacy
        // repeatable, or a scheduler someone created under another id.
        const strays = (current.get(jobName) ?? []).filter(
          s => s.legacy || s.key !== jobName
        )

        if (!scheduled) {
          if (await this.upsertJob(jobName, config, strays)) added++
          continue
        }

        if (
          strays.length > 0 ||
          scheduled.cronPattern !== config.cronPattern ||
          scheduled.timezone !== config.timezone ||
          scheduled.priority !== config.priority
        ) {
          if (await this.upsertJob(jobName, config, strays)) updated++
        }
      }

      const elapsedMs = Date.now() - startTime
      if (added > 0 || removed > 0 || updated > 0) {
        this.logger.info('SchedulerReconciler reconciliation completed with changes', {
          added,
          removed,
          updated,
          elapsedMs,
        })
      }
    } catch (err) {
      this.logger.error('SchedulerReconciler reconciliation failed', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  /**
   * Stops the reconciliation loop. Does NOT close the `QueueRegistry` or
   * `JobConfigStore` passed to the constructor - their lifecycle is the
   * caller's responsibility, unlike the original implementation which closed both
   * (plus its own Redis connection) from inside `stop()`.
   */
  stop(): void {
    this.logger.info('SchedulerReconciler stopping')
    this.isRunning = false

    if (this.reconcileTimer) {
      clearInterval(this.reconcileTimer)
      this.reconcileTimer = null
    }
  }

  getStats(): SchedulerReconcilerStats {
    return {
      scheduledJobs: this.scheduledJobs.size,
      jobs: Array.from(this.scheduledJobs.entries()).map(([name, s]) => ({
        name,
        cronPattern: s.cronPattern,
        timezone: s.timezone,
        priority: s.priority,
      })),
      reconcileIntervalMs: this.reconcileIntervalMs,
    }
  }

  /**
   * Reads every schedule (job scheduler or legacy repeatable) of the jobs
   * known in code, reusing `QueueRegistry`'s cached `Queue` instances (one
   * Redis round trip per known job, not per tick per Queue instance).
   */
  private async getSchedulesFromRedis(): Promise<Map<string, RedisSchedule[]>> {
    const result = new Map<string, RedisSchedule[]>()

    for (const [jobName] of this.jobs) {
      try {
        const queue = this.queueRegistry.getQueue(jobName)
        const schedules = (await queue.getJobSchedulers(0, -1))
          .filter(s => s.name === jobName)
          .map(s => ({ key: s.key, legacy: s.iterationCount === undefined }))
        if (schedules.length > 0) result.set(jobName, schedules)
      } catch (err) {
        // One bad queue shouldn't stop the reconcile pass from evaluating
        // the rest - but it must not be invisible either.
        this.logger.warn('SchedulerReconciler failed to read job schedulers', {
          jobName,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    return result
  }

  private async removeSchedule(jobName: string, schedule: RedisSchedule): Promise<void> {
    const queue = this.queueRegistry.getQueue(jobName)
    if (schedule.legacy) {
      // Deprecated in BullMQ, kept only for this migration path: unlike
      // removeJobScheduler it also finds the pending iteration of the oldest
      // `name:id:endDate:tz:pattern` keys.
      await queue.removeRepeatableByKey(schedule.key)
    } else {
      await queue.removeJobScheduler(schedule.key)
    }
    this.logger.debug('SchedulerReconciler removed schedule', {
      jobName,
      key: schedule.key,
      legacy: schedule.legacy,
    })
  }

  private async upsertJob(
    jobName: string,
    config: JobConfig,
    strays: RedisSchedule[]
  ): Promise<boolean> {
    const JobClass = this.jobs.get(jobName)

    if (!JobClass) {
      this.logger.warn('SchedulerReconciler: job not found in code', { jobName })
      return false
    }

    try {
      // Strays go first and a failure aborts the upsert: scheduling while a
      // legacy repeatable survives would run the job twice. The next cycle
      // retries the whole thing.
      for (const stray of strays) {
        await this.removeSchedule(jobName, stray)
      }

      // A scheduler owns the job id and the delay of every iteration.
      const { jobId: _jobId, delay: _delay, ...options } = new JobClass().options ?? {}
      const queue = this.queueRegistry.getQueue(jobName)

      await queue.upsertJobScheduler(
        jobName,
        { pattern: config.cronPattern!, tz: config.timezone },
        { name: jobName, data: {}, opts: { ...options, priority: config.priority } }
      )

      this.scheduledJobs.set(jobName, {
        cronPattern: config.cronPattern!,
        timezone: config.timezone,
        priority: config.priority,
      })

      this.logger.info('SchedulerReconciler scheduled job', {
        jobName,
        cronPattern: config.cronPattern,
        timezone: config.timezone,
        priority: config.priority,
        migratedLegacy: strays.filter(s => s.legacy).length,
      })

      return true
    } catch (err) {
      this.logger.error('SchedulerReconciler failed to schedule job', {
        jobName,
        error: err instanceof Error ? err.message : String(err),
      })
      return false
    }
  }
}
