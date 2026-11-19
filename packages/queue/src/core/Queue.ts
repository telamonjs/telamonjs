import { Queue as BullQueue, QueueEvents } from 'bullmq'
import type { Job as BullJob, QueueEventsListener } from 'bullmq'
import type { RedisConfig, JobOptions, QueueStats } from './types.js'
import type { ILogger } from '@telamonjs/logger'
import { NoOpLogger } from '@telamonjs/logger'

// BullMQ's own Queue<DataTypeOrJob, DefaultResultType, DefaultNameType, ...>
// derives its 3 effective type params (DataType/ResultType/NameType) via
// conditional types (ExtractDataType/ExtractResultType/ExtractNameType,
// bullmq/dist/esm/classes/queue.d.ts) that only resolve once TData/TResult
// are concrete - inside this generic class body they stay deferred and
// won't structurally match plain `TData`/`TResult`. Pinning all 6 type
// params explicitly (NameType=string, since job names here are always
// plain strings - never raw BullMQ Job instances) sidesteps the deferred
// conditionals entirely instead of casting at every call site.
type BullQueueOf<TData, TResult> = BullQueue<
  TData,
  TResult,
  string,
  TData,
  TResult,
  string
>

/**
 * Type-safe Queue wrapper around BullMQ
 *
 * @template TData - Job data type
 * @template TResult - Job result type
 *
 * @example
 * ```ts
 * const emailQueue = new Queue<EmailData, void>('email', { redis })
 *
 * await emailQueue.add({
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   body: 'Welcome to our platform'
 * }, {
 *   priority: 1,
 *   attempts: 3
 * })
 * ```
 */
export class Queue<TData = unknown, TResult = unknown> {
  private queue: BullQueueOf<TData, TResult>
  private events: QueueEvents
  public readonly name: string

  constructor(
    name: string,
    redis: RedisConfig,
    prefix: string = 'telamonjs',
    logger: ILogger = new NoOpLogger()
  ) {
    this.name = name
    this.queue = new BullQueue<TData, TResult, string, TData, TResult, string>(
      name,
      {
        connection: redis,
        prefix,
      }
    )

    this.events = new QueueEvents(name, {
      connection: redis,
      prefix,
    })

    // BullMQ's Queue/QueueEvents are EventEmitters that emit 'error' on
    // connection failures (bad host, connection closed mid-command, etc).
    // With no listener, that becomes an unhandled rejection/exception
    // instead of a logged, recoverable event - BullMQ's own documented
    // requirement. QueueManager.close() awaiting shutdown does not prevent
    // this: the failure can land after close() has already resolved.
    this.queue.on('error', (error: Error) => {
      logger.error('Queue Redis connection error', {
        queueName: name,
        error: error.message,
      })
    })
    this.events.on('error', (error: Error) => {
      logger.error('QueueEvents Redis connection error', {
        queueName: name,
        error: error.message,
      })
    })
  }

  /**
   * Add a job to the queue
   *
   * @param data - Job data (type-safe via TData generic)
   * @param options - Job options (priority, retry, delay, etc)
   * @returns BullMQ Job instance
   */
  async add(
    data: TData,
    options?: JobOptions
  ): Promise<BullJob<TData, TResult>> {
    return await this.queue.add(this.name, data, options)
  }

