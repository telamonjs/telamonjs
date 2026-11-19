/**
 * Fast, non-retrying Redis reachability check for integration test suites.
 *
 * Several test files exercise real BullMQ + ioredis connections (DeadLetterQueue,
 * Queue, QueueManager, Worker). Without a reachable Redis, ioredis's default
 * retryStrategy backs off but never gives up, and BullMQ requires
 * maxRetriesPerRequest: null for blocking connections (QueueEvents/Worker) -
 * so any real command/connection attempt against an unreachable Redis hangs
 * forever instead of failing. CI has no Redis service, so these suites must
 * skip cleanly (not hang, not fail) when Redis isn't reachable.
 *
 * ponytail: one ping with a short timeout and no retries, not a full health
 * check. Good enough to gate describe.skipIf() in each integration file.
 */
import { Redis } from 'ioredis'
import type { RedisConfig } from '../core/types.js'
import { redisConfigFromUrl } from '../utils/redisConfigFromUrl.js'

/**
 * The single source of the test Redis connection: REDIS_URL (credentials and
 * rediss:// included), else REDIS_HOST/REDIS_PORT, else localhost:6379.
 * e.g. `REDIS_URL=redis://localhost:6381 pnpm test`
 */
export const TEST_REDIS: RedisConfig = process.env.REDIS_URL
  ? redisConfigFromUrl(process.env.REDIS_URL)
  : {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
    }

export async function isRedisAvailable(
  config: RedisConfig = TEST_REDIS
): Promise<boolean> {
  const redis = new Redis({
    ...config,
    lazyConnect: true,
    connectTimeout: 500,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // never reconnect
  })

  try {
    await redis.connect()
    await redis.ping()
    return true
  } catch {
    return false
  } finally {
    redis.disconnect()
  }
}
