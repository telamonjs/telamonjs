import type { QueueRegistry } from '../core/QueueRegistry.js'
import type { JobConstructor } from '../core/types.js'
import { assertNoLegacySchedule } from '../core/Job.js'
import type { JobConfigStore } from '../job-config/JobConfigStore.js'
import type { JobConfig } from '../job-config/types.js'
import type { ILogger } from '@telamonjs/logger'
import { NoOpLogger } from '@telamonjs/logger'
import type { JobsOptions } from 'bullmq'

export interface SchedulerReconcilerOptions {
  /**
   * How often (ms) `start()` re-runs `reconcile()`.
   * @default 60000
   */
  reconcileIntervalMs?: number

  logger?: ILogger
}

interface ScheduledJob {
  repeatableKey: string
  cronPattern: string
  timezone: string
  priority: number
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
 * Reconciliation loop that keeps BullMQ repeatable jobs in sync with the
 * desired state in a `JobConfigStore` - enable/disable and cron edits via a
 * dashboard take effect with no redeploy, and a restart self-heals (BullMQ
 * repeatables are read back from Redis, not from in-memory state).
 *
 * Ported from the original consumer-app scheduler, with two decouplings from that
 * consumer app:
 * - job options come from `new JobClass().options` (`Job.options`), not a
 *   separate per-consumer contract map.
 * - timezone/priority are read straight off `JobConfig` (already resolved
 *   by `JobConfigStore`'s own defaults - see `JobConfigStoreOptions.defaultTimezone`),
 *   never a hardcoded geographic timezone.
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
   * Reconciles desired state (`JobConfigStore`) with actual state (BullMQ
   * repeatable jobs). Never throws - a failure is logged and the next cycle
   * (interval or manual) tries again, matching the upstream resilience
   * contract (a bad reconcile cycle must not crash the scheduler process).
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

      const currentRepeatables = await this.getRepeatableJobsFromRedis()

      for (const [jobName, keys] of currentRepeatables) {
        if (!desiredJobs.has(jobName)) {
          for (const key of keys) {
            await this.removeJobByKey(jobName, key)
            removed++
          }
          this.scheduledJobs.delete(jobName)
        }
      }

      for (const [jobName, config] of desiredJobs) {
        const current = this.scheduledJobs.get(jobName)

        if (!current) {
          const ok = await this.addJob(jobName, config)
          if (ok) added++
          continue
        }

        if (
          current.cronPattern !== config.cronPattern ||
          current.timezone !== config.timezone ||
          current.priority !== config.priority
        ) {
          await this.removeJob(jobName, current.repeatableKey)
          const ok = await this.addJob(jobName, config)
          if (ok) updated++
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
   * Finds all currently-scheduled BullMQ repeatables for jobs known in code,
   * reusing `QueueRegistry`'s cached `Queue` instances (one Redis round trip
   * per known job, not per tick per Queue instance).
   */
  private async getRepeatableJobsFromRedis(): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>()

    for (const [jobName] of this.jobs) {
      try {
        const queue = this.queueRegistry.getQueue(jobName)
        const repeatableJobs = await queue.getRepeatableJobs()
        const keys = repeatableJobs
          .filter(j => j.name === jobName)
          .map(j => j.key)
        if (keys.length > 0) result.set(jobName, keys)
      } catch {
        // Ignore per-job errors - one bad queue shouldn't stop the reconcile
        // pass from evaluating the rest.
      }
    }

    return result
  }

  private async removeJobByKey(jobName: string, repeatableKey: string): Promise<void> {
    try {
      const queue = this.queueRegistry.getQueue(jobName)
      await queue.removeRepeatableByKey(repeatableKey)
      this.logger.debug('SchedulerReconciler removed job', { jobName, repeatableKey })
    } catch (err) {
      this.logger.error('SchedulerReconciler failed to remove job by key', {
        jobName,
        repeatableKey,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  private async addJob(jobName: string, config: JobConfig): Promise<boolean> {
    const JobClass = this.jobs.get(jobName)

    if (!JobClass) {
      this.logger.warn('SchedulerReconciler: job not found in code', { jobName })
      return false
    }

    try {
      const jobInstance = new JobClass()
      const queue = this.queueRegistry.getQueue(jobName)

      // Remove any pre-existing repeatable for this job first, so the
      // config we're about to write is guaranteed to be the one that
      // ends up scheduled (BullMQ can otherwise leave a stale repeatable
      // side by side with the new one if the pattern/opts changed).
      const existingJobs = await queue.getRepeatableJobs()
      for (const job of existingJobs) {
        if (job.name === jobName) {
          await queue.removeRepeatableByKey(job.key)
        }
      }

      const jobOptions: JobsOptions = {
        ...jobInstance.options,
        repeat: { pattern: config.cronPattern!, tz: config.timezone },
        priority: config.priority,
      }

      await queue.add(jobName, {}, jobOptions)

      const repeatableJobs = await queue.getRepeatableJobs()
      const repeatableJob = repeatableJobs.find(j => j.name === jobName)

      if (repeatableJob) {
        this.scheduledJobs.set(jobName, {
          repeatableKey: repeatableJob.key,
          cronPattern: config.cronPattern!,
          timezone: config.timezone,
          priority: config.priority,
        })

        this.logger.info('SchedulerReconciler scheduled job', {
          jobName,
          cronPattern: config.cronPattern,
          timezone: config.timezone,
          priority: config.priority,
        })
      }

      return true
    } catch (err) {
      this.logger.error('SchedulerReconciler failed to schedule job', {
        jobName,
        error: err instanceof Error ? err.message : String(err),
      })
      return false
    }
  }

  private async removeJob(jobName: string, repeatableKey: string): Promise<void> {
    if (!this.jobs.has(jobName)) {
      this.scheduledJobs.delete(jobName)
      return
    }

    try {
      const queue = this.queueRegistry.getQueue(jobName)
      await queue.removeRepeatableByKey(repeatableKey)
    } catch (err) {
      this.logger.error('SchedulerReconciler failed to remove job', {
        jobName,
        error: err instanceof Error ? err.message : String(err),
      })
    } finally {
      this.scheduledJobs.delete(jobName)
    }
  }
}
