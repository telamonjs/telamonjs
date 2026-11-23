import { Queue } from './Queue.js'
import { Worker } from './Worker.js'
import { JobRegistry } from './JobRegistry.js'
import { DeadLetterQueue } from './DeadLetterQueue.js'
import { assertNoLegacySchedule } from './Job.js'
import type {
  QueueConfig,
  WorkerConfig,
  JobConstructor,
  JobOptions,
  QueueStats,
} from './types.js'
import type { ILogger } from '@telamonjs/logger'
import { createLogger } from '@telamonjs/logger'
import {
  validateQueueConfig,
  validateWorkerConfig,
  validateJobOptions,
  validateJobName,
  formatValidationError,
} from '../utils/validation.js'
import {
  JobNotFoundError,
  InvalidJobNameError,
  InvalidJobOptionsError,
  InvalidWorkerConfigError,
  ConfigurationError,
} from '../utils/errors.js'
import { ZodError } from 'zod'

/**
 * Queue Manager - Main entry point for the queue system
 *
 * Manages queues, workers, and job registration
 *
 * @example
 * ```ts
 * const queueManager = new QueueManager({
 *   redis: {
 *     host: 'localhost',
 *     port: 6379
 *   },
 *   defaultJobOptions: {
 *     removeOnComplete: 100,
 *     removeOnFail: 500
 *   }
 * })
 *
 * // Register jobs
 * queueManager.register([
 *   SendEmailJob,
 *   GenerateReportJob
 * ])
 *
 * // Add jobs to queue
 * await queueManager.add(SendEmailJob, { to: 'user@example.com', ... })
 *
 * // Create workers
 * const workers = await queueManager.createWorkers({ concurrency: 5 })
 * ```
 */
export class QueueManager {
  private registry: JobRegistry
  private queues: Map<string, Queue> = new Map()
  private workers: Map<string, Worker> = new Map()
  private config: QueueConfig
  private logger: ILogger
  private dlq: DeadLetterQueue | null = null

  constructor(config: QueueConfig) {
    // Validate configuration
    try {
      this.config = validateQueueConfig(config)
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ConfigurationError(formatValidationError(error), { config })
      }
      throw error
    }

    this.registry = JobRegistry.getInstance()

    // config.logger wins; pass `new NoOpLogger()` there to silence the
    // manager (replaces the removed `enableLogging: false` flag).
    this.logger =
      this.config.logger ??
      createLogger({ context: { service: 'telamonjs-queue' }, enabled: true })

    // Set logger on registry
    this.registry.setLogger(this.logger)

    // Initialize Dead Letter Queue if enabled (default: true)
    if (this.config.enableDLQ !== false) {
      this.dlq = new DeadLetterQueue(
        this.config.redis,
        this.config.prefix,
        this.logger,
        this.config.dlqRetention
      )
    }

