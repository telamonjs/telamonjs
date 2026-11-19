/**
 * @telamonjs/queue/utils
 *
 * Utility functions
 */

export { checkRedisHealth } from './redis.js'

export { redisConfigFromUrl } from './redisConfigFromUrl.js'

export {
  // Error codes
  ErrorCode,

  // Base errors
  QueueError,

  // Configuration errors
  ConfigurationError,
  InvalidRedisConfigError,
  InvalidWorkerConfigError,
  InvalidJobOptionsError,
  InvalidJobNameError,
  InvalidCronScheduleError,

  // Job errors
  JobError,
  JobNotFoundError,
  JobAlreadyRegisteredError,
  JobValidationError,
  JobTimeoutError,
  JobExecutionError,
  JobTransformError,
  JobStalledError,

  // Worker errors
  WorkerError,
  WorkerNotFoundError,
  WorkerAlreadyExistsError,
  WorkerStartError,
  WorkerStopError,

  // Queue errors
  QueueOperationError,
  QueueNotFoundError,
  QueueAddError,
  QueueRemoveError,
  QueuePauseError,
  QueueResumeError,

  // Redis errors
  RedisError,
  RedisConnectionError,
  RedisHealthCheckError,

  // Flow errors
  FlowError,
  FlowInvalidStructureError,
  FlowExecutionError,

  // Registry errors
  RegistryError,
  RegistryValidationError,

  // Error utilities
  isQueueError,
  isOperationalError,
  getErrorCode,
  formatError,
} from './errors.js'

export { validateJobOptions } from './validation.js'

export type { ValidatedJobOptions } from './validation.js'
