import type {
  IJob,
  JobOptions,
  JobHooks,
  JobConfigDefaults,
} from './types.js'
import { ConfigurationError } from '../utils/errors.js'

/**
 * Abstract Job class
 *
 * Extend this class to create type-safe jobs:
 *
 * @example
 * ```ts
 * interface EmailData {
 *   to: string
 *   subject: string
 *   body: string
 * }
 *
 * export class SendEmailJob extends Job<EmailData, void> {
 *   name = 'send-email' as const
 *
 *   options: JobOptions = {
 *     attempts: 3,
 *     backoff: { type: 'exponential', delay: 1000 },
 *     timeout: 30000
 *   }
 *
 *   async process(data: EmailData): Promise<void> {
 *     await sendEmail(data)
 *   }
 *
 *   async onCompleted(): Promise<void> {
 *     console.log('Email sent!')
 *   }
 *
 *   async onFailed(error: Error): Promise<void> {
 *     console.error('Email failed:', error)
 *   }
 * }
 * ```
 */
export abstract class Job<TData = unknown, TResult = unknown>
  implements IJob<TData, TResult>
{
  /**
   * Unique job name/identifier
   * MUST be overridden in child class
   */
  abstract name: string

  /**
   * Job options (retry, timeout, priority, etc)
   * Can be overridden in child class
   */
  options: JobOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  }

  /**
   * Optional seed values for job-config bootstrap (`JobConfigStore` via
   * `setupFromConfig`, subpath `/job-config`).
   *
   * @example
   * ```ts
   * configDefaults = { cronPattern: '0 9 * * *', enabled: true, priority: 3 }
   * ```
   */
  configDefaults?: JobConfigDefaults

  /**
   * Main job processor
   * MUST be implemented in child class
   *
   * @param data - Job input data (type-safe via generic TData)
   * @param ctx - `ctx.signal` aborts when the job exceeds its timeout. A
   *   handler that ignores it keeps running while the retry starts (the job
   *   runs twice at once), so honor it or make the handler idempotent.
   * @returns Job result (type-safe via generic TResult)
   * @throws Error if job should be retried
   */
  abstract process(
    data: TData,
    ctx?: { signal: AbortSignal }
  ): Promise<TResult>

  /**
   * Called when job becomes active
   * Override in child class for custom logic
   */
  async onActive?(_data: TData): Promise<void> {
    // Optional hook - override in child class
  }

  /**
   * Called on successful job completion
   * Override in child class for custom logic
   */
  async onCompleted?(_result: TResult): Promise<void> {
    // Optional hook - override in child class
  }

  /**
   * Called when job fails
   * Override in child class for custom logic
   */
  async onFailed?(_error: Error): Promise<void> {
    // Optional hook - override in child class
  }

  /**
   * Called on job progress update
   * Override in child class for custom logic
   */
  async onProgress?(_progress: number | object): Promise<void> {
    // Optional hook - override in child class
  }

  /**
   * Called when job is stalled
   * Override in child class for custom logic
   */
  async onStalled?(): Promise<void> {
    // Optional hook - override in child class
  }

  /**
   * Get all defined hooks for this job
   * Used internally by Worker
   */
  get hooks(): JobHooks<TData, TResult> {
    return {
      onActive: this.onActive?.bind(this),
      onCompleted: this.onCompleted?.bind(this),
      onFailed: this.onFailed?.bind(this),
      onProgress: this.onProgress?.bind(this),
      onStalled: this.onStalled?.bind(this),
    }
  }

  /**
   * Validate job data before processing
   * Override in child class for custom validation
   *
   * @param data - Job data to validate
   * @throws Error if validation fails
   */
  async validate?(_data: TData): Promise<void> {
    // Optional validation - override in child class
  }

  /**
   * Transform job data before processing
   * Override in child class for custom transformation
   *
   * @param data - Original job data
   * @returns Transformed data
   */
  async transform?(data: TData): Promise<TData> {
    return data
  }

  /**
   * Serialize job for storage
   * Override if using custom data types (e.g., Date, BigInt)
   */
  serialize?(data: TData): unknown {
    return data
  }

  /**
   * Deserialize job from storage
   * Override if using custom data types
   */
  deserialize?(data: unknown): TData {
    return data as TData
  }
}

/**
 * `Job.schedule` was removed. A subclass can still declare a
 * `schedule` field (TypeScript allows extra properties), and it would then be
 * silently ignored - so registration fails loudly instead. Internal: not
 * re-exported from any barrel.
 */
export function assertNoLegacySchedule(name: string, job: object): void {
  if ('schedule' in job) {
    throw new ConfigurationError(
      `Job '${name}' still sets \`schedule\`, which was removed. ` +
        `Move its cron to Job.configDefaults.cronPattern (or JobConfigStore.set()) ` +
        `and run SchedulerReconciler (subpath /scheduler).`,
      { jobName: name }
    )
  }
}
