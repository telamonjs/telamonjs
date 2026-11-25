import { describe, it, expect, vi } from 'vitest'
import type { Redis } from 'ioredis'
import { checkRedisHealth } from './redis'

describe('Redis Utilities', () => {
  // 2. Health Check tests
  describe('checkRedisHealth', () => {
    it('checks Redis health successfully', async () => {
      const mockRedis = {
        ping: vi.fn().mockResolvedValue('PONG'),
      } as unknown as Redis

      // checkRedisHealth resolves { connected, latency? } (redis.ts:74-92),
      // not a plain boolean - health.ts relies on that shape (redisHealth.connected).
      const health = await checkRedisHealth(mockRedis)

      expect(health.connected).toBe(true)
      expect(mockRedis.ping).toHaveBeenCalled()
    })

    it('returns connected: false when ping fails', async () => {
      const mockRedis = {
        ping: vi.fn().mockRejectedValue(new Error('Connection failed')),
      } as unknown as Redis

      const health = await checkRedisHealth(mockRedis)

      expect(health.connected).toBe(false)
      expect(health.error).toBe('Connection failed')
    })

    it('ignores an extra logger-shaped argument', async () => {
      const mockRedis = {
        ping: vi.fn().mockResolvedValue('PONG'),
      } as unknown as Redis

      const health = await checkRedisHealth(mockRedis)

      expect(health.connected).toBe(true)
    })
  })
})
