import { z } from 'zod'

/**
 * Validation schemas for queue system using Zod
 *
 * All schemas are exported for use in custom validations
 */

// ============================================================================
// Redis Configuration
// ============================================================================

// RedisConfig (types.ts) is typed with a `[key: string]: any` index signature
// specifically so callers can pass through arbitrary ioredis options
// (retryStrategy, tls, connectTimeout, family, ...) alongside the handful of
// fields this schema knows about. z.object() strips unknown keys by default,
// which silently discarded those extra options during validation (e.g. a
// custom retryStrategy meant to fail fast on an unreachable host was dropped,
// leaving BullMQ's own never-give-up default retryStrategy in place instead -
// see redis-connection.js:32-34 in bullmq). .passthrough() keeps them.
export const RedisConfigSchema = z
  .object({
    host: z.string().min(1).optional().default('localhost'),
    port: z.number().int().min(1).max(65535).optional().default(6379),
    password: z.string().optional(),
    db: z.number().int().min(0).max(15).optional().default(0),
    maxRetriesPerRequest: z.number().int().nullable().optional(),
    enableReadyCheck: z.boolean().optional().default(true),
    enableOfflineQueue: z.boolean().optional().default(true),
  })
  .passthrough()

// ============================================================================
// Job Options
// ============================================================================

export const BackoffOptionsSchema = z.union([
  z.number().int().positive(),
  z.object({
    type: z.enum(['fixed', 'exponential']),
    delay: z.number().int().positive(),
  }),
])

/**
 * BullMQ's `KeepJobs`: either just `count`, or `age` with optional `count`/`limit`.
 * The `JobOptions` type always accepted this shape; up to 3.2.0 the validator
 * didn't, and every `add()` with `{ count, age }` was rejected only at runtime --
 * TypeScript compiled, unit tests passed, and the queue stopped in production.
 */
const KeepJobsSchema = z.union([
  z.object({ count: z.number().int().nonnegative() }).strict(),
  z
    .object({
      age: z.number().int().positive(),
      count: z.number().int().nonnegative().optional(),
      limit: z.number().int().positive().optional(),
    })
    .strict(),
])

const RemoveOnSchema = z.union([
  z.boolean(),
  z.number().int().nonnegative(),
  KeepJobsSchema,
])

export const JobOptionsSchema = z.object({
  attempts: z.number().int().min(1).max(100).optional().default(3),
  backoff: BackoffOptionsSchema.optional(),
  priority: z.number().int().min(1).max(10).optional(),
  delay: z.number().int().min(0).optional(),
  timeout: z.number().int().positive().optional(),
  removeOnComplete: RemoveOnSchema.optional(),
  removeOnFail: RemoveOnSchema.optional(),
  jobId: z.string().min(1).optional(),
})

export type ValidatedJobOptions = z.infer<typeof JobOptionsSchema>

// ============================================================================
// Queue Configuration
// ============================================================================

export const QueueConfigSchema = z.object({
  redis: RedisConfigSchema,
  defaultJobOptions: JobOptionsSchema.optional(),
  prefix: z.string().min(1).max(50).optional().default('telamonjs'),
  enableMetrics: z.boolean().optional().default(false),
  logger: z.any().optional(), // ILogger interface, cannot validate at runtime
  // No `.default()`: QueueManager reads this as `config.enableDLQ !== false`
  // (absent = enabled) — a default here would bake `true` into the parsed
  // config and be indistinguishable from an explicit `true`, which is fine,
  // but more importantly a MISSING default would previously make Zod's
  // object().parse() strip this key entirely (unknown-key stripping), which
  // is the bug this field declaration fixes: `enableDLQ: false` was silently
  // discarded and the DLQ was always created.
  enableDLQ: z.boolean().optional(),
  // Shape only; DeadLetterQueue's constructor validates the values.
  dlqRetention: z
    .object({ maxAge: z.number().optional(), maxLen: z.number().optional() })
    .optional(),
})

export type ValidatedQueueConfig = z.infer<typeof QueueConfigSchema>

// ============================================================================
// Worker Configuration
// ============================================================================

export const WorkerConfigSchema = z.object({
  concurrency: z.number().int().min(1).max(100).optional().default(5),
  limiter: z
    .object({
      max: z.number().int().positive(),
      duration: z.number().int().positive(),
    })
    .optional(),
  autoRun: z.boolean().optional().default(true),
  metrics: z.boolean().optional().default(false),
  concurrencyPerQueue: z.record(z.number().int().min(1).max(100)).optional(),
  timeoutPerQueue: z.record(z.number().int().positive()).optional(),
})

export type ValidatedWorkerConfig = z.infer<typeof WorkerConfigSchema>

// ============================================================================
// Job Name Validation
// ============================================================================

export const JobNameSchema = z
  .string()
  .min(1, 'Job name cannot be empty')
  .max(100, 'Job name too long (max 100 characters)')
  .regex(
    /^[a-z0-9-_]+$/,
    'Job name must contain only lowercase letters, numbers, hyphens, and underscores'
  )

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate Queue configuration
 *
 * @throws {z.ZodError} If validation fails
 */
export function validateQueueConfig(config: unknown): ValidatedQueueConfig {
  return QueueConfigSchema.parse(config)
}

/**
 * Validate Worker configuration
 *
 * @throws {z.ZodError} If validation fails
 */
export function validateWorkerConfig(config: unknown): ValidatedWorkerConfig {
  return WorkerConfigSchema.parse(config)
}

/**
 * Validate Job options
 *
 * @throws {z.ZodError} If validation fails
 */
export function validateJobOptions(options: unknown): ValidatedJobOptions {
  return JobOptionsSchema.parse(options)
}

/**
 * Validate Job name
 *
 * @throws {z.ZodError} If validation fails
 */
export function validateJobName(name: unknown): string {
  return JobNameSchema.parse(name)
}

// ============================================================================
// Error Formatting
// ============================================================================

/**
 * Format Zod validation errors into readable message
 */
export function formatValidationError(error: z.ZodError): string {
  const errors = error.errors.map(err => {
    const path = err.path.join('.')
    return `${path}: ${err.message}`
  })

  return `Validation failed:\n${errors.join('\n')}`
}

