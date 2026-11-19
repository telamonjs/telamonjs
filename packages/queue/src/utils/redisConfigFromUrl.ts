import type { RedisConfig } from '../core/types.js'

/**
 * Parses a `REDIS_URL` (`redis://` or `rediss://`) into a `RedisConfig` for
 * `QueueManager`/`JobConfigStore`/`JobEventPublisher`/`QueueRegistry`/
 * `SchedulerReconciler`.
 *
 * Deletes the `new URL(process.env.REDIS_URL!)` parsing duplicated across
 * every entrypoint of the original consumer app (scheduler, worker, cleanup,
 * config/redis-adapter.ts).
 *
 * @param url - e.g. `'redis://user:pass@host:6379'` or `'rediss://host:6380'`
 *
 * @example
 * ```ts
 * const redis = redisConfigFromUrl(process.env.REDIS_URL!)
 * const queueManager = new QueueManager({ redis })
 * ```
 */
export function redisConfigFromUrl(url: string): RedisConfig {
  const parsed = new URL(url)

  const config: RedisConfig = {
    host: parsed.hostname,
    port: parsed.port ? parseInt(parsed.port, 10) : 6379,
  }

  if (parsed.username) config.username = decodeURIComponent(parsed.username)
  if (parsed.password) config.password = decodeURIComponent(parsed.password)
  if (parsed.protocol === 'rediss:') config.tls = {}

  return config
}
