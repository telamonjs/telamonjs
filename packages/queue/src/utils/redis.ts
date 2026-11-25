import type { Redis } from 'ioredis'
import type { ILogger } from '@telamonjs/logger'
import { NoOpLogger } from '@telamonjs/logger'

/**
 * Check Redis health. On failure, `error` carries the ping error message.
 */
export async function checkRedisHealth(redis: Redis): Promise<{
  connected: boolean
  latency?: number
  error?: string
}> {
  try {
    const start = Date.now()
    await redis.ping()
    const latency = Date.now() - start

    return {
      connected: true,
      latency,
    }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : String(error),
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
