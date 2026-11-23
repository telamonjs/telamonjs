import { Queue as BullQueue } from 'bullmq'
import type { RedisConfig } from './types.js'
import type { ILogger } from '@telamonjs/logger'
import { NoOpLogger } from '@telamonjs/logger'
import {
  QueueOperationError,
  QueueNotFoundError,
  QueueRemoveError,
} from '../utils/errors.js'

/**
 * Dead Letter Queue Entry
 */
export interface DLQEntry<TData = unknown> {
  id: string
  jobName: string
  data: TData
  error: {
    message: string
    stack?: string
    code?: string
  }
  attempts: number
  failedAt: Date
  originalJobId: string
}

/**
 * DLQ Statistics
 */
export interface DLQStats {
  total: number
  byJobName: Record<string, number>
  oldest?: Date
  newest?: Date
}

/**
 * DLQ retention. Both limits are optional and applied every time an entry is
 * added; with neither set the DLQ keeps entries until they are deleted,
 * retried or cleared (the historical behaviour).
 */
export interface DeadLetterQueueOptions {
  /**
   * Drop entries older than this many milliseconds (measured from the moment
   * the entry was added to the DLQ).
   */
  maxAge?: number

  /**
   * Keep at most this many entries; the oldest are dropped first.
   */
  maxLen?: number
}

// Every state list() reads, minus 'active': nothing should be processing a
// DLQ entry, and removing a locked job would fail anyway.
const RETENTION_STATES = ['wait', 'paused', 'delayed', 'completed', 'failed'] as const

/**
 * Dead Letter Queue - Stores jobs that failed after max retries
 *
 * Jobs are automatically sent to DLQ when they fail permanently.
 * Provides utilities to inspect, retry, or delete failed jobs.
 *
 * @example
 * ```ts
 * const dlq = new DeadLetterQueue(redisConfig, logger)
 *
 * // List failed jobs
 * const entries = await dlq.list()
 *
 * // Retry a failed job
 * await dlq.retry('job-123', originalQueue)
 *
 * // Delete a failed job
 * await dlq.delete('job-123')
 * ```
 */
export class DeadLetterQueue {
  private queue: BullQueue
  private logger: ILogger
  private queueName: string
  private retention: DeadLetterQueueOptions

  constructor(
    redisConfig: RedisConfig,
    prefix: string = 'telamonjs',
    logger: ILogger = new NoOpLogger(),
    options: DeadLetterQueueOptions = {}
  ) {
    const { maxAge, maxLen } = options
    if (maxAge !== undefined && !(maxAge > 0)) {
      throw new Error(`DeadLetterQueue: maxAge must be a positive number of ms, got ${maxAge}`)
    }
    if (maxLen !== undefined && !(Number.isInteger(maxLen) && maxLen > 0)) {
      throw new Error(`DeadLetterQueue: maxLen must be a positive integer, got ${maxLen}`)
    }

    this.queueName = `${prefix}-dlq`
    this.logger = logger
    this.retention = options

    this.queue = new BullQueue(this.queueName, {
      connection: redisConfig,
      prefix,
    })

    // BullMQ's Queue is an EventEmitter that emits 'error' on connection
    // failures (bad host, connection closed mid-command, etc). With no
    // listener, that becomes an unhandled rejection/exception instead of a
    // logged, recoverable event - this is BullMQ's own documented
    // requirement, not something QueueManager.close() can wait out.
    this.queue.on('error', (error: Error) => {
      this.logger.error('DeadLetterQueue Redis connection error', {
        queueName: this.queueName,
        error: error.message,
      })
    })

    this.logger.info('DeadLetterQueue initialized', {
      queueName: this.queueName,
    })
  }

