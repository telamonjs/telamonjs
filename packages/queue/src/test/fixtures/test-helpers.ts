/**
 * Test helper utilities
 */

import { Redis as IORedis } from 'ioredis'
import type { Job as BullJob } from 'bullmq'
import { QueueManager } from '../../core/QueueManager.js'
import type { QueueConfig, RedisConfig } from '../../core/types.js'
import type { ILogger, LogContext } from '@telamonjs/logger'
import { NoOpLogger } from '@telamonjs/logger'
import { closeRedis } from '../../utils/redis.js'
import { TEST_REDIS } from '../redis-availability.js'

/**
 * Create a test QueueManager with default config
 *
 * Uses NoOpLogger to avoid log pollution during tests
 */
export function createTestQueueManager(
  config?: Partial<QueueConfig>
): QueueManager {
  const defaultConfig: QueueConfig = {
    redis: {
      ...TEST_REDIS,
      maxRetriesPerRequest: null,
    },
    prefix: `test-${Date.now()}`, // Unique prefix per test
    logger: new NoOpLogger(),
    ...config,
  }

  return new QueueManager(defaultConfig)
}

/**
 * Wait for a condition to be true (polling)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return
    }
    await sleep(interval)
  }

  throw new Error(`Condition not met within ${timeout}ms`)
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Create test Redis config
 */
export function createTestRedisConfig(): RedisConfig {
  return {
    ...TEST_REDIS,
    db: parseInt(process.env.REDIS_TEST_DB || '15'), // Use DB 15 for tests
    maxRetriesPerRequest: null,
  }
}

/**
 * Create a raw ioredis connection for test setup/verification/cleanup
 * (direct key inspection, pub/sub assertions, etc - not going through
 * QueueManager). Attaches a permanent 'error' listener up front: without
 * one, a connection failure or a command rejecting when the socket closes
 * mid-flight becomes an unhandled rejection/exception instead of a no-op
 * (assertions on the connection's actual behavior, not this listener,
 * are what should fail the test).
 *
 * Pair with `closeRedis()` (from `utils/redis.js`) for teardown - it
 * tolerates a "Connection is closed" rejection from `quit()` instead of
 * letting it leak.
 */
export function createTestRawRedis(): IORedis {
  const redis = new IORedis(createTestRedisConfig())
  redis.on('error', () => {
    // ponytail: test-only raw handle: connection error assertions belong
    // in the test itself, not this listener - it exists only so ioredis
    // has somewhere to route the event instead of it going unhandled.
  })
  return redis
}

/**
 * Clean up all test queues in Redis
 * WARNING: Only use in test environment!
 */
export async function cleanupTestQueues(prefix: string): Promise<void> {
  const redis = createTestRawRedis()

  try {
    const keys = await redis.keys(`${prefix}:*`)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } finally {
    await closeRedis(redis)
  }
}

/**
 * Assert job was processed successfully
 */
export async function assertJobCompleted(
  queueManager: QueueManager,
  jobName: string,
  timeout: number = 5000
): Promise<void> {
  await waitFor(
    async () => {
      const stats = await queueManager.getStats()
      return stats[jobName]?.completed > 0
    },
    { timeout }
  )
}

/**
 * Assert job failed
 */
export async function assertJobFailed(
  queueManager: QueueManager,
  jobName: string,
  timeout: number = 5000
): Promise<void> {
  await waitFor(
    async () => {
      const stats = await queueManager.getStats()
      return stats[jobName]?.failed > 0
    },
    { timeout }
  )
}

/**
 * Get job from queue by ID
 */
export async function getJobById(
  queueManager: QueueManager,
  jobName: string,
  jobId: string
): Promise<BullJob<unknown, unknown> | undefined> {
  const queue = queueManager.getQueue(jobName)
  if (!queue) {
    throw new Error(`Queue '${jobName}' not found`)
  }

  const job = await queue.getRawQueue().getJob(jobId)
  return job
}

/**
 * Count jobs in a specific state
 */
export async function countJobsInState(
  queueManager: QueueManager,
  jobName: string,
  state: 'waiting' | 'active' | 'completed' | 'failed'
): Promise<number> {
  const stats = await queueManager.getStats()
  return stats[jobName]?.[state] || 0
}

/**
 * Create a mock logger for testing
 * Stores all log calls for assertions
 */
type MockLogger = ILogger & {
  logs: Array<{ level: string; message: string; meta?: LogContext }>
  clear: () => void
}

export function createMockLogger(): MockLogger {
  const logs: Array<{
    level: string
    message: string
    meta?: LogContext
  }> = []

  return {
    logs,
    clear: () => {
      logs.length = 0
    },
    debug: (message: string, meta?: LogContext) => {
      logs.push({ level: 'debug', message, meta })
    },
    info: (message: string, meta?: LogContext) => {
      logs.push({ level: 'info', message, meta })
    },
    warn: (message: string, meta?: LogContext) => {
      logs.push({ level: 'warn', message, meta })
    },
    error: (message: string, meta?: LogContext) => {
      logs.push({ level: 'error', message, meta })
    },
    fatal: (message: string, meta?: LogContext) => {
      logs.push({ level: 'fatal', message, meta })
    },
    success: (message: string, meta?: LogContext) => {
      logs.push({ level: 'success', message, meta })
    },
    audit: (action: string, meta?: LogContext) => {
      logs.push({ level: 'audit', message: action, meta })
    },
    perf: (label: string, durationMs: number, meta?: LogContext) => {
      logs.push({ level: 'perf', message: label, meta: { durationMs, ...meta } })
    },
    child() {
      return this
    },
    // ponytail: ILogger methods not exercised by the queue tests
    // (withRequestId/withUser/startTimer/setLevel/...) are left out — cast
  } as unknown as MockLogger
}
