/**
 * Internal barrel for the core queue components. Not a package entry point
 * any more (the `./core` subpath was removed): the public names are
 * re-exported from the root.
 */

export { Job } from './Job.js'
export { Queue } from './Queue.js'
export { Worker } from './Worker.js'
export { JobRegistry } from './JobRegistry.js'
export { QueueManager } from './QueueManager.js'
export { FlowProducer } from './FlowProducer.js'
export { DeadLetterQueue } from './DeadLetterQueue.js'
export { QueueRegistry } from './QueueRegistry.js'

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
} from './types.js'

export type { DLQEntry, DLQStats } from './DeadLetterQueue.js'

export type { QueueRegistryConfig, QueueRegistryStats } from './QueueRegistry.js'

export {
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
} from './priorities.js'

export {
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
} from './scheduling.js'