  /**
   * Add a failed job to the DLQ
   *
   * @param jobName - Original job name
   * @param jobId - Original job ID
   * @param data - Job data
   * @param error - Error that caused the failure
   * @param attempts - Number of attempts made
   */
  async add<TData = unknown>(
    jobName: string,
    jobId: string,
    data: TData,
    error: Error,
    attempts: number
  ): Promise<void> {
    try {
      const entry: DLQEntry<TData> = {
        id: `dlq-${jobName}-${jobId}`,
        jobName,
        data,
        error: {
          message: error.message,
          stack: error.stack,
          code: (error as NodeJS.ErrnoException).code,
        },
        attempts,
        failedAt: new Date(),
        originalJobId: jobId,
      }

      await this.queue.add(jobName, entry, {
        jobId: entry.id,
        removeOnComplete: false, // Keep DLQ entries
        removeOnFail: false,
      })

      this.logger.warn('Job added to DLQ', {
        jobName,
        jobId,
        attempts,
        error: error.message,
      })
    } catch (err) {
      throw new QueueOperationError(
        this.queueName,
        'add',
        `Failed to add job to DLQ: ${err instanceof Error ? err.message : String(err)}`,
        { jobName, jobId }
      )
    }

    // The entry is already stored: a retention failure must not turn a
    // successful add into an error. The next add retries the cleanup.
    await this.applyRetention().catch((err: unknown) => {
      this.logger.error('DLQ retention failed', {
        error: err instanceof Error ? err.message : String(err),
      })
    })
  }

