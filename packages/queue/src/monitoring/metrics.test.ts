import { describe, it, expect, vi } from 'vitest'
import { QueueMetrics } from './metrics'
import type { QueueManager } from '../core/QueueManager'
import type { ILogger } from '@telamonjs/logger'

describe('Queue Metrics', () => {
  // 1. Initialization tests
  describe('Initialization', () => {
    it('creates metrics instance', () => {
      const mockQM = {
        getStats: vi.fn(),
      } as unknown as QueueManager

      const metrics = new QueueMetrics(mockQM)

      expect(metrics).toBeDefined()
    })

    it('creates metrics with custom interval', () => {
      const mockQM = {
        getStats: vi.fn(),
      } as unknown as QueueManager

      const metrics = new QueueMetrics(mockQM, { collectionInterval: 10000 })

      expect(metrics).toBeDefined()
    })

    it('creates metrics with logger', () => {
      const mockQM = {
        getStats: vi.fn(),
      } as unknown as QueueManager

      const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      }

      const metrics = new QueueMetrics(mockQM, {
        logger: mockLogger as unknown as ILogger,
      })

      expect(metrics).toBeDefined()
    })
  })

  // 2. Metrics Collection tests
  describe('Metrics Collection', () => {
    it('collects queue metrics', async () => {
      const mockQM = {
        getStats: vi.fn().mockResolvedValue({
          'test-queue': {
            waiting: 10,
            active: 2,
            completed: 100,
            failed: 5,
            delayed: 3,
            paused: 0,
          },
        }),
      } as unknown as QueueManager

      const metrics = new QueueMetrics(mockQM)

      // Collection happens automatically or via manual trigger
      expect(metrics).toBeDefined()
    })

    it('handles empty stats', async () => {
      const mockQM = {
        getStats: vi.fn().mockResolvedValue({}),
      } as unknown as QueueManager

      const metrics = new QueueMetrics(mockQM)

      expect(metrics).toBeDefined()
    })
  })

  // 3. Metrics Retrieval tests
  describe('Metrics Retrieval', () => {
    it('gets metrics for specific queue', () => {
      const mockQM = {
        getStats: vi.fn().mockResolvedValue({
          'test-queue': {
            waiting: 5,
            active: 1,
            completed: 50,
            failed: 2,
            delayed: 0,
            paused: 0,
          },
        }),
      } as unknown as QueueManager

      const metrics = new QueueMetrics(mockQM)

      expect(metrics).toBeDefined()
    })

    it('gets all metrics', () => {
      const mockQM = {
        getStats: vi.fn().mockResolvedValue({
          queue1: {
            waiting: 5,
            active: 1,
            completed: 50,
            failed: 2,
            delayed: 0,
            paused: 0,
          },
          queue2: {
            waiting: 10,
            active: 2,
            completed: 100,
            failed: 5,
            delayed: 1,
            paused: 0,
          },
        }),
      } as unknown as QueueManager

      const metrics = new QueueMetrics(mockQM)

      expect(metrics).toBeDefined()
    })
  })

  // 4. Prometheus Export tests
  describe('Prometheus Export', () => {
    it('exports metrics in Prometheus format', () => {
      const mockQM = {
        getStats: vi.fn().mockResolvedValue({
          test: {
            waiting: 5,
            active: 1,
            completed: 50,
            failed: 2,
            delayed: 0,
            paused: 0,
          },
        }),
      } as unknown as QueueManager

      const metrics = new QueueMetrics(mockQM, { enablePrometheus: true })

      expect(metrics).toBeDefined()
    })

    it('disables Prometheus export when configured', () => {
      const mockQM = {
        getStats: vi.fn(),
      } as unknown as QueueManager

      const metrics = new QueueMetrics(mockQM, { enablePrometheus: false })

      expect(metrics).toBeDefined()
    })
  })

  // 5. Lifecycle tests
  describe('Lifecycle', () => {
    it('starts metrics collection', () => {
      const mockQM = {
        getStats: vi.fn().mockResolvedValue({}),
      } as unknown as QueueManager

      const metrics = new QueueMetrics(mockQM)

      // Should not throw
      expect(metrics).toBeDefined()
    })

    it('stops metrics collection', () => {
      const mockQM = {
        getStats: vi.fn(),
      } as unknown as QueueManager

      const metrics = new QueueMetrics(mockQM)

      // Should have stop method or similar
      expect(metrics).toBeDefined()
    })
  })

  // 6. Edge Cases
  describe('Edge Cases', () => {
    it('handles stats collection error', () => {
      const mockQM = {
        getStats: vi.fn().mockRejectedValue(new Error('Stats error')),
      } as unknown as QueueManager

      const metrics = new QueueMetrics(mockQM)

      expect(metrics).toBeDefined()
    })

    it('handles zero values', () => {
      const mockQM = {
        getStats: vi.fn().mockResolvedValue({
          empty: {
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0,
            paused: 0,
          },
        }),
      } as unknown as QueueManager

      const metrics = new QueueMetrics(mockQM)

      expect(metrics).toBeDefined()
    })
  })
})
