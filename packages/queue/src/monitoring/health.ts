import type { QueueManager } from '../core/QueueManager.js'
import { checkRedisHealth } from '../utils/redis.js'
import type { Redis } from 'ioredis'
import type { HealthCheckResult } from '../core/types.js'
import type { ILogger } from '@telamonjs/logger'
import type { Request, Response } from 'express'

/**
 * Perform health check on queue system
 *
 * @param queueManager - QueueManager instance
 * @param redis - Redis connection
 * @param logger - Logger instance
 * @returns Health check result
 */
export async function performHealthCheck(
  queueManager: QueueManager,
  redis: Redis,
  logger?: ILogger
): Promise<HealthCheckResult> {
  try {
    // Check Redis connectivity
    const redisHealth = await checkRedisHealth(redis)

    if (!redisHealth.connected) {
      return {
        status: 'unhealthy',
        redis: redisHealth,
        timestamp: new Date(),
      }
    }

    // Get queue stats
    const queueStats = await queueManager.getStats()

    // Count workers
    const workers = queueManager['workers']
    const runningWorkers = Array.from(workers.values()).filter(w =>
      w.isActive()
    ).length
    const pausedWorkers = workers.size - runningWorkers

    // Determine overall health status
    const hasFailedJobs = Object.values(queueStats).some(
      stats => stats.failed > 100
    )
    const hasLargeBacklog = Object.values(queueStats).some(
      stats => stats.waiting > 1000
    )

    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy'
    if (!redisHealth.connected || runningWorkers === 0) {
      status = 'unhealthy'
    } else if (hasFailedJobs || hasLargeBacklog) {
      status = 'degraded'
    }

    return {
      status,
      redis: redisHealth,
      workers: {
        running: runningWorkers,
        paused: pausedWorkers,
      },
      queues: queueStats,
      timestamp: new Date(),
    }
  } catch (error) {
    logger?.error('Health check error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return {
      status: 'unhealthy',
      redis: { connected: false },
      timestamp: new Date(),
    }
  }
}

/**
 * Create health check endpoint
 *
 * @example
 * ```ts
 * import express from 'express'
 * import { createHealthEndpoint } from '@telamonjs/queue/monitoring'
 *
 * const app = express()
 * app.get('/health', createHealthEndpoint(queueManager, redis, logger))
 * ```
 */
export function createHealthEndpoint(
  queueManager: QueueManager,
  redis: Redis,
  logger?: ILogger
) {
  return async (_req: Request, res: Response) => {
    try {
      const health = await performHealthCheck(queueManager, redis, logger)

      const statusCode =
        health.status === 'healthy'
          ? 200
          : health.status === 'degraded'
            ? 200
            : 503

      res.status(statusCode).json(health)
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      })
    }
  }
}

/**
 * Create readiness probe endpoint
 *
 * Returns 200 if system is ready to accept traffic
 * Returns 503 if not ready (Redis down, no workers, etc)
 */
export function createReadinessEndpoint(
  queueManager: QueueManager,
  redis: Redis
) {
  return async (_req: Request, res: Response) => {
    try {
      const redisHealth = await checkRedisHealth(redis)

      const workers = queueManager['workers']
      const hasActiveWorkers = Array.from(workers.values()).some(w =>
        w.isActive()
      )

      const isReady = redisHealth.connected && hasActiveWorkers

      if (isReady) {
        res.status(200).json({
          ready: true,
          redis: 'connected',
          workers: 'active',
          timestamp: new Date(),
        })
      } else {
        res.status(503).json({
          ready: false,
          redis: redisHealth.connected ? 'connected' : 'disconnected',
          workers: hasActiveWorkers ? 'active' : 'none',
          timestamp: new Date(),
        })
      }
    } catch (error) {
      res.status(503).json({
        ready: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      })
    }
  }
}

/**
 * Create liveness probe endpoint
 *
 * Returns 200 if process is alive
 * Returns 503 if process should be restarted
 */
export function createLivenessEndpoint() {
  return (_req: Request, res: Response) => {
    // Simple liveness check - if we can respond, we're alive
    res.status(200).json({
      alive: true,
      timestamp: new Date(),
    })
  }
}