  /**
   * List all jobs in the DLQ
   *
   * @param start - Start index (for pagination)
   * @param end - End index (for pagination)
   * @returns Array of DLQ entries
   */
  async list<TData = unknown>(
    start: number = 0,
    end: number = 100
  ): Promise<DLQEntry<TData>[]> {
    try {
      const jobs = await this.queue.getJobs(
        ['completed', 'failed', 'delayed', 'active', 'waiting'],
        start,
        end
      )

      return jobs.map(job => job.data as DLQEntry<TData>)
    } catch (err) {
      throw new QueueOperationError(
        this.queueName,
        'list',
        `Failed to list DLQ entries: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  /**
   * Get a specific DLQ entry by ID
   *
   * @param id - DLQ entry ID
   * @returns DLQ entry or null if not found
   */
  async get<TData = unknown>(id: string): Promise<DLQEntry<TData> | null> {
    try {
      const job = await this.queue.getJob(id)
      return job ? (job.data as DLQEntry<TData>) : null
    } catch (err) {
      throw new QueueOperationError(
        this.queueName,
        'get',
        `Failed to get DLQ entry: ${err instanceof Error ? err.message : String(err)}`,
        { id }
      )
    }
  }

  /**
   * Get DLQ statistics
   *
   * @returns DLQ statistics
   */
  async getStats(): Promise<DLQStats> {
    try {
      const jobs = await this.list(0, -1) // Get all

      const byJobName: Record<string, number> = {}
      let oldest: Date | undefined
      let newest: Date | undefined

      for (const entry of jobs) {
        // Count by job name
        byJobName[entry.jobName] = (byJobName[entry.jobName] || 0) + 1

        // Track oldest/newest
        const failedAt = new Date(entry.failedAt)
        if (!oldest || failedAt < oldest) {
          oldest = failedAt
        }
        if (!newest || failedAt > newest) {
          newest = failedAt
        }
      }

      return {
        total: jobs.length,
        byJobName,
        oldest,
        newest,
      }
    } catch (err) {
      throw new QueueOperationError(
        this.queueName,
        'getStats',
        `Failed to get DLQ stats: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  /**
   * Retry a failed job by re-adding it to the original queue
   *
   * @param id - DLQ entry ID
   * @param originalQueue - The original queue to retry the job in
   * @returns true if retried successfully
   */
  async retry<TData = unknown>(
    id: string,
    // Pin all 6 of BullMQ's Queue type params explicitly (NameType=string) -
    // see the comment on BullQueueOf in core/Queue.ts for why leaving them
    // deferred breaks `entry.jobName`/`entry.data` assignability below.
    originalQueue: BullQueue<TData, unknown, string, TData, unknown, string>
  ): Promise<boolean> {
    try {
      const entry = await this.get<TData>(id)

      if (!entry) {
        throw new QueueNotFoundError(`DLQ entry '${id}' not found`)
      }

      // Re-add to original queue
      await originalQueue.add(entry.jobName, entry.data, {
        attempts: 3, // Reset attempts
        removeOnComplete: true,
        removeOnFail: false,
      })

      // Remove from DLQ
      await this.delete(id)

      this.logger.info('Job retried from DLQ', {
        jobName: entry.jobName,
        dlqId: id,
        originalJobId: entry.originalJobId,
      })

      return true
    } catch (err) {
      if (err instanceof QueueNotFoundError) {
        throw err
      }
      throw new QueueOperationError(
        this.queueName,
        'retry',
        `Failed to retry job: ${err instanceof Error ? err.message : String(err)}`,
        { id }
      )
    }
  }

  /**
   * Delete a job from the DLQ
   *
   * @param id - DLQ entry ID
   * @returns true if deleted successfully
   */
  async delete(id: string): Promise<boolean> {
    try {
      const job = await this.queue.getJob(id)

      if (!job) {
        return false
      }

      await job.remove()

      this.logger.debug('Job removed from DLQ', { id })

      return true
    } catch (err) {
      throw new QueueRemoveError(
        this.queueName,
        id,
        `Failed to delete DLQ entry: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  /**
   * Clear all jobs from the DLQ
   *
   * @returns Number of jobs cleared
   */
  async clear(): Promise<number> {
    try {
      const jobs = await this.list(0, -1)
      let cleared = 0

      for (const entry of jobs) {
        const deleted = await this.delete(entry.id)
        if (deleted) cleared++
      }

      this.logger.info('DLQ cleared', { count: cleared })

      return cleared
    } catch (err) {
      throw new QueueOperationError(
        this.queueName,
        'clear',
        `Failed to clear DLQ: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  /**
   * Remove every entry added to the DLQ more than `ms` milliseconds ago.
   *
   * @param ms - Age threshold in milliseconds
   * @returns Number of entries removed
   */
  async purgeOlderThan(ms: number): Promise<number> {
    try {
      let removed = 0
      for (const state of RETENTION_STATES) {
        removed += (await this.queue.clean(ms, 0, state)).length
      }

      if (removed > 0) {
        this.logger.info('DLQ purged', { olderThanMs: ms, count: removed })
      }

      return removed
    } catch (err) {
      throw new QueueOperationError(
        this.queueName,
        'purgeOlderThan',
        `Failed to purge DLQ: ${err instanceof Error ? err.message : String(err)}`,
        { olderThanMs: ms }
      )
    }
  }

  private async applyRetention(): Promise<void> {
    const { maxAge, maxLen } = this.retention

    if (maxAge !== undefined) {
      await this.purgeOlderThan(maxAge)
    }

    if (maxLen !== undefined) {
      const total = await this.queue.getJobCountByTypes(...RETENTION_STATES)
      if (total <= maxLen) return

      // ponytail: reads every entry to find the oldest across states; fine
      // because the DLQ never grows past maxLen + 1 once this runs. A
      // per-state LTRIM-style trim would be the upgrade if maxLen gets huge.
      const jobs = await this.queue.getJobs([...RETENTION_STATES], 0, -1)
      jobs.sort((a, b) => b.timestamp - a.timestamp)
      const excess = jobs.slice(maxLen)
      for (const job of excess) {
        await job.remove()
      }
      this.logger.info('DLQ trimmed to maxLen', { maxLen, count: excess.length })
    }
  }

  /**
   * Filter DLQ entries by job name
   *
   * @param jobName - Job name to filter by
   * @returns Filtered DLQ entries
   */
  async filterByJobName<TData = unknown>(
    jobName: string
  ): Promise<DLQEntry<TData>[]> {
    const all = await this.list<TData>(0, -1)
    return all.filter(entry => entry.jobName === jobName)
  }

  /**
   * Get the raw BullMQ queue instance
   *
   * @returns BullMQ queue instance
   */
  getRawQueue(): BullQueue {
    return this.queue
  }

  /**
   * Close the DLQ gracefully
   */
  async close(): Promise<void> {
    await this.queue.close()
    this.logger.info('DeadLetterQueue closed')
  }
}
