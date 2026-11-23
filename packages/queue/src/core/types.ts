import type {
  JobsOptions,
  RepeatOptions,
  BackoffOptions,
  KeepJobs,
} from 'bullmq'
import type { ILogger } from '@telamonjs/logger'
import type { DeadLetterQueueOptions } from './DeadLetterQueue.js'

/**
 * Redis connection configuration
 */
export interface RedisConfig {
  host?: string
  port?: number
  password?: string
  db?: number
  maxRetriesPerRequest?: number | null
  enableReadyCheck?: boolean
  enableOfflineQueue?: boolean
  [key: string]: unknown
}

/**
 * Job options for BullMQ
 */
export interface JobOptions extends Omit<JobsOptions, 'repeat'> {
  /**
   * Number of retry attempts (default: 3)
   */
  attempts?: number

  /**
   * Backoff strategy
   */
  backoff?: BackoffOptions | number

  /**
   * Job priority (1-10, lower = higher priority)
   */
  priority?: number

  /**
   * Delay job execution (ms)
   */
  delay?: number

  /**
   * Job timeout (ms)
   */
  timeout?: number

  /**
   * Remove job on completion
   */
  removeOnComplete?: boolean | number | KeepJobs

  /**
   * Remove job on failure
   */
  removeOnFail?: boolean | number | KeepJobs

  /**
   * Custom job ID (for idempotency)
   */
  jobId?: string
}

/**
 * Optional per-job seed values for job-config bootstrap
 * (`@telamonjs/queue/job-config`'s `JobConfigStore.bootstrap()`).
 *
 * Deliberately shaped like that subpath's `JobConfigInput` so
 * `setupFromConfig` can pass a job's `configDefaults` straight into
 * `store.bootstrap()` - defined here (not imported from job-config) to keep
 * `core` free of a dependency on `job-config`.
 */
export interface JobConfigDefaults {
  description?: string
  enabled?: boolean
  cronPattern?: string | null
  timezone?: string
  priority?: number
  concurrency?: number | null
  timeout?: number | null
}

/**
 * Cron schedule configuration (returned by the scheduling helpers such as
 * `everyMinutes`/`dailyAt`).
 */
export interface CronSchedule extends RepeatOptions {
  /**
   * Cron expression (e.g., "0 9 * * *")
   */
  pattern?: string

  /**
   * Timezone (default: UTC)
   */
  tz?: string

  /**
   * Limit number of executions
   */
  limit?: number

  /**
   * End date for repetition
   */
  endDate?: Date | number
}

/**
 * Queue configuration
 */
export interface QueueConfig {
  /**
   * Redis connection config
   */
  redis: RedisConfig

  /**
   * Default job options
   */
  defaultJobOptions?: JobOptions

  /**
   * Queue name prefix (for multi-tenant)
   */
  prefix?: string

  /**
   * Enable metrics collection
   */
  enableMetrics?: boolean

  /**
   * Logger instance. If not provided, a default logger is created.
   * Pass `new NoOpLogger()` (from `@telamonjs/logger`) to silence it.
   */
  logger?: ILogger

  /**
   * Enable Dead Letter Queue for failed jobs
   * When enabled, jobs that fail after max retries are moved to DLQ
   * @default true
   */
  enableDLQ?: boolean

  /**
   * Retention for the Dead Letter Queue (`maxAge` ms and/or `maxLen`),
   * applied whenever an entry is added.
   * @default {} (keep entries until deleted, retried or cleared)
   */
  dlqRetention?: DeadLetterQueueOptions
}

/**
 * Worker configuration
 */
export interface WorkerConfig {
  /**
   * Number of concurrent jobs per worker
   */
  concurrency?: number

  /**
   * Rate limiter config
   */
  limiter?: {
    /**
     * Max jobs per duration
     */
    max: number

    /**
     * Duration in ms
     */
    duration: number
  }

  /**
   * Auto-run on creation
   */
  autoRun?: boolean

  /**
   * Enable metrics
   */
  metrics?: boolean

  /**
   * Per-queue concurrency overrides, keyed by job name.
   * Jobs not listed here fall back to `concurrency`.
   */
  concurrencyPerQueue?: Record<string, number>
}

/**
 * Job lifecycle hooks
 */
// Method syntax on purpose: it keeps a typed Job<{ id: string }> assignable to the
// untyped JobConstructor registries (setupFromConfig, SchedulerReconciler).
export interface JobHooks<TData = unknown, TResult = unknown> {
  /**
   * Called before job execution
   */
  onActive?(data: TData): Promise<void> | void

  /**
   * Called on successful completion
   */
  onCompleted?(result: TResult): Promise<void> | void

  /**
   * Called on job failure
   */
  onFailed?(error: Error): Promise<void> | void

  /**
   * Called on progress update
   */
  onProgress?(progress: number | object): Promise<void> | void

  /**
   * Called when job is stalled
   */
  onStalled?(): Promise<void> | void
}

/**
 * Abstract Job interface (implemented by Job class)
 */
export interface IJob<TData = unknown, TResult = unknown> {
  /**
   * Unique job name/identifier
   */
  name: string

  /**
   * Job options (retry, timeout, etc)
   */
  options?: JobOptions

  /**
   * Optional seed values for job-config bootstrap (`JobConfigStore` via
   * `setupFromConfig`, subpath `/job-config`). Lets a job class declare its
   * own cron/priority/enabled defaults instead of duplicating them in a
   * separate per-consumer defaults map.
   */
  configDefaults?: JobConfigDefaults

  /**
   * Main job processor
   */
  process(data: TData): Promise<TResult>

  /**
   * Lifecycle hooks
   */
  hooks?: JobHooks<TData, TResult>

  /**
   * Validate job data before processing (optional)
   */
  validate?(data: TData): Promise<void>

  /**
   * Transform job data before processing (optional)
   */
  transform?(data: TData): Promise<TData>

  /**
   * Serialize job for storage (optional)
   */
  serialize?(data: TData): unknown

  /**
   * Deserialize job from storage (optional)
   */
  deserialize?(data: unknown): TData
}

/**
 * Job constructor interface
 */
export interface JobConstructor<TData = unknown, TResult = unknown> {
  new (): IJob<TData, TResult>
}

/**
 * Flow child job definition
 */
export interface FlowChildJob<TData = unknown> {
  /**
   * Job class or name
   */
  job: JobConstructor | string

  /**
   * Job data
   */
  data: TData

  /**
   * Job options
   */
  options?: JobOptions

  /**
   * Nested children (for complex DAGs)
   */
  children?: FlowChildJob[]
}

/**
 * Flow definition
 */
export interface FlowDefinition<TData = unknown> {
  /**
   * Flow name
   */
  name: string

  /**
   * Root job
   */
  job?: JobConstructor | string

  /**
   * Root job data
   */
  data?: TData

  /**
   * Root job options
   */
  options?: JobOptions

  /**
   * Child jobs
   */
  children: FlowChildJob[]
}

/**
 * Queue stats
 */
export interface QueueStats {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  paused: number
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded'
  redis: {
    connected: boolean
    latency?: number
  }
  workers?: {
    running: number
    paused: number
  }
  queues?: Record<string, QueueStats>
  timestamp: Date
}

/**
 * Metrics data point
 */
export interface MetricDataPoint {
  name: string
  value: number
  labels?: Record<string, string>
  timestamp: Date
}
