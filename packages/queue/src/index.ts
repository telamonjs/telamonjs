/**
 * @telamonjs/queue
 *
 * Production-ready job queue system for telamonjs with BullMQ, Redis, and Bull Board
 *
 * @example
 * ```ts
 * import { QueueManager, Job } from '@telamonjs/queue'
 *
 * // Define a job
 * class SendEmailJob extends Job<EmailData, void> {
 *   name = 'send-email' as const
 *
 *   async process(data: EmailData) {
 *     await sendEmail(data)
 *   }
 * }
 *
 * // Setup queue manager
 * const queueManager = new QueueManager({
 *   redis: { host: 'localhost', port: 6379 }
 * })
 *
 * // Register jobs
 * queueManager.register(SendEmailJob)
 *
 * // Add jobs
 * await queueManager.add(SendEmailJob, { to: 'user@example.com', ... })
 *
 * // Create workers
 * await queueManager.createWorkers({ concurrency: 5 })
 * ```
 */

// Core exports
export {
  Job,
  Worker,
  QueueManager,
  FlowProducer,
  DeadLetterQueue,
  QueueRegistry,
  JobPriority,
  PRIORITY_NAMES,
  PRIORITY_DESCRIPTIONS,
  getPriorityName,
  getPriorityDescription,
  isHigherPriority,
  getHighestPriority,
  getLowestPriority,
  isValidPriority,
  clampPriority,
  sortByPriority,
  groupByPriority,
  getPriorityDistribution,
  suggestPriority,
  SchedulePatterns,
  Timezones,
  everyMinutes,
  everyHours,
  dailyAt,
  weeklyOn,
  monthlyOn,
  yearlyOn,
  weekdays,
  weekends,
  isValidCronPattern,
  parseSchedule,
  formatCronPattern,
} from './core/index.js'

export type {
  IJob,
  JobConfigDefaults,
  JobConstructor,
  JobOptions,
  JobHooks,
  QueueConfig,
  WorkerConfig,
  RedisConfig,
  CronSchedule,
  FlowDefinition,
  FlowChildJob,
  QueueStats,
  HealthCheckResult,
  MetricDataPoint,
  DLQEntry,
  DLQStats,
  DeadLetterQueueOptions,
  QueueRegistryConfig,
  QueueRegistryStats,
} from './core/index.js'

export {
  JobEventPublisher,
  jobStarted,
  jobProgress,
  jobCompleted,
  jobFailed,
  jobRetrying,
  publishWorkerEvents,
} from './events/index.js'
export type {
  JobEvent,
  JobEventType,
  JobEventPublisherOptions,
  PublishWorkerEventsOptions,
} from './events/index.js'

// SSE broadcaster (dashboard HTTP backend, 3.1.0+) — was built alongside
// getRedisConnectionMetrics (./monitoring) but missed the root barrel;
// `./events/index.ts` already re-exports it, this just surfaces it here too.
export { createSSEBroadcaster } from './events/index.js'
export type {
  SSEBroadcaster,
  SSEBroadcasterOptions,
  SSEClient,
} from './events/index.js'

// Utils exports
export {
  checkRedisHealth,
  redisConfigFromUrl,
  QueueError,
  JobNotFoundError,
  JobAlreadyRegisteredError,
  RedisConnectionError,
  WorkerError,
  QueueOperationError,
  JobValidationError,
  JobTimeoutError,
} from './utils/index.js'

// Dashboard exports (re-export from /dashboard entrypoint)
export type { DashboardConfig } from './dashboard/index.js'

// Monitoring exports (re-export from /monitoring entrypoint)
export { QueueMetrics, OptimizedQueueMetrics } from './monitoring/index.js'
export type { MetricsConfig } from './monitoring/index.js'

// BullMQ direct re-exports
export { Queue } from 'bullmq'
