import type { Redis as IORedis } from 'ioredis'

/**
 * Redis connection-pool metrics, shaped to match `RedisMetrics` in
 * `packages/ui/src/queue/types.ts` (the queue dashboard's Redis panel).
 */
export interface RedisConnectionMetrics {
  connected_clients: number
  max_clients: number
  utilization_percent: number
  rejected_connections: number
  total_connections_received: number
  timestamp: string
}

/**
 * Parse `INFO` command output (`key:value` lines, `#`-prefixed section
 * headers) into a flat map. Ported from a consumer-app admin-metrics
 * service's `parseRedisInfo`.
 */
function parseRedisInfo(info: string): Record<string, string> {
  const result: Record<string, string> = {}

  for (const line of info.split(/\r\n|\n/)) {
    if (!line.trim() || line.startsWith('#')) continue

    const separatorIndex = line.indexOf(':')
    if (separatorIndex === -1) continue

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()
    if (key) result[key] = value
  }

  return result
}

/**
 * Read Redis connection-pool metrics via `INFO`.
 *
 * Unlike the consumer-app version this was ported from — which opened a
 * temporary connection per call — this reuses the connection the caller
 * injects (a deliberate improvement: no per-call connect/quit overhead,
 * and it composes with a connection the caller already manages).
 *
 * `connected_clients`/`maxclients` come from the `clients` INFO section;
 * `rejected_connections`/`total_connections_received` come from the
 * `stats` section — calling `INFO` with no section returns both.
 */
export async function getRedisConnectionMetrics(
  redis: IORedis
): Promise<RedisConnectionMetrics> {
  const info = await redis.info()
  const parsed = parseRedisInfo(info)

  const connected_clients = parseInt(parsed.connected_clients ?? '0', 10)
  const max_clients = parseInt(parsed.maxclients ?? '10000', 10)
  const rejected_connections = parseInt(parsed.rejected_connections ?? '0', 10)
  const total_connections_received = parseInt(
    parsed.total_connections_received ?? '0',
    10
  )

  return {
    connected_clients,
    max_clients,
    utilization_percent:
      max_clients > 0 ? (connected_clients / max_clients) * 100 : 0,
    rejected_connections,
    total_connections_received,
    timestamp: new Date().toISOString(),
  }
}
