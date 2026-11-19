/**
 * Error codes for the queue system
 */
export enum ErrorCode {
  // Configuration errors (1xxx)
  INVALID_CONFIGURATION = 'QUEUE_1000',
  INVALID_REDIS_CONFIG = 'QUEUE_1001',
  INVALID_WORKER_CONFIG = 'QUEUE_1002',
  INVALID_JOB_OPTIONS = 'QUEUE_1003',
  INVALID_JOB_NAME = 'QUEUE_1004',
  INVALID_CRON_SCHEDULE = 'QUEUE_1005',

  // Job errors (2xxx)
  JOB_NOT_FOUND = 'QUEUE_2000',
  JOB_ALREADY_REGISTERED = 'QUEUE_2001',
  JOB_VALIDATION_ERROR = 'QUEUE_2002',
  JOB_TIMEOUT = 'QUEUE_2003',
  JOB_EXECUTION_ERROR = 'QUEUE_2004',
  JOB_TRANSFORM_ERROR = 'QUEUE_2005',
  JOB_STALLED = 'QUEUE_2006',

  // Worker errors (3xxx)
  WORKER_ERROR = 'QUEUE_3000',
  WORKER_NOT_FOUND = 'QUEUE_3001',
  WORKER_ALREADY_EXISTS = 'QUEUE_3002',
  WORKER_START_ERROR = 'QUEUE_3003',
  WORKER_STOP_ERROR = 'QUEUE_3004',

  // Queue errors (4xxx)
  QUEUE_OPERATION_ERROR = 'QUEUE_4000',
  QUEUE_NOT_FOUND = 'QUEUE_4001',
  QUEUE_ADD_ERROR = 'QUEUE_4002',
  QUEUE_REMOVE_ERROR = 'QUEUE_4003',
  QUEUE_PAUSE_ERROR = 'QUEUE_4004',
  QUEUE_RESUME_ERROR = 'QUEUE_4005',

  // Redis errors (5xxx)
  REDIS_CONNECTION_ERROR = 'QUEUE_5000',
  REDIS_OPERATION_ERROR = 'QUEUE_5001',
  REDIS_HEALTH_CHECK_ERROR = 'QUEUE_5002',

  // Flow errors (6xxx)
  FLOW_ERROR = 'QUEUE_6000',
  FLOW_INVALID_STRUCTURE = 'QUEUE_6001',
  FLOW_EXECUTION_ERROR = 'QUEUE_6002',

  // Registry errors (7xxx)
  REGISTRY_ERROR = 'QUEUE_7000',
  REGISTRY_VALIDATION_ERROR = 'QUEUE_7001',

  // Generic errors (9xxx)
  UNKNOWN_ERROR = 'QUEUE_9000',
  INTERNAL_ERROR = 'QUEUE_9001',
}

/**
 * Base error class for queue system
 *
 * All custom errors extend this class
 */
