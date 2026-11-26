import { Worker as BullWorker } from 'bullmq'
import type { Job as BullJob, JobProgress } from 'bullmq'
import type { RedisConfig, WorkerConfig, IJob, JobOptions } from './types.js'
import type { ILogger } from '@telamonjs/logger'
import { NoOpLogger } from '@telamonjs/logger'
import type { DeadLetterQueue } from './DeadLetterQueue.js'
import { JobTimeoutError } from '../utils/errors.js'

// Node fires a setTimeout delay above 2^31-1 ms after 1 ms, which would fail
// every job of the queue at once.
const MAX_TIMER_MS = 2_147_483_647

/**
 * Type-safe Worker wrapper around BullMQ
 *
 * Executes jobs added to a queue
 *
 * @example
 * ```ts
 * const worker = new Worker('email', emailJob, redis, {
 *   concurrency: 5,
 *   limiter: {
 *     max: 100,
 *     duration: 1000
 *   }
 * })
 *
 * await worker.start()
 * ```
 */
export class Worker<TData = unknown, TResult = unknown> {
  private worker: BullWorker<TData, TResult>
  public readonly name: string
  private isRunning = false
  private logger: ILogger
  private dlq: DeadLetterQueue | null
  private readonly timeoutOverride: number | undefined

  constructor(
    name: string,
    private jobInstance: IJob<TData, TResult>,
    redis: RedisConfig,
    config: WorkerConfig = {},
    prefix: string = 'telamonjs',
    logger?: ILogger,
    dlq?: DeadLetterQueue | null
  ) {
    this.name = name

    this.logger = logger || new NoOpLogger()
    this.dlq = dlq || null
    this.timeoutOverride = config.timeoutPerQueue?.[name]

    this.worker = new BullWorker<TData, TResult>(
      name,
      async (job: BullJob<TData, TResult>) => {
        return await this.processJob(job)
      },
      {
        connection: redis,
        prefix,
        concurrency: config.concurrency || 5,
        limiter: config.limiter,
        autorun: config.autoRun !== false,
      }
    )

    this.setupEventHandlers()

    if (config.autoRun !== false) {
      this.isRunning = true
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: BullJob<TData, TResult>): Promise<TResult> {
    try {
      const result = await this.runWithTimeout(job)

      // Call onCompleted hook
      if (this.jobInstance.hooks?.onCompleted) {
        await this.jobInstance.hooks.onCompleted(result)
      }

      return result
    } catch (error) {
      // Call onFailed hook
      if (this.jobInstance.hooks?.onFailed && error instanceof Error) {
        await this.jobInstance.hooks.onFailed(error)
      }

      throw error
    }
  }

  /**
   * validate -> transform -> onActive -> process, raced against the job's
   * timeout: the per-queue override (JobConfigStore, via timeoutPerQueue),
   * else job.opts.timeout, else the class's own options.timeout (dashboard
   * dispatch and DLQ retry enqueue without it). On expiry the attempt fails
   * with JobTimeoutError, freeing the concurrency slot, and `ctx.signal`
   * aborts; a process() that ignores the signal keeps running unattended,
   * in parallel with the retry BullMQ then starts.
   */
  private async runWithTimeout(job: BullJob<TData, TResult>): Promise<TResult> {
    const configured =
      this.timeoutOverride ??
      (job.opts as JobOptions).timeout ??
      this.jobInstance.options?.timeout
    const timeoutMs =
      configured && configured > 0 ? Math.min(configured, MAX_TIMER_MS) : undefined
    const controller = new AbortController()

    const run = async (): Promise<TResult> => {
      if (this.jobInstance.validate) {
        await this.jobInstance.validate(job.data)
      }
      let data = job.data
      if (this.jobInstance.transform) {
        data = await this.jobInstance.transform(job.data)
      }
      if (this.jobInstance.hooks?.onActive) {
        await this.jobInstance.hooks.onActive(data)
      }
      return this.jobInstance.process(data, { signal: controller.signal })
    }

    if (timeoutMs === undefined) return run()

    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([
        run(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            const error = new JobTimeoutError(this.name, String(job.id), timeoutMs)
            controller.abort(error)
            reject(error)
          }, timeoutMs)
        }),
      ])
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * Setup event handlers for worker lifecycle
   */
  private setupEventHandlers(): void {
    this.worker.on('completed', (job: BullJob<TData, TResult>) => {
      this.logger.debug('Job completed', { jobId: job.id, jobName: this.name })
    })

    this.worker.on(
      'failed',
      async (job: BullJob<TData, TResult> | undefined, error: Error) => {
        if (job) {
          this.logger.error('Job failed', {
            jobId: job.id,
            jobName: this.name,
            error: error.message,
            attemptsMade: job.attemptsMade,
            maxAttempts: job.opts.attempts,
          })

          // Send to DLQ if job has exhausted all retries
          const maxAttempts = job.opts.attempts || 3
          if (this.dlq && job.attemptsMade >= maxAttempts) {
            try {
              await this.dlq.add(
                this.name,
                job.id || 'unknown',
                job.data,
                error,
                job.attemptsMade
              )
            } catch (dlqError) {
              this.logger.error('Failed to add job to DLQ', {
                jobId: job.id,
                jobName: this.name,
                error:
                  dlqError instanceof Error
                    ? dlqError.message
                    : String(dlqError),
              })
            }
          }
        } else {
          this.logger.error('Job failed', {
            jobName: this.name,
            error: error.message,
          })
        }
      }
    )

    this.worker.on('stalled', (jobId: string) => {
      this.logger.warn('Job stalled', { jobId, jobName: this.name })
      if (this.jobInstance.hooks?.onStalled) {
        this.jobInstance.hooks.onStalled()
      }
    })

    this.worker.on(
      'progress',
      (_job: BullJob<TData, TResult>, progress: JobProgress) => {
        if (this.jobInstance.hooks?.onProgress) {
          this.jobInstance.hooks.onProgress(progress as number | object)
        }
      }
    )

    this.worker.on('error', (error: Error) => {
      this.logger.error('Worker error', {
        jobName: this.name,
        error: error instanceof Error ? error.message : String(error),
      })
    })

    this.worker.on('ready', () => {
      this.logger.info('Worker ready', { jobName: this.name })
    })

    this.worker.on('closed', () => {
      this.logger.info('Worker closed', { jobName: this.name })
      this.isRunning = false
    })
  }

  /**
   * Start processing jobs
   */
  async start(): Promise<void> {
    if (!this.isRunning) {
      // BullMQ's Worker#run() intentionally does not resolve until the
      // worker's main processing loop stops (i.e. until close()/stop() is
      // called) - it's the loop itself, not a "start" signal. Awaiting it
      // here deadlocks start() forever. Fire it and let it run in the
      // background; readiness is tracked via isRunning like autorun does.
      // Evidence: bullmq Worker#run() -> `await this.mainLoopRunning`
      // (node_modules/.pnpm/bullmq@*/node_modules/bullmq/dist/cjs/classes/worker.js:190-212)
      void this.worker.run().catch(error => {
        this.logger.error('Worker main loop exited with error', {
          jobName: this.name,
          error: error instanceof Error ? error.message : String(error),
        })
      })
      this.isRunning = true
      this.logger.info('Worker started', { jobName: this.name })
    }
  }

  /**
   * Pause processing (current jobs will finish)
   */
  async pause(): Promise<void> {
    await this.worker.pause()
    this.logger.info('Worker paused', { jobName: this.name })
  }

  /**
   * Resume processing
   */
  async resume(): Promise<void> {
    await this.worker.resume()
    this.logger.info('Worker resumed', { jobName: this.name })
  }

  /**
   * Check if worker is running
   */
  isActive(): boolean {
    return this.isRunning && !this.worker.isPaused()
  }

  /**
   * Close worker gracefully
   * Waits for active jobs to complete
   */
  async close(): Promise<void> {
    if (this.isRunning) {
      this.logger.info('Worker closing', { jobName: this.name })
      await this.worker.close()
      this.isRunning = false
      this.logger.info('Worker closed successfully', { jobName: this.name })
    }
  }

  /**
   * Get underlying BullMQ worker (for advanced usage)
   */
  getRawWorker(): BullWorker<TData, TResult> {
    return this.worker
  }

  /**
   * Get worker name
   */
  getName(): string {
    return this.name
  }
}
