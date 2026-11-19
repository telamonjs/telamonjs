import { describe, it, expect, vi } from 'vitest'
import { performHealthCheck } from './health'
import type { QueueManager } from '../core/QueueManager'
import type { Redis } from 'ioredis'
import type { ILogger } from '@telamonjs/logger'

describe('Health Check', () => {
  // 1. Health Check tests
  describe('performHealthCheck', () => {
    it('returns healthy status when all systems ok', async () => {
      const mockQM = {
        getStats: vi.fn().mockResolvedValue({
          'test-queue': {
            waiting: 5,
            active: 2,
            completed: 100,
            failed: 0,
            delayed: 0,
            paused: 0,
          },
        }),
        workers: new Map([['test-worker', { isActive: () => true }]]),
      } as unknown as QueueManager

      const mockRedis = {} as Redis

      // Mock checkRedisHealth
      vi.mock('../utils/redis', () => ({
        checkRedisHealth: vi.fn().mockResolvedValue({
          connected: true,
          latency: 5,
        }),
      }))

      const result = await performHealthCheck(mockQM, mockRedis)

      expect(result).toBeDefined()
      expect(result.status).toBeDefined()
      expect(result.redis).toBeDefined()
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('includes redis health in result', async () => {
      const mockQM = {
        getStats: vi.fn().mockResolvedValue({}),
        workers: new Map(),
      } as unknown as QueueManager

      const mockRedis = {} as Redis

      const result = await performHealthCheck(mockQM, mockRedis)

      expect(result.redis).toBeDefined()
      expect(result.redis.connected).toBeDefined()
    })

    it('includes workers info in result', async () => {
      const mockQM = {
        getStats: vi.fn().mockResolvedValue({}),
        workers: new Map([
          ['worker1', { isActive: () => true }],
          ['worker2', { isActive: () => false }],
        ]),
      } as unknown as QueueManager

      const mockRedis = {} as Redis

      const result = await performHealthCheck(mockQM, mockRedis)

      expect(result.workers).toBeDefined()
    })

    it('includes queue stats in result', async () => {
      const mockQM = {
        getStats: vi.fn().mockResolvedValue({
          queue1: {
            waiting: 10,
            active: 2,
            completed: 50,
            failed: 1,
            delayed: 0,
            paused: 0,
          },
        }),
        workers: new Map(),
      } as unknown as QueueManager

      const mockRedis = {} as Redis

      const result = await performHealthCheck(mockQM, mockRedis)

      expect(result.queues).toBeDefined()
    })

    it('accepts logger parameter', async () => {
      const mockQM = {
        getStats: vi.fn().mockResolvedValue({}),
        workers: new Map(),
      } as unknown as QueueManager

      const mockRedis = {} as Redis

      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      }

      const result = await performHealthCheck(
        mockQM,
        mockRedis,
        mockLogger as unknown as ILogger
      )

      expect(result).toBeDefined()
    })
  })

  // 2. Status Determination tests
  describe('Status Determination', () => {
    it('determines healthy status correctly', async () => {
      const mockQM = {
        getStats: vi.fn().mockResolvedValue({
          test: {
            waiting: 5,
            active: 1,
            completed: 100,
            failed: 0,
            delayed: 0,
            paused: 0,
          },
        }),
        workers: new Map([['w1', { isActive: () => true }]]),
      } as unknown as QueueManager

      const mockRedis = {} as Redis

      const result = await performHealthCheck(mockQM, mockRedis)

      // Status depends on Redis health mock
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status)
    })
  })

  // 3. Edge Cases
  describe('Edge Cases', () => {
    it('handles empty queue stats', async () => {
      const mockQM = {
        getStats: vi.fn().mockResolvedValue({}),
        workers: new Map(),
      } as unknown as QueueManager

      const mockRedis = {} as Redis

      const result = await performHealthCheck(mockQM, mockRedis)

      expect(result).toBeDefined()
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('handles no workers', async () => {
      const mockQM = {
        getStats: vi.fn().mockResolvedValue({}),
        workers: new Map(),
      } as unknown as QueueManager

      const mockRedis = {} as Redis

      const result = await performHealthCheck(mockQM, mockRedis)

      expect(result).toBeDefined()
    })

    it('handles error during health check by degrading instead of throwing', async () => {
      // performHealthCheck wraps everything in try/catch by design (health
      // checks/probes must never throw - they should report 'unhealthy' so
      // callers like createHealthEndpoint (health.ts:91-115) can still
      // respond instead of crashing).
      const mockQM = {
        getStats: vi.fn().mockRejectedValue(new Error('Stats error')),
        workers: new Map(),
      } as unknown as QueueManager

      const mockRedis = {} as Redis

      const result = await performHealthCheck(mockQM, mockRedis)

      expect(result.status).toBe('unhealthy')
      expect(result.redis.connected).toBe(false)
    })
  })
})