  /**
   * Add multiple jobs in bulk (efficient)
   *
   * @param jobs - Array of job data
   * @param options - Default options for all jobs
   */
  async addBulk(
    jobs: Array<{ data: TData; opts?: JobOptions }>,
    options?: JobOptions
  ): Promise<BullJob<TData, TResult>[]> {
    const bulkJobs = jobs.map(job => ({
      name: this.name,
      data: job.data,
      opts: { ...options, ...job.opts },
    }))

    return await this.queue.addBulk(bulkJobs)
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<BullJob<TData, TResult> | undefined> {
    return await this.queue.getJob(jobId)
  }

  /**
   * Get all jobs by state
   */
  async getJobs(
    types: Array<
      'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused'
    >,
    start = 0,
    end = -1
  ): Promise<BullJob<TData, TResult>[]> {
    return await this.queue.getJobs(types, start, end)
  }

  /**
   * Get waiting jobs
   */
  async getWaiting(): Promise<BullJob<TData, TResult>[]> {
    return await this.queue.getWaiting()
  }

  /**
   * Get active jobs
   */
  async getActive(): Promise<BullJob<TData, TResult>[]> {
    return await this.queue.getActive()
  }

  /**
   * Get completed jobs
   */
  async getCompleted(): Promise<BullJob<TData, TResult>[]> {
    return await this.queue.getCompleted()
  }

  /**
   * Get failed jobs
   */
  async getFailed(): Promise<BullJob<TData, TResult>[]> {
    return await this.queue.getFailed()
  }

  /**
   * Get queue stats
   */
  async getStats(): Promise<QueueStats> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ])

    // Check if queue is paused
    const isPaused = await this.queue.isPaused()

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused: isPaused ? 1 : 0,
    }
  }

  /**
   * Pause queue (stop processing new jobs)
   */
  async pause(): Promise<void> {
    await this.queue.pause()
  }

  /**
   * Resume queue
   */
  async resume(): Promise<void> {
    await this.queue.resume()
  }

  /**
   * Check if queue is paused
   */
  async isPaused(): Promise<boolean> {
    return await this.queue.isPaused()
  }

  /**
   * Clean old jobs
   *
   * @param grace - Grace period in ms (jobs older than this will be cleaned)
   * @param limit - Max number of jobs to clean
   * @param type - Job type to clean
   */
  async clean(
    grace: number,
    limit: number = 1000,
    type: 'completed' | 'failed' = 'completed'
  ): Promise<string[]> {
    return await this.queue.clean(grace, limit, type)
  }

  /**
   * Remove multiple jobs by IDs
   *
   * @param jobIds - Array of job IDs to remove
   * @returns Number of jobs removed
   *
   * @example
   * ```ts
   * const removed = await queue.removeBulk(['job-1', 'job-2', 'job-3'])
   * console.log(`Removed ${removed} jobs`)
   * ```
   */
  async removeBulk(jobIds: string[]): Promise<number> {
    let removed = 0

    // Process in batches to avoid overwhelming Redis
    const batchSize = 100
    for (let i = 0; i < jobIds.length; i += batchSize) {
      const batch = jobIds.slice(i, i + batchSize)
      const promises = batch.map(async id => {
        const job = await this.queue.getJob(id)
        if (job) {
          await job.remove()
          return 1
        }
        return 0
      })

      const results = await Promise.all(promises)
      removed += results.reduce((sum: number, r: number) => sum + r, 0)
    }

    return removed
  }

  /**
   * Retry multiple failed jobs
   *
   * @param jobIds - Array of job IDs to retry (if empty, retries all failed jobs)
   * @param options - Optional job options to override
   * @returns Number of jobs retried
   *
   * @example
   * ```ts
   * // Retry specific jobs
   * await queue.retryBulk(['job-1', 'job-2'])
   *
   * // Retry all failed jobs
   * await queue.retryBulk()
   * ```
   */
  async retryBulk(
    jobIds?: string[],
    _options?: JobOptions
  ): Promise<number> {
    // ponytail: BullMQ's Job#retry(state?) takes no per-job options
    // (node_modules bullmq/dist/esm/classes/job.d.ts:457) - _options is
    // accepted only so QueueManager.retryBulk's call-through signature
    // stays intact; nothing here can actually apply an override.
    let retried = 0

    // If no job IDs provided, retry all failed jobs
    if (!jobIds || jobIds.length === 0) {
      const failedJobs = await this.queue.getFailed()
      jobIds = failedJobs
        .map(j => j.id)
        .filter((id): id is string => id !== undefined)
    }

    // Process in batches
    const batchSize = 100
    for (let i = 0; i < jobIds.length; i += batchSize) {
      const batch = jobIds.slice(i, i + batchSize)
      const promises = batch.map(async id => {
        const job = await this.queue.getJob(id)
        if (job && (await job.isFailed())) {
          await job.retry()
          return 1
        }
        return 0
      })

      const results = await Promise.all(promises)
      retried += results.reduce((sum: number, r: number) => sum + r, 0)
    }

    return retried
  }

  /**
   * Drain queue - process all waiting/delayed jobs and prevent new jobs
   *
   * This will:
   * 1. Pause the queue (no new jobs will be processed)
   * 2. Wait for all active jobs to complete
   * 3. Return count of completed jobs
   *
   * Use this for graceful shutdown or maintenance.
   *
   * @returns Number of jobs that were drained
   *
   * @example
   * ```ts
   * await queue.drain()
   * console.log('Queue drained, safe to shutdown')
   * ```
   */
  async drain(): Promise<number> {
    // Pause queue first to prevent new jobs
    await this.queue.pause()

    // Get count of active jobs
    const initialActive = await this.queue.getActiveCount()
    const initialWaiting = await this.queue.getWaitingCount()
    const initialDelayed = await this.queue.getDelayedCount()

    const totalBefore = initialActive + initialWaiting + initialDelayed

    // Wait for all jobs to complete (with timeout)
    const timeout = 60000 // 60 seconds timeout
    const start = Date.now()

    // BullMQ's queue.pause() (above) stops workers from picking up new jobs
    // from the waiting list - once paused, waiting/delayed jobs can never
    // become active again until resume(). Blocking here on waitingCount===0
    // or delayedCount===0 would deadlock forever whenever there's any
    // backlog. Only currently-active jobs can still finish on their own, so
    // that's the only condition worth polling for, matching this method's
    // own contract ("wait for all active jobs to complete").
    // Evidence: bullmq Queue#pause() marks jobs paused via a Lua script
    // (node_modules/.pnpm/bullmq@*/node_modules/bullmq/dist/cjs/classes/queue.js:280-285),
    // no code path un-pauses them without an explicit resume() call.
    while (Date.now() - start < timeout) {
      const activeCount = await this.queue.getActiveCount()

      if (activeCount === 0) {
        break
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Calculate how many jobs were processed
    const finalActive = await this.queue.getActiveCount()
    const finalWaiting = await this.queue.getWaitingCount()
    const finalDelayed = await this.queue.getDelayedCount()

    const totalAfter = finalActive + finalWaiting + finalDelayed

    return totalBefore - totalAfter
  }

  /**
   * Remove all jobs from queue (DANGEROUS)
   */
  async obliterate(): Promise<void> {
    await this.queue.obliterate()
  }

  /**
   * Close queue connection
   */
  async close(): Promise<void> {
    await this.events.close()
    await this.queue.close()
  }

  /**
   * Get underlying BullMQ queue (for advanced usage)
   */
  getRawQueue(): BullQueueOf<TData, TResult> {
    return this.queue
  }

  /**
   * Get queue events emitter
   */
  getEvents(): QueueEvents {
    return this.events
  }

  /**
   * Listen to queue events
   *
   * @example
   * ```ts
   * queue.on('completed', ({ jobId, returnvalue }) => {
   *   console.log(`Job ${jobId} completed with result:`, returnvalue)
   * })
   *
   * queue.on('failed', ({ jobId, failedReason }) => {
   *   console.error(`Job ${jobId} failed:`, failedReason)
   * })
   * ```
   */
  on<E extends 'completed' | 'failed' | 'progress' | 'stalled' | 'active'>(
    event: E,
    listener: (args: Parameters<QueueEventsListener[E]>[0]) => void
  ): void {
    this.events.on(event, listener as QueueEventsListener[E])
  }

  /**
   * Remove event listener
   */
  off<E extends 'completed' | 'failed' | 'progress' | 'stalled' | 'active'>(
    event: E,
    listener: (args: Parameters<QueueEventsListener[E]>[0]) => void
  ): void {
    this.events.off(event, listener as QueueEventsListener[E])
  }
}