export class QueueError extends Error {
  public readonly code: ErrorCode
  public readonly context: Record<string, unknown>
  public readonly timestamp: Date
  public readonly isOperational: boolean

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    context: Record<string, unknown> = {},
    isOperational: boolean = true
  ) {
    super(message)
    this.name = 'QueueError'
    this.code = code
    this.context = context
    this.timestamp = new Date()
    this.isOperational = isOperational

    Error.captureStackTrace(this, this.constructor)
  }

  /**
   * Convert error to JSON for logging/serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      isOperational: this.isOperational,
      stack: this.stack,
    }
  }
}

// ============================================================================
// Configuration Errors
// ============================================================================

export class ConfigurationError extends QueueError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCode.INVALID_CONFIGURATION, context)
    this.name = 'ConfigurationError'
  }
}

export class InvalidRedisConfigError extends ConfigurationError {
  constructor(message: string, config?: unknown) {
    super(`Invalid Redis configuration: ${message}`, { config })
    Object.defineProperty(this, 'code', {
      value: ErrorCode.INVALID_REDIS_CONFIG,
    })
    this.name = 'InvalidRedisConfigError'
  }
}

export class InvalidWorkerConfigError extends ConfigurationError {
  constructor(message: string, config?: unknown) {
    super(`Invalid Worker configuration: ${message}`, { config })
    Object.defineProperty(this, 'code', {
      value: ErrorCode.INVALID_WORKER_CONFIG,
    })
    this.name = 'InvalidWorkerConfigError'
  }
}

export class InvalidJobOptionsError extends ConfigurationError {
  constructor(jobName: string, message: string, options?: unknown) {
    super(`Invalid options for job '${jobName}': ${message}`, {
      jobName,
      options,
    })
    Object.defineProperty(this, 'code', {
      value: ErrorCode.INVALID_JOB_OPTIONS,
    })
    this.name = 'InvalidJobOptionsError'
  }
}

export class InvalidJobNameError extends ConfigurationError {
  constructor(jobName: string, reason: string) {
    super(`Invalid job name '${jobName}': ${reason}`, { jobName, reason })
    Object.defineProperty(this, 'code', { value: ErrorCode.INVALID_JOB_NAME })
    this.name = 'InvalidJobNameError'
  }
}

export class InvalidCronScheduleError extends ConfigurationError {
  constructor(schedule: string, reason: string) {
    super(`Invalid cron schedule '${schedule}': ${reason}`, {
      schedule,
      reason,
    })
    Object.defineProperty(this, 'code', {
      value: ErrorCode.INVALID_CRON_SCHEDULE,
    })
    this.name = 'InvalidCronScheduleError'
  }
}

// ============================================================================
// Job Errors
// ============================================================================

export class JobError extends QueueError {
  constructor(
    jobName: string,
    message: string,
    code: ErrorCode = ErrorCode.JOB_EXECUTION_ERROR,
    context?: Record<string, unknown>
  ) {
    super(message, code, { jobName, ...context })
    this.name = 'JobError'
  }
}

export class JobNotFoundError extends JobError {
  constructor(jobName: string) {
    super(
      jobName,
      `Job '${jobName}' is not registered`,
      ErrorCode.JOB_NOT_FOUND
    )
    this.name = 'JobNotFoundError'
  }
}

export class JobAlreadyRegisteredError extends JobError {
  constructor(jobName: string) {
    super(
      jobName,
      `Job '${jobName}' is already registered`,
      ErrorCode.JOB_ALREADY_REGISTERED
    )
    this.name = 'JobAlreadyRegisteredError'
  }
}

export class JobValidationError extends JobError {
  constructor(jobName: string, errors: string[] | string) {
    const errorList = Array.isArray(errors) ? errors : [errors]
    super(
      jobName,
      `Job '${jobName}' validation failed: ${errorList.join(', ')}`,
      ErrorCode.JOB_VALIDATION_ERROR,
      { errors: errorList }
    )
    this.name = 'JobValidationError'
  }
}

export class JobTimeoutError extends JobError {
  constructor(jobName: string, jobId: string, timeoutMs: number) {
    super(
      jobName,
      `Job '${jobName}' (${jobId}) timed out after ${timeoutMs}ms`,
      ErrorCode.JOB_TIMEOUT,
      { jobId, timeoutMs }
    )
    this.name = 'JobTimeoutError'
  }
}

export class JobExecutionError extends JobError {
  constructor(jobName: string, jobId: string, originalError: Error) {
    super(
      jobName,
      `Job '${jobName}' (${jobId}) execution failed: ${originalError.message}`,
      ErrorCode.JOB_EXECUTION_ERROR,
      {
        jobId,
        originalError: originalError.message,
        stack: originalError.stack,
      }
    )
    this.name = 'JobExecutionError'
  }
}

export class JobTransformError extends JobError {
  constructor(jobName: string, originalError: Error) {
    super(
      jobName,
      `Job '${jobName}' data transformation failed: ${originalError.message}`,
      ErrorCode.JOB_TRANSFORM_ERROR,
      { originalError: originalError.message }
    )
    this.name = 'JobTransformError'
  }
}

export class JobStalledError extends JobError {
  constructor(jobName: string, jobId: string) {
    super(
      jobName,
      `Job '${jobName}' (${jobId}) has stalled`,
      ErrorCode.JOB_STALLED,
      { jobId }
    )
    this.name = 'JobStalledError'
  }
}

// ============================================================================
// Worker Errors
// ============================================================================

export class WorkerError extends QueueError {
  constructor(
    workerName: string,
    message: string,
    code: ErrorCode = ErrorCode.WORKER_ERROR,
    context?: Record<string, unknown>
  ) {
    super(message, code, { workerName, ...context })
    this.name = 'WorkerError'
  }
}

export class WorkerNotFoundError extends WorkerError {
  constructor(workerName: string) {
    super(
      workerName,
      `Worker '${workerName}' not found`,
      ErrorCode.WORKER_NOT_FOUND
    )
    this.name = 'WorkerNotFoundError'
  }
}

export class WorkerAlreadyExistsError extends WorkerError {
  constructor(workerName: string) {
    super(
      workerName,
      `Worker '${workerName}' already exists`,
      ErrorCode.WORKER_ALREADY_EXISTS
    )
    this.name = 'WorkerAlreadyExistsError'
  }
}

export class WorkerStartError extends WorkerError {
  constructor(workerName: string, reason: string) {
    super(
      workerName,
      `Failed to start worker '${workerName}': ${reason}`,
      ErrorCode.WORKER_START_ERROR,
      { reason }
    )
    this.name = 'WorkerStartError'
  }
}

export class WorkerStopError extends WorkerError {
  constructor(workerName: string, reason: string) {
    super(
      workerName,
      `Failed to stop worker '${workerName}': ${reason}`,
      ErrorCode.WORKER_STOP_ERROR,
      { reason }
    )
    this.name = 'WorkerStopError'
  }
}

// ============================================================================
// Queue Errors
// ============================================================================

export class QueueOperationError extends QueueError {
  constructor(
    queueName: string,
    operation: string,
    message: string,
    context?: Record<string, unknown>
  ) {
    super(
      `Queue '${queueName}' ${operation} failed: ${message}`,
      ErrorCode.QUEUE_OPERATION_ERROR,
      { queueName, operation, ...context }
    )
    this.name = 'QueueOperationError'
  }
}

export class QueueNotFoundError extends QueueOperationError {
  constructor(queueName: string) {
    super(queueName, 'find', `Queue '${queueName}' not found`)
    Object.defineProperty(this, 'code', { value: ErrorCode.QUEUE_NOT_FOUND })
    this.name = 'QueueNotFoundError'
  }
}

export class QueueAddError extends QueueOperationError {
  constructor(queueName: string, reason: string, data?: unknown) {
    super(queueName, 'add', reason, { data })
    Object.defineProperty(this, 'code', { value: ErrorCode.QUEUE_ADD_ERROR })
    this.name = 'QueueAddError'
  }
}

export class QueueRemoveError extends QueueOperationError {
  constructor(queueName: string, jobId: string, reason: string) {
    super(queueName, 'remove', reason, { jobId })
    Object.defineProperty(this, 'code', { value: ErrorCode.QUEUE_REMOVE_ERROR })
    this.name = 'QueueRemoveError'
  }
}

export class QueuePauseError extends QueueOperationError {
  constructor(queueName: string, reason: string) {
    super(queueName, 'pause', reason)
    Object.defineProperty(this, 'code', { value: ErrorCode.QUEUE_PAUSE_ERROR })
    this.name = 'QueuePauseError'
  }
}

export class QueueResumeError extends QueueOperationError {
  constructor(queueName: string, reason: string) {
    super(queueName, 'resume', reason)
    Object.defineProperty(this, 'code', { value: ErrorCode.QUEUE_RESUME_ERROR })
    this.name = 'QueueResumeError'
  }
}

// ============================================================================
// Redis Errors
// ============================================================================

export class RedisError extends QueueError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.REDIS_OPERATION_ERROR,
    context?: Record<string, unknown>
  ) {
    super(`Redis error: ${message}`, code, context)
    this.name = 'RedisError'
  }
}

export class RedisConnectionError extends RedisError {
  constructor(message: string, connectionConfig?: unknown) {
    super(message, ErrorCode.REDIS_CONNECTION_ERROR, { connectionConfig })
    this.name = 'RedisConnectionError'
  }
}

export class RedisHealthCheckError extends RedisError {
  constructor(message: string) {
    super(message, ErrorCode.REDIS_HEALTH_CHECK_ERROR)
    this.name = 'RedisHealthCheckError'
  }
}

// ============================================================================
// Flow Errors
// ============================================================================

export class FlowError extends QueueError {
  constructor(
    flowName: string,
    message: string,
    code: ErrorCode = ErrorCode.FLOW_ERROR,
    context?: Record<string, unknown>
  ) {
    super(message, code, { flowName, ...context })
    this.name = 'FlowError'
  }
}

export class FlowInvalidStructureError extends FlowError {
  constructor(flowName: string, reason: string) {
    super(
      flowName,
      `Flow '${flowName}' has invalid structure: ${reason}`,
      ErrorCode.FLOW_INVALID_STRUCTURE,
      { reason }
    )
    this.name = 'FlowInvalidStructureError'
  }
}

export class FlowExecutionError extends FlowError {
  constructor(flowName: string, reason: string) {
    super(
      flowName,
      `Flow '${flowName}' execution failed: ${reason}`,
      ErrorCode.FLOW_EXECUTION_ERROR,
      { reason }
    )
    this.name = 'FlowExecutionError'
  }
}

// ============================================================================
// Registry Errors
// ============================================================================

export class RegistryError extends QueueError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.REGISTRY_ERROR,
    context?: Record<string, unknown>
  ) {
    super(message, code, context)
    this.name = 'RegistryError'
  }
}

export class RegistryValidationError extends RegistryError {
  constructor(message: string, errors: string[]) {
    super(
      `Registry validation failed: ${message}`,
      ErrorCode.REGISTRY_VALIDATION_ERROR,
      { errors }
    )
    this.name = 'RegistryValidationError'
  }
}

// ============================================================================
// Error Utilities
// ============================================================================

/**
 * Check if error is a QueueError
 */
export function isQueueError(error: unknown): error is QueueError {
  return error instanceof QueueError
}

/**
 * Check if error is operational (recoverable)
 */
export function isOperationalError(error: unknown): boolean {
  if (isQueueError(error)) {
    return error.isOperational
  }
  return false
}

/**
 * Extract error code from any error
 */
export function getErrorCode(error: unknown): ErrorCode {
  if (isQueueError(error)) {
    return error.code
  }
  return ErrorCode.UNKNOWN_ERROR
}

/**
 * Format error for logging
 */
export function formatError(error: unknown): Record<string, unknown> {
  if (isQueueError(error)) {
    return error.toJSON()
  }

  // Type guard for Error-like objects
  if (error && typeof error === 'object' && 'message' in error) {
    const err = error as Error
    return {
      name: err.name || 'Error',
      message: err.message || String(error),
      stack: 'stack' in err ? err.stack : undefined,
      timestamp: new Date(),
    }
  }

  return {
    name: 'Error',
    message: String(error),
    timestamp: new Date(),
  }
}
