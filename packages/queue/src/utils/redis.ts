import type { Redis } from 'ioredis'
import type { ILogger } from '@telamonjs/logger'
import { NoOpLogger } from '@telamonjs/logger'

/**
 * Check Redis health
 */
export async function checkRedisHealth(redis: Redis): Promise<{
  connected: boolean
  latency?: number
}> {
  try {
    const start = Date.now()
    await redis.ping()
    const latency = Date.now() - start

    return {
      connected: true,
      latency,
    }
  } catch {
    return {
      connected: false,
    }
  }
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedis(
  redis: Redis,
  logger?: ILogger
): Promise<void> {
  const log = logger || new NoOpLogger()
  try {
    await redis.quit()
    log.info('Redis connection closed gracefully')
  } catch (error) {
    log.error('Error closing Redis', {
      error: error instanceof Error ? error.message : String(error),
    })
    redis.disconnect()
  }
}
