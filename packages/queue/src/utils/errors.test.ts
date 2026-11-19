import { describe, it, expect } from 'vitest'
import {
  // Base
  QueueError,
  ErrorCode,

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

  // Utilities
  isQueueError,
  isOperationalError,
  getErrorCode,
  formatError,
} from './errors'

describe('Custom Errors', () => {
  describe('QueueError Base Class', () => {
    it('should create base queue error', () => {
      const error = new QueueError('Test error', ErrorCode.UNKNOWN_ERROR, {
        key: 'value',
      })

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(QueueError)
      expect(error.message).toBe('Test error')
      expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR)
      expect(error.context).toEqual({ key: 'value' })
      expect(error.isOperational).toBe(true)
      expect(error.timestamp).toBeInstanceOf(Date)
    })

    it('should capture stack trace', () => {
      const error = new QueueError('Test')
      expect(error.stack).toBeDefined()
    })

    it('should serialize to JSON', () => {
      const error = new QueueError('Test', ErrorCode.UNKNOWN_ERROR, {
        foo: 'bar',
      })
      const json = error.toJSON()

      expect(json).toHaveProperty('name')
      expect(json).toHaveProperty('message')
      expect(json).toHaveProperty('code')
      expect(json).toHaveProperty('context')
      expect(json).toHaveProperty('timestamp')
      expect(json).toHaveProperty('isOperational')
      expect(json).toHaveProperty('stack')
    })
  })

  describe('Configuration Errors', () => {
    it('should create InvalidRedisConfigError', () => {
      const error = new InvalidRedisConfigError('Port out of range', {
        port: 99999,
      })

      expect(error).toBeInstanceOf(ConfigurationError)
      expect(error.code).toBe(ErrorCode.INVALID_REDIS_CONFIG)
      expect(error.message).toContain('Invalid Redis configuration')
      expect(error.message).toContain('Port out of range')
    })

    it('should create InvalidWorkerConfigError', () => {
      const error = new InvalidWorkerConfigError('Invalid concurrency', {
        concurrency: 0,
      })

      expect(error).toBeInstanceOf(ConfigurationError)
      expect(error.code).toBe(ErrorCode.INVALID_WORKER_CONFIG)
      expect(error.context).toHaveProperty('config')
    })

    it('should create InvalidJobOptionsError', () => {
      const error = new InvalidJobOptionsError('test-job', 'Invalid attempts', {
        attempts: 0,
      })

      expect(error).toBeInstanceOf(ConfigurationError)
      expect(error.code).toBe(ErrorCode.INVALID_JOB_OPTIONS)
      expect(error.context.jobName).toBe('test-job')
    })

    it('should create InvalidJobNameError', () => {
      const error = new InvalidJobNameError('InvalidName', 'Must be lowercase')

      expect(error).toBeInstanceOf(ConfigurationError)
      expect(error.code).toBe(ErrorCode.INVALID_JOB_NAME)
      expect(error.message).toContain('InvalidName')
      expect(error.message).toContain('Must be lowercase')
    })

    it('should create InvalidCronScheduleError', () => {
      const error = new InvalidCronScheduleError(
        'invalid cron',
        'Must have 5-6 parts'
      )

      expect(error).toBeInstanceOf(ConfigurationError)
      expect(error.code).toBe(ErrorCode.INVALID_CRON_SCHEDULE)
    })
  })

  describe('Job Errors', () => {
    it('should create JobNotFoundError', () => {
      const error = new JobNotFoundError('missing-job')

      expect(error).toBeInstanceOf(JobError)
      expect(error.code).toBe(ErrorCode.JOB_NOT_FOUND)
      expect(error.message).toContain('missing-job')
      expect(error.context.jobName).toBe('missing-job')
    })

    it('should create JobAlreadyRegisteredError', () => {
      const error = new JobAlreadyRegisteredError('duplicate-job')

      expect(error).toBeInstanceOf(JobError)
      expect(error.code).toBe(ErrorCode.JOB_ALREADY_REGISTERED)
    })

    it('should create JobValidationError with string', () => {
      const error = new JobValidationError('test-job', 'Invalid data')

      expect(error).toBeInstanceOf(JobError)
      expect(error.code).toBe(ErrorCode.JOB_VALIDATION_ERROR)
      expect(error.message).toContain('Invalid data')
    })

    it('should create JobValidationError with array', () => {
      const error = new JobValidationError('test-job', ['Error 1', 'Error 2'])

      expect(error).toBeInstanceOf(JobError)
      expect(error.message).toContain('Error 1')
      expect(error.message).toContain('Error 2')
    })

    it('should create JobTimeoutError', () => {
      const error = new JobTimeoutError('slow-job', 'job-123', 30000)

      expect(error).toBeInstanceOf(JobError)
      expect(error.code).toBe(ErrorCode.JOB_TIMEOUT)
      expect(error.message).toContain('30000ms')
      expect(error.context.jobId).toBe('job-123')
      expect(error.context.timeoutMs).toBe(30000)
    })

    it('should create JobExecutionError', () => {
      const originalError = new Error('Database connection failed')
      const error = new JobExecutionError('test-job', 'job-456', originalError)

      expect(error).toBeInstanceOf(JobError)
      expect(error.code).toBe(ErrorCode.JOB_EXECUTION_ERROR)
      expect(error.message).toContain('Database connection failed')
      expect(error.context.originalError).toBe('Database connection failed')
    })

    it('should create JobTransformError', () => {
      const originalError = new Error('Invalid JSON')
      const error = new JobTransformError('transform-job', originalError)

      expect(error).toBeInstanceOf(JobError)
      expect(error.code).toBe(ErrorCode.JOB_TRANSFORM_ERROR)
    })

    it('should create JobStalledError', () => {
      const error = new JobStalledError('stuck-job', 'job-789')

      expect(error).toBeInstanceOf(JobError)
      expect(error.code).toBe(ErrorCode.JOB_STALLED)
      expect(error.context.jobId).toBe('job-789')
    })
  })

  describe('Worker Errors', () => {
    it('should create WorkerNotFoundError', () => {
      const error = new WorkerNotFoundError('missing-worker')

      expect(error).toBeInstanceOf(WorkerError)
      expect(error.code).toBe(ErrorCode.WORKER_NOT_FOUND)
    })

    it('should create WorkerAlreadyExistsError', () => {
      const error = new WorkerAlreadyExistsError('duplicate-worker')

      expect(error).toBeInstanceOf(WorkerError)
      expect(error.code).toBe(ErrorCode.WORKER_ALREADY_EXISTS)
    })

    it('should create WorkerStartError', () => {
      const error = new WorkerStartError(
        'test-worker',
        'Redis connection failed'
      )

      expect(error).toBeInstanceOf(WorkerError)
      expect(error.code).toBe(ErrorCode.WORKER_START_ERROR)
      expect(error.message).toContain('Redis connection failed')
    })

    it('should create WorkerStopError', () => {
      const error = new WorkerStopError('test-worker', 'Jobs still running')

      expect(error).toBeInstanceOf(WorkerError)
      expect(error.code).toBe(ErrorCode.WORKER_STOP_ERROR)
    })
  })

  describe('Queue Errors', () => {
    it('should create QueueOperationError', () => {
      const error = new QueueOperationError(
        'test-queue',
        'add',
        'Data too large'
      )

      expect(error).toBeInstanceOf(QueueError)
      expect(error.code).toBe(ErrorCode.QUEUE_OPERATION_ERROR)
      expect(error.message).toContain('add')
      expect(error.context.queueName).toBe('test-queue')
      expect(error.context.operation).toBe('add')
    })

    it('should create QueueNotFoundError', () => {
      const error = new QueueNotFoundError('missing-queue')

      expect(error).toBeInstanceOf(QueueOperationError)
      expect(error.code).toBe(ErrorCode.QUEUE_NOT_FOUND)
    })

    it('should create QueueAddError', () => {
      const error = new QueueAddError('test-queue', 'Validation failed', {
        key: 'value',
      })

      expect(error).toBeInstanceOf(QueueOperationError)
      expect(error.code).toBe(ErrorCode.QUEUE_ADD_ERROR)
      expect(error.context.data).toEqual({ key: 'value' })
    })

    it('should create QueueRemoveError', () => {
      const error = new QueueRemoveError('test-queue', 'job-123', 'Not found')

      expect(error).toBeInstanceOf(QueueOperationError)
      expect(error.code).toBe(ErrorCode.QUEUE_REMOVE_ERROR)
      expect(error.context.jobId).toBe('job-123')
    })

    it('should create QueuePauseError', () => {
      const error = new QueuePauseError('test-queue', 'Already paused')

      expect(error).toBeInstanceOf(QueueOperationError)
      expect(error.code).toBe(ErrorCode.QUEUE_PAUSE_ERROR)
    })

    it('should create QueueResumeError', () => {
      const error = new QueueResumeError('test-queue', 'Not paused')

      expect(error).toBeInstanceOf(QueueOperationError)
      expect(error.code).toBe(ErrorCode.QUEUE_RESUME_ERROR)
    })
  })

  describe('Redis Errors', () => {
    it('should create RedisError', () => {
      const error = new RedisError('Connection timeout')

      expect(error).toBeInstanceOf(QueueError)
      expect(error.code).toBe(ErrorCode.REDIS_OPERATION_ERROR)
      expect(error.message).toContain('Redis error')
    })

    it('should create RedisConnectionError', () => {
      const error = new RedisConnectionError('Connection refused', {
        host: 'localhost',
        port: 6379,
      })

      expect(error).toBeInstanceOf(RedisError)
      expect(error.code).toBe(ErrorCode.REDIS_CONNECTION_ERROR)
      expect(error.context.connectionConfig).toEqual({
        host: 'localhost',
        port: 6379,
      })
    })

    it('should create RedisHealthCheckError', () => {
      const error = new RedisHealthCheckError('Ping timeout')

      expect(error).toBeInstanceOf(RedisError)
      expect(error.code).toBe(ErrorCode.REDIS_HEALTH_CHECK_ERROR)
    })
  })

  describe('Flow Errors', () => {
    it('should create FlowError', () => {
      const error = new FlowError('test-flow', 'Flow failed')

      expect(error).toBeInstanceOf(QueueError)
      expect(error.code).toBe(ErrorCode.FLOW_ERROR)
      expect(error.context.flowName).toBe('test-flow')
    })

    it('should create FlowInvalidStructureError', () => {
      const error = new FlowInvalidStructureError(
        'test-flow',
        'Circular dependency detected'
      )

      expect(error).toBeInstanceOf(FlowError)
      expect(error.code).toBe(ErrorCode.FLOW_INVALID_STRUCTURE)
      expect(error.message).toContain('Circular dependency')
    })

    it('should create FlowExecutionError', () => {
      const error = new FlowExecutionError('test-flow', 'Child job failed')

      expect(error).toBeInstanceOf(FlowError)
      expect(error.code).toBe(ErrorCode.FLOW_EXECUTION_ERROR)
    })
  })

  describe('Registry Errors', () => {
    it('should create RegistryError', () => {
      const error = new RegistryError('Registry corrupted')

      expect(error).toBeInstanceOf(QueueError)
      expect(error.code).toBe(ErrorCode.REGISTRY_ERROR)
    })

    it('should create RegistryValidationError', () => {
      const error = new RegistryValidationError('Validation failed', [
        'Error 1',
        'Error 2',
      ])

      expect(error).toBeInstanceOf(RegistryError)
      expect(error.code).toBe(ErrorCode.REGISTRY_VALIDATION_ERROR)
      expect(error.context.errors).toEqual(['Error 1', 'Error 2'])
    })
  })

  describe('Error Utilities', () => {
    it('isQueueError should detect QueueError instances', () => {
      const queueError = new QueueError('Test')
      const regularError = new Error('Test')
      const jobError = new JobNotFoundError('test-job')

      expect(isQueueError(queueError)).toBe(true)
      expect(isQueueError(jobError)).toBe(true)
      expect(isQueueError(regularError)).toBe(false)
    })

    it('isOperationalError should check operational flag', () => {
      const operationalError = new QueueError(
        'Test',
        ErrorCode.UNKNOWN_ERROR,
        {},
        true
      )
      const nonOperationalError = new QueueError(
        'Test',
        ErrorCode.UNKNOWN_ERROR,
        {},
        false
      )
      const regularError = new Error('Test')

      expect(isOperationalError(operationalError)).toBe(true)
      expect(isOperationalError(nonOperationalError)).toBe(false)
      expect(isOperationalError(regularError)).toBe(false)
    })

    it('getErrorCode should extract error code', () => {
      const queueError = new QueueError('Test', ErrorCode.JOB_TIMEOUT)
      const jobError = new JobNotFoundError('test-job')
      const regularError = new Error('Test')

      expect(getErrorCode(queueError)).toBe(ErrorCode.JOB_TIMEOUT)
      expect(getErrorCode(jobError)).toBe(ErrorCode.JOB_NOT_FOUND)
      expect(getErrorCode(regularError)).toBe(ErrorCode.UNKNOWN_ERROR)
    })

    it('formatError should format QueueError', () => {
      const error = new QueueError('Test', ErrorCode.JOB_TIMEOUT, {
        jobId: '123',
      })
      const formatted = formatError(error)

      expect(formatted).toHaveProperty('name')
      expect(formatted).toHaveProperty('message')
      expect(formatted).toHaveProperty('code')
      expect(formatted).toHaveProperty('context')
      expect(formatted.context.jobId).toBe('123')
    })

    it('formatError should format regular Error', () => {
      const error = new Error('Regular error')
      const formatted = formatError(error)

      expect(formatted).toHaveProperty('name')
      expect(formatted).toHaveProperty('message')
      expect(formatted.message).toBe('Regular error')
    })
  })

  describe('Error Code Categories', () => {
    it('configuration errors should use 1xxx codes', () => {
      expect(ErrorCode.INVALID_CONFIGURATION).toContain('1000')
      expect(ErrorCode.INVALID_REDIS_CONFIG).toContain('1001')
      expect(ErrorCode.INVALID_WORKER_CONFIG).toContain('1002')
    })

    it('job errors should use 2xxx codes', () => {
      expect(ErrorCode.JOB_NOT_FOUND).toContain('2000')
      expect(ErrorCode.JOB_ALREADY_REGISTERED).toContain('2001')
      expect(ErrorCode.JOB_VALIDATION_ERROR).toContain('2002')
    })

    it('worker errors should use 3xxx codes', () => {
      expect(ErrorCode.WORKER_ERROR).toContain('3000')
      expect(ErrorCode.WORKER_NOT_FOUND).toContain('3001')
    })

    it('queue errors should use 4xxx codes', () => {
      expect(ErrorCode.QUEUE_OPERATION_ERROR).toContain('4000')
      expect(ErrorCode.QUEUE_NOT_FOUND).toContain('4001')
    })

    it('redis errors should use 5xxx codes', () => {
      expect(ErrorCode.REDIS_CONNECTION_ERROR).toContain('5000')
      expect(ErrorCode.REDIS_OPERATION_ERROR).toContain('5001')
    })

    it('flow errors should use 6xxx codes', () => {
      expect(ErrorCode.FLOW_ERROR).toContain('6000')
      expect(ErrorCode.FLOW_INVALID_STRUCTURE).toContain('6001')
    })

    it('registry errors should use 7xxx codes', () => {
      expect(ErrorCode.REGISTRY_ERROR).toContain('7000')
      expect(ErrorCode.REGISTRY_VALIDATION_ERROR).toContain('7001')
    })
  })
})