    this.logger.info('QueueManager initialized', {
      prefix: this.config.prefix,
      redisHost: this.config.redis.host,
      redisPort: this.config.redis.port,
      dlqEnabled: this.dlq !== null,
    })
  }

  /**
   * Register a job class
   *
   * @param JobClass - Job class constructor
   *
   * @example
   * ```ts
   * queueManager.register(SendEmailJob)
   * ```
   */
  register<TData = unknown, TResult = unknown>(
    JobClass: JobConstructor<TData, TResult>
  ): void {
    const jobInstance = new JobClass()

    // Validate job name
    try {
      validateJobName(jobInstance.name)
    } catch (error) {
      if (error instanceof ZodError) {
        throw new InvalidJobNameError(
          jobInstance.name,
          formatValidationError(error)
        )
      }
      throw error
    }

    assertNoLegacySchedule(jobInstance.name, jobInstance)

    this.registry.register(JobClass)

    // Create queue for this job
    this.getOrCreateQueue<TData, TResult>(jobInstance.name)
  }

  /**
   * Register multiple jobs at once
   *
   * @param JobClasses - Array of job class constructors
   *
   * @example
   * ```ts
   * queueManager.register([
   *   SendEmailJob,
   *   GenerateReportJob,
   *   ImportDataJob
   * ])
   * ```
   */
  registerMany(JobClasses: JobConstructor[]): void {
    for (const JobClass of JobClasses) {
      this.register(JobClass)
    }
  }

  /**
   * Add a job to the queue
   *
   * @param JobClass - Job class constructor (type-safe!)
   * @param data - Job data (inferred from JobClass)
   * @param options - Job options (priority, delay, retry, etc)
   *
   * @example
   * ```ts
   * await queueManager.add(SendEmailJob, {
   *   to: 'user@example.com',
   *   subject: 'Welcome!',
   *   body: 'Welcome to our platform'
   * }, {
   *   priority: 1,
   *   attempts: 3
   * })
   * ```
   */
  async add<TData = unknown, TResult = unknown>(
    JobClass: JobConstructor<TData, TResult>,
    data: TData,
    options?: JobOptions
  ): Promise<void> {
    const jobInstance = new JobClass()

    if (!this.registry.has(jobInstance.name)) {
      throw new JobNotFoundError(jobInstance.name)
    }

    // Merge options: manager defaults < Job.options (the class's own
    // config) < call-site options (most specific wins). Before 3.0.0 this
    // was `{ ...jobInstance.options, ...this.config.defaultJobOptions,
    // ...options }`, so a manager-level default clobbered the job class's
    // own options - see QueueManager.test.ts "options precedence" suite.
    const mergedOptions = {
      ...this.config.defaultJobOptions,
      ...jobInstance.options,
      ...options,
    }

    this.assertValidJobOptions(jobInstance.name, mergedOptions)

    const queue = this.getOrCreateQueue<TData, TResult>(jobInstance.name)
    await queue.add(data, mergedOptions)

    this.logger.debug('Job added to queue', {
      jobName: jobInstance.name,
      queueName: jobInstance.name,
    })
  }

  /**
   * Add multiple jobs in bulk (efficient)
   *
   * @param JobClass - Job class constructor
   * @param jobs - Array of job data
   * @param options - Default options for all jobs
   */
  async addBulk<TData = unknown, TResult = unknown>(
    JobClass: JobConstructor<TData, TResult>,
    jobs: Array<{ data: TData; opts?: JobOptions }>,
    options?: JobOptions
  ): Promise<void> {
    const jobInstance = new JobClass()

    if (!this.registry.has(jobInstance.name)) {
      throw new JobNotFoundError(jobInstance.name)
    }

    const queue = this.getOrCreateQueue<TData, TResult>(jobInstance.name)
    // Same precedence fix as add() - see comment there.
    const mergedOptions = {
      ...this.config.defaultJobOptions,
      ...jobInstance.options,
      ...options,
    }

    const bulk = jobs.map(j => ({ data: j.data, opts: { ...mergedOptions, ...j.opts } }))
    for (const job of bulk) this.assertValidJobOptions(jobInstance.name, job.opts)
    await queue.addBulk(bulk)

    this.logger.debug('Bulk jobs added to queue', {
      jobName: jobInstance.name,
      count: jobs.length,
    })
  }

  /** Same check for add() and addBulk(): a ZodError becomes InvalidJobOptionsError. */
  private assertValidJobOptions(jobName: string, options: JobOptions): void {
    if (Object.keys(options).length === 0) return
    try {
      validateJobOptions(options)
    } catch (error) {
      if (error instanceof ZodError) {
        throw new InvalidJobOptionsError(jobName, formatValidationError(error), options)
      }
      throw error
    }
  }

  /**
   * Get or create a queue for a job
   */
  private getOrCreateQueue<TData = unknown, TResult = unknown>(
    jobName: string
  ): Queue<TData, TResult> {
    if (!this.queues.has(jobName)) {
      const queue = new Queue<TData, TResult>(
        jobName,
        this.config.redis,
        this.config.prefix,
        this.logger
      )
      // Same type-erasure boundary as JobRegistry.register() (see comment
      // there): this map holds Queue<TData, TResult> instances for many
      // different job types, so storing one means widening to the
      // type-erased Queue<unknown, unknown> - getOrCreateQueue's own return
      // narrows back to the caller's TData/TResult on every read.
      this.queues.set(jobName, queue as Queue<unknown, unknown>)
    }

    return this.queues.get(jobName) as Queue<TData, TResult>
  }

  /**
   * Create workers for all registered jobs
   *
   * @param config - Worker configuration
   * @returns Array of created workers
   *
   * @example
   * ```ts
   * const workers = await queueManager.createWorkers({
   *   concurrency: 5,
   *   limiter: {
   *     max: 100,
   *     duration: 1000
   *   }
   * })
   * ```
   */
  async createWorkers(config: WorkerConfig = {}): Promise<Worker[]> {
    // Validate worker config
    let validatedConfig: WorkerConfig
    try {
      validatedConfig = validateWorkerConfig(config)
    } catch (error) {
      if (error instanceof ZodError) {
        throw new InvalidWorkerConfigError(formatValidationError(error), config)
      }
      throw error
    }

    const jobNames = this.registry.getNames()
    const workers: Worker[] = []

    for (const jobName of jobNames) {
      const jobInstance = this.registry.get(jobName)
      if (!jobInstance) continue

      const workerConfig: WorkerConfig = {
        ...validatedConfig,
        concurrency:
          validatedConfig.concurrencyPerQueue?.[jobName] ??
          validatedConfig.concurrency,
      }

      const worker = new Worker(
        jobName,
        jobInstance,
        this.config.redis,
        workerConfig,
        this.config.prefix,
        this.logger,
        this.dlq
      )

      this.workers.set(jobName, worker)
      workers.push(worker)
    }

    this.logger.info('Workers created', { count: workers.length })
    return workers
  }

  /**
   * Get queue by job name
   */
  getQueue<TData = unknown, TResult = unknown>(
    jobName: string
  ): Queue<TData, TResult> | undefined {
    return this.queues.get(jobName) as Queue<TData, TResult> | undefined
  }

  /**
   * Get worker by job name
   */
  getWorker(jobName: string): Worker | undefined {
    return this.workers.get(jobName)
  }

  /**
   * Get the Dead Letter Queue instance
   *
   * @returns DeadLetterQueue instance or null if disabled
   */
  getDLQ(): DeadLetterQueue | null {
    return this.dlq
  }

  /**
   * Get all queue stats
   */
  async getStats(): Promise<Record<string, QueueStats>> {
    const stats: Record<string, QueueStats> = {}

    for (const [name, queue] of this.queues.entries()) {
      stats[name] = await queue.getStats()
    }

    return stats
  }

  /**
   * Get registry stats
   */
  getRegistryStats() {
    return this.registry.getStats()
  }

  /**
   * Remove multiple jobs by IDs from a specific queue
   *
   * @param jobName - Job name (queue name)
   * @param jobIds - Array of job IDs to remove
   * @returns Number of jobs removed
   *
   * @example
   * ```ts
   * const removed = await queueManager.removeBulk('send-email', ['job-1', 'job-2'])
   * console.log(`Removed ${removed} jobs`)
   * ```
   */
  async removeBulk(jobName: string, jobIds: string[]): Promise<number> {
    const queue = this.getQueue(jobName)
    if (!queue) {
      throw new JobNotFoundError(jobName)
    }

    const removed = await queue.removeBulk(jobIds)

    this.logger.info('Bulk jobs removed', {
      jobName,
      count: removed,
      requested: jobIds.length,
    })

    return removed
  }

  /**
   * Retry multiple failed jobs from a specific queue
   *
   * @param jobName - Job name (queue name)
   * @param jobIds - Array of job IDs to retry (if empty, retries all failed jobs)
   * @param options - Optional job options to override
   * @returns Number of jobs retried
   *
   * @example
   * ```ts
   * // Retry specific jobs
   * await queueManager.retryBulk('send-email', ['job-1', 'job-2'])
   *
   * // Retry all failed jobs
   * await queueManager.retryBulk('send-email')
   * ```
   */
  async retryBulk(
    jobName: string,
    jobIds?: string[],
    options?: JobOptions
  ): Promise<number> {
    const queue = this.getQueue(jobName)
    if (!queue) {
      throw new JobNotFoundError(jobName)
    }

    const retried = await queue.retryBulk(jobIds, options)

    this.logger.info('Bulk jobs retried', {
      jobName,
      count: retried,
    })

    return retried
  }

  /**
   * Retry all failed jobs across all queues
   *
   * @param options - Optional job options to override
   * @returns Map of job names to count of retried jobs
   *
   * @example
   * ```ts
   * const results = await queueManager.retryAllFailed()
   * console.log('Retried jobs:', results)
   * // { 'send-email': 5, 'generate-report': 2 }
   * ```
   */
  async retryAllFailed(options?: JobOptions): Promise<Record<string, number>> {
    const results: Record<string, number> = {}

    for (const [name, queue] of this.queues.entries()) {
      const retried = await queue.retryBulk(undefined, options)
      if (retried > 0) {
        results[name] = retried
      }
    }

    this.logger.info('All failed jobs retried', { results })

    return results
  }

  /**
   * Clean old jobs from a specific queue
   *
   * @param jobName - Job name (queue name)
   * @param grace - Grace period in ms (jobs older than this will be cleaned)
   * @param limit - Max number of jobs to clean
   * @param type - Job type to clean
   * @returns Array of cleaned job IDs
   *
   * @example
   * ```ts
   * // Clean completed jobs older than 1 day
   * await queueManager.cleanQueue('send-email', 86400000, 1000, 'completed')
   * ```
   */
  async cleanQueue(
    jobName: string,
    grace: number,
    limit: number = 1000,
    type: 'completed' | 'failed' = 'completed'
  ): Promise<string[]> {
    const queue = this.getQueue(jobName)
    if (!queue) {
      throw new JobNotFoundError(jobName)
    }

    const cleaned = await queue.clean(grace, limit, type)

    this.logger.info('Queue cleaned', {
      jobName,
      count: cleaned.length,
      type,
      graceMs: grace,
    })

    return cleaned
  }

  /**
   * Clean old jobs from all queues
   *
   * @param grace - Grace period in ms (jobs older than this will be cleaned)
   * @param limit - Max number of jobs to clean per queue
   * @param type - Job type to clean
   * @returns Map of job names to array of cleaned job IDs
   *
   * @example
   * ```ts
   * // Clean completed jobs older than 1 day from all queues
   * const results = await queueManager.cleanAll(86400000, 1000, 'completed')
   * ```
   */
  async cleanAll(
    grace: number,
    limit: number = 1000,
    type: 'completed' | 'failed' = 'completed'
  ): Promise<Record<string, string[]>> {
    const results: Record<string, string[]> = {}

    for (const [name, queue] of this.queues.entries()) {
      const cleaned = await queue.clean(grace, limit, type)
      if (cleaned.length > 0) {
        results[name] = cleaned
      }
    }

    this.logger.info('All queues cleaned', {
      totalQueues: Object.keys(results).length,
      type,
      graceMs: grace,
    })

    return results
  }

  /**
   * Drain a specific queue - process all jobs and prevent new ones
   *
   * @param jobName - Job name (queue name)
   * @returns Number of jobs that were drained
   *
   * @example
   * ```ts
   * await queueManager.drainQueue('send-email')
   * console.log('Email queue drained')
   * ```
   */
  async drainQueue(jobName: string): Promise<number> {
    const queue = this.getQueue(jobName)
    if (!queue) {
      throw new JobNotFoundError(jobName)
    }

    const drained = await queue.drain()

    this.logger.info('Queue drained', {
      jobName,
      count: drained,
    })

    return drained
  }

  /**
   * Drain all queues
   *
   * @returns Map of job names to count of drained jobs
   *
   * @example
   * ```ts
   * const results = await queueManager.drainAll()
   * console.log('All queues drained:', results)
   * ```
   */
  async drainAll(): Promise<Record<string, number>> {
    const results: Record<string, number> = {}

    for (const [name, queue] of this.queues.entries()) {
      const drained = await queue.drain()
      results[name] = drained
    }

    this.logger.info('All queues drained', { results })

    return results
  }

  /**
   * Pause specific queues
   *
   * @param jobNames - Array of job names (queue names) to pause
   *
   * @example
   * ```ts
   * await queueManager.pauseQueues(['send-email', 'generate-report'])
   * ```
   */
  async pauseQueues(jobNames: string[]): Promise<void> {
    const promises = jobNames.map(async name => {
      const queue = this.getQueue(name)
      if (queue) {
        await queue.pause()
      }
    })

    await Promise.all(promises)

    this.logger.info('Queues paused', { queues: jobNames })
  }

  /**
   * Resume specific queues
   *
   * @param jobNames - Array of job names (queue names) to resume
   *
   * @example
   * ```ts
   * await queueManager.resumeQueues(['send-email', 'generate-report'])
   * ```
   */
  async resumeQueues(jobNames: string[]): Promise<void> {
    const promises = jobNames.map(async name => {
      const queue = this.getQueue(name)
      if (queue) {
        await queue.resume()
      }
    })

    await Promise.all(promises)

    this.logger.info('Queues resumed', { queues: jobNames })
  }

  /**
   * Pause all workers
   */
  async pauseAll(): Promise<void> {
    const promises = Array.from(this.workers.values()).map(w => w.pause())
    await Promise.all(promises)
    this.logger.info('All workers paused')
  }

  /**
   * Resume all workers
   */
  async resumeAll(): Promise<void> {
    const promises = Array.from(this.workers.values()).map(w => w.resume())
    await Promise.all(promises)
    this.logger.info('All workers resumed')
  }

  /**
   * Close all workers and queues gracefully
   */
  async close(): Promise<void> {
    this.logger.info('Closing QueueManager')

    // Settle window: BullMQ issues its own background commands right after
    // creating a Queue (an internal meta hmset - see bullmq's Queue
    // constructor). Those commands run
    // on promises this class never gets a handle to. If the connection is
    // torn down while one is still in flight, ioredis rejects it directly
    // (ioredis's closeHandler -> flushQueue) - and unlike a connection-level
    // failure (which core/Queue.ts's/DeadLetterQueue.ts's 'error' listeners
    // already convert to a logged event no matter the timing), an in-flight
    // COMMAND's rejection has nothing else to catch it, so it leaks as an
    // unhandled rejection instead. Giving recently-issued commands a brief
    // window to finish (successfully, against a real Redis - or fail and
    // be absorbed by BullMQ's own internal .catch()) avoids the race
    // instead of trying to enumerate and individually catch every such
    // command. ponytail: fixed ceiling, not a retry loop - bump if a
    // slower CI runner still races this.
    await new Promise(resolve => setTimeout(resolve, 200))

    // Best-effort shutdown: a connection that never became healthy (bad
    // host, network down, ...) can reject on close() the same way it
    // rejected on every other command. One failing queue/worker/DLQ
    // shouldn't stop the rest from being released or make a graceful
    // shutdown throw - log and move on, matching the resilience pattern
    // utils/redis.ts's closeRedis() already uses for a single connection.
    const closeQuietly = (label: string, task: Promise<void>) =>
      task.catch(error => {
        this.logger.error(`Error closing ${label} during shutdown`, {
          error: error instanceof Error ? error.message : String(error),
        })
      })

    // Close all workers
    const workerPromises = Array.from(this.workers.entries()).map(([name, w]) =>
      closeQuietly(`worker '${name}'`, w.close())
    )
    await Promise.all(workerPromises)
    this.workers.clear()

    // Close all queues
    const queuePromises = Array.from(this.queues.entries()).map(([name, q]) =>
      closeQuietly(`queue '${name}'`, q.close())
    )
    await Promise.all(queuePromises)
    this.queues.clear()

    // Close DLQ if enabled
    if (this.dlq) {
      await closeQuietly('DLQ', this.dlq.close())
    }

    this.logger.info('QueueManager closed successfully')
  }

  /**
   * Validate all registered jobs
   */
  validate(): void {
    this.registry.validate()
  }
}
