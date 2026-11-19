import { describe, it, expect, vi } from 'vitest'
import type { Redis as IORedis } from 'ioredis'
import { getRedisConnectionMetrics } from './redisMetrics'

function fakeRedis(info: string): IORedis {
  return { info: vi.fn().mockResolvedValue(info) } as unknown as IORedis
}

const FULL_INFO = [
  '# Clients',
  'connected_clients:12',
  'cluster_connections:0',
  'maxclients:10000',
  'blocked_clients:0',
  '',
  '# Stats',
  'total_connections_received:4821',
  'total_commands_processed:99123',
  'rejected_connections:3',
  '',
].join('\r\n')

describe('getRedisConnectionMetrics', () => {
  it('parses connected_clients and max_clients from the clients section', async () => {
    const redis = fakeRedis(FULL_INFO)
    const metrics = await getRedisConnectionMetrics(redis)

    expect(metrics.connected_clients).toBe(12)
    expect(metrics.max_clients).toBe(10000)
  })

  it('parses rejected_connections and total_connections_received from the stats section', async () => {
    const redis = fakeRedis(FULL_INFO)
    const metrics = await getRedisConnectionMetrics(redis)

    expect(metrics.rejected_connections).toBe(3)
    expect(metrics.total_connections_received).toBe(4821)
  })

  it('computes utilization_percent as connected/max * 100', async () => {
    const redis = fakeRedis(FULL_INFO)
    const metrics = await getRedisConnectionMetrics(redis)

    expect(metrics.utilization_percent).toBeCloseTo(0.12, 5)
  })

  it('calls INFO with no section (needs both clients and stats)', async () => {
    const redis = fakeRedis(FULL_INFO)
    await getRedisConnectionMetrics(redis)

    expect(redis.info).toHaveBeenCalledWith()
  })

  it('includes an ISO timestamp', async () => {
    const redis = fakeRedis(FULL_INFO)
    const metrics = await getRedisConnectionMetrics(redis)

    expect(() => new Date(metrics.timestamp).toISOString()).not.toThrow()
    expect(metrics.timestamp).toBe(new Date(metrics.timestamp).toISOString())
  })

  it('reuses the connection: never calls quit/disconnect', async () => {
    const redis = {
      info: vi.fn().mockResolvedValue(FULL_INFO),
      quit: vi.fn(),
      disconnect: vi.fn(),
    } as unknown as IORedis & { quit: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }

    await getRedisConnectionMetrics(redis)

    expect(redis.quit).not.toHaveBeenCalled()
    expect(redis.disconnect).not.toHaveBeenCalled()
  })

  it('defaults missing fields to 0 instead of throwing', async () => {
    const redis = fakeRedis('# Clients\r\nconnected_clients:0\r\n')
    const metrics = await getRedisConnectionMetrics(redis)

    expect(metrics.rejected_connections).toBe(0)
    expect(metrics.total_connections_received).toBe(0)
    expect(metrics.max_clients).toBe(10000)
  })

  it('avoids division by zero when maxclients is 0', async () => {
    const redis = fakeRedis('# Clients\r\nconnected_clients:0\r\nmaxclients:0\r\n')
    const metrics = await getRedisConnectionMetrics(redis)

    expect(metrics.utilization_percent).toBe(0)
  })

  it('tolerates plain \\n line endings', async () => {
    const redis = fakeRedis(FULL_INFO.replace(/\r\n/g, '\n'))
    const metrics = await getRedisConnectionMetrics(redis)

    expect(metrics.connected_clients).toBe(12)
    expect(metrics.rejected_connections).toBe(3)
  })
})
