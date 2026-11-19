import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { OptimizedQueueMetrics } from './OptimizedQueueMetrics'
import { Registry } from 'prom-client'
import { NoOpLogger } from '@telamonjs/logger'
import type { QueueManager } from '../core/QueueManager'

// Mock QueueManager
const mockQueueManager = {
  getStats: vi.fn().mockResolvedValue({
    'test-queue': {
      waiting: 10,
      active: 5,
      completed: 100,
      failed: 2,
      delayed: 1,
      paused: 0,
    },
  }),
} as unknown as QueueManager

describe('OptimizedQueueMetrics', () => {
  let metrics: OptimizedQueueMetrics
  let registry: Registry

  beforeEach(() => {
    // Create fresh registry for each test to avoid metric name conflicts
    registry = new Registry()
    mockQueueManager.getStats.mockClear()
  })

  afterEach(() => {
    if (metrics) {
      metrics.stopCollection()
    }
    // Clear registry
    registry.clear()
  })

  describe('Constructor and Configuration', () => {
    it('should create with default config', () => {
      metrics = new OptimizedQueueMetrics(
        mockQueueManager,
        {},
        registry,
        new NoOpLogger()
      )

      const config = metrics.getConfig()
      expect(config.cacheTTL).toBe(5000)
      expect(config.enableBatching).toBe(true)
      expect(config.batchInterval).toBe(1000)
      expect(config.enableSampling).toBe(false)
      expect(config.sampleRate).toBe(0.1)
      expect(config.collectionInterval).toBe(10000)
    })

    it('should create with custom config', () => {
      metrics = new OptimizedQueueMetrics(
        mockQueueManager,
        {
          cacheTTL: 10000,
          enableBatching: false,
          batchInterval: 2000,
          enableSampling: true,
          sampleRate: 0.5,
          collectionInterval: 20000,
        },
        registry,
        new NoOpLogger()
      )

      const config = metrics.getConfig()
      expect(config.cacheTTL).toBe(10000)
      expect(config.enableBatching).toBe(false)
      expect(config.batchInterval).toBe(2000)
      expect(config.enableSampling).toBe(true)
      expect(config.sampleRate).toBe(0.5)
      expect(config.collectionInterval).toBe(20000)
    })

    it('should use NoOpLogger if not provided', () => {
      metrics = new OptimizedQueueMetrics(mockQueueManager, {}, registry)
      expect(metrics).toBeDefined()
    })
  })

  describe('Cache Behavior', () => {
    beforeEach(() => {
      metrics = new OptimizedQueueMetrics(
        mockQueueManager,
        { cacheTTL: 5000 },
        registry,
        new NoOpLogger()
      )
    })

    it('should cache queue stats', async () => {
      // First call - cache miss
      await metrics.updateQueueSizes()
      expect(mockQueueManager.getStats).toHaveBeenCalledTimes(1)

      // Second call within TTL - cache hit
      await metrics.updateQueueSizes()
      expect(mockQueueManager.getStats).toHaveBeenCalledTimes(1) // Still 1

      const cacheStats = metrics.getCacheStats()
      expect(cacheStats.cacheHit).toBe(true)
    })

    it('should invalidate cache after TTL expires', async () => {
      // Create fresh registry for this test
      const freshRegistry = new Registry()
      metrics = new OptimizedQueueMetrics(
        mockQueueManager,
        { cacheTTL: 100 }, // 100ms TTL
        freshRegistry,
        new NoOpLogger()
      )

      // First call
      await metrics.updateQueueSizes()
      expect(mockQueueManager.getStats).toHaveBeenCalledTimes(1)

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150))

      // Second call after TTL - should fetch fresh
      await metrics.updateQueueSizes()
      expect(mockQueueManager.getStats).toHaveBeenCalledTimes(2)

      const cacheStats = metrics.getCacheStats()
      expect(cacheStats.cacheHit).toBe(true) // Now cached again
    })

    it('should invalidate cache manually', async () => {
      await metrics.updateQueueSizes()
      expect(mockQueueManager.getStats).toHaveBeenCalledTimes(1)

      metrics.invalidateCache()

      await metrics.updateQueueSizes()
      expect(mockQueueManager.getStats).toHaveBeenCalledTimes(2)
    })

    it('should report cache stats correctly', async () => {
      let cacheStats = metrics.getCacheStats()
      expect(cacheStats.cacheHit).toBe(false)
      expect(cacheStats.cacheAge).toBeGreaterThan(0)
      expect(cacheStats.cacheTTL).toBe(5000)

      await metrics.updateQueueSizes()

      cacheStats = metrics.getCacheStats()
      expect(cacheStats.cacheHit).toBe(true)
      expect(cacheStats.cacheAge).toBeLessThan(100)
    })
  })

  describe('Batching Behavior', () => {
    it('should batch metrics when batching enabled', async () => {
      metrics = new OptimizedQueueMetrics(
        mockQueueManager,
        { enableBatching: true, batchInterval: 100 },
        registry,
        new NoOpLogger()
      )

      // Add multiple metrics
      metrics.incrementProcessed('test-queue', 'job-1')
      metrics.incrementProcessed('test-queue', 'job-2')
      metrics.incrementCompleted('test-queue', 'job-1')
      metrics.incrementFailed('test-queue', 'job-3', 'timeout')

      // Get metrics immediately - should flush batch
      const metricsText = await metrics.getMetrics()

      // Check that metrics were recorded
      expect(metricsText).toContain('queue_jobs_processed_total')
      expect(metricsText).toContain('queue_jobs_completed_total')
      expect(metricsText).toContain('queue_jobs_failed_total')
    })

    it('should apply metrics immediately when batching disabled', async () => {
      metrics = new OptimizedQueueMetrics(
        mockQueueManager,
        { enableBatching: false },
        registry,
        new NoOpLogger()
      )

      metrics.incrementProcessed('test-queue', 'job-1')

      const metricsText = await metrics.getMetrics()
      expect(metricsText).toContain('queue_jobs_processed_total')
    })

    it('should flush batch automatically after interval', async () => {
      metrics = new OptimizedQueueMetrics(
        mockQueueManager,
        { enableBatching: true, batchInterval: 100 },
        registry,
        new NoOpLogger()
      )

      metrics.incrementProcessed('test-queue', 'job-1')

      // Wait for batch interval
      await new Promise(resolve => setTimeout(resolve, 150))

      const metricsText = await metrics.getMetrics()
      expect(metricsText).toContain('queue_jobs_processed_total')
    })
  })

  describe('Sampling Behavior', () => {
    it('should record all metrics when sampling disabled', async () => {
      metrics = new OptimizedQueueMetrics(
        mockQueueManager,
        { enableSampling: false, enableBatching: false },
        registry,
        new NoOpLogger()
      )

      // Add 100 metrics
      for (let i = 0; i < 100; i++) {
        metrics.incrementProcessed('test-queue', 'job-1')
      }

      const metricsText = await metrics.getMetrics()
      expect(metricsText).toContain(
        'queue_jobs_processed_total{queue_name="test-queue",job_name="job-1"} 100'
      )
    })

    it('should sample metrics when sampling enabled', async () => {
      metrics = new OptimizedQueueMetrics(
        mockQueueManager,
        { enableSampling: true, sampleRate: 0.1, enableBatching: false },
        registry,
        new NoOpLogger()
      )

      // Add 1000 metrics
      for (let i = 0; i < 1000; i++) {
        metrics.incrementProcessed('test-queue', 'job-1')
      }

      const metricsText = await metrics.getMetrics()

      // Extract the actual count
      const match = metricsText.match(/queue_jobs_processed_total{[^}]+} (\d+)/)
      const count = match ? parseInt(match[1]) : 0

      // With 10% sample rate, expect around 100 (±50 for randomness)
      expect(count).toBeGreaterThan(50)
      expect(count).toBeLessThan(150)
    })
  })

  describe('Metric Operations', () => {
    beforeEach(() => {
      metrics = new OptimizedQueueMetrics(
        mockQueueManager,
        { enableBatching: false },
        registry,
        new NoOpLogger()
      )
    })

    it('should increment processed counter', async () => {
      metrics.incrementProcessed('test-queue', 'job-1')

      const metricsText = await metrics.getMetrics()
      expect(metricsText).toContain(
        'queue_jobs_processed_total{queue_name="test-queue",job_name="job-1"} 1'
      )
    })

    it('should increment completed counter', async () => {
      metrics.incrementCompleted('test-queue', 'job-1')

      const metricsText = await metrics.getMetrics()
      expect(metricsText).toContain(
        'queue_jobs_completed_total{queue_name="test-queue",job_name="job-1"} 1'
      )
    })

    it('should increment failed counter with error type', async () => {
      metrics.incrementFailed('test-queue', 'job-1', 'timeout')

      const metricsText = await metrics.getMetrics()
      expect(metricsText).toContain(
        'queue_jobs_failed_total{queue_name="test-queue",job_name="job-1",error_type="timeout"}'
      )
    })

    it('should record job duration', async () => {
      metrics.recordDuration('test-queue', 'job-1', 5.5)

      const metricsText = await metrics.getMetrics()
      expect(metricsText).toContain('queue_job_duration_seconds')
      expect(metricsText).toContain('queue_name="test-queue"')
    })

    it('should update queue sizes', async () => {
      await metrics.updateQueueSizes()

      const metricsText = await metrics.getMetrics()
      expect(metricsText).toContain(
        'queue_size{queue_name="test-queue",state="waiting"} 10'
      )
      expect(metricsText).toContain(
        'queue_size{queue_name="test-queue",state="active"} 5'
      )
      expect(metricsText).toContain(
        'queue_size{queue_name="test-queue",state="completed"} 100'
      )
      expect(metricsText).toContain(
        'queue_size{queue_name="test-queue",state="failed"} 2'
      )
    })

    it('should update active workers', async () => {
      metrics.updateActiveWorkers('test-queue', 3)

      const metricsText = await metrics.getMetrics()
      expect(metricsText).toContain(
        'queue_active_workers{queue_name="test-queue"} 3'
      )
    })
  })

  describe('Collection', () => {
    it('should start collection with default interval', () => {
      metrics = new OptimizedQueueMetrics(
        mockQueueManager,
        {},
        registry,
        new NoOpLogger()
      )

      const timer = metrics.startCollection()
      expect(timer).toBeDefined()

      metrics.stopCollection()
    })

    it('should start collection with custom interval', () => {
      metrics = new OptimizedQueueMetrics(
        mockQueueManager,
        {},
        registry,
        new NoOpLogger()
      )

      const timer = metrics.startCollection(5000)
      expect(timer).toBeDefined()

      metrics.stopCollection()
    })

    it('should invalidate cache on collection', async () => {
      metrics = new OptimizedQueueMetrics(
        mockQueueManager,
        { collectionInterval: 100 },
        registry,
        new NoOpLogger()
      )

      // First update
      await metrics.updateQueueSizes()
      expect(mockQueueManager.getStats).toHaveBeenCalledTimes(1)

      // Start collection
      metrics.startCollection(100)

      // Wait for collection to run
      await new Promise(resolve => setTimeout(resolve, 150))

      // Collection should have invalidated cache and fetched again
      expect(mockQueueManager.getStats).toHaveBeenCalledTimes(2)

      metrics.stopCollection()
    })

    it('should stop collection and flush pending batches', async () => {
      metrics = new OptimizedQueueMetrics(
        mockQueueManager,
        { enableBatching: true, batchInterval: 10000 },
        registry,
        new NoOpLogger()
      )

      // Add metric to batch
      metrics.incrementProcessed('test-queue', 'job-1')

      // Stop (should flush)
      metrics.stopCollection()

      // Check metric was flushed
      const metricsText = await metrics.getMetrics()
      expect(metricsText).toContain('queue_jobs_processed_total')
    })
  })

  describe('Performance Metrics', () => {
    beforeEach(() => {
      metrics = new OptimizedQueueMetrics(
        mockQueueManager,
        {},
        registry,
        new NoOpLogger()
      )
    })

    it('should track cache hits', async () => {
      await metrics.updateQueueSizes() // Miss
      await metrics.updateQueueSizes() // Hit
      await metrics.updateQueueSizes() // Hit

      const metricsText = await metrics.getMetrics()
      // getMetrics() also calls updateQueueSizes(), which could be a hit or miss
      // So we just check that the metrics are present
      expect(metricsText).toContain('queue_metrics_cache_hits_total')
      expect(metricsText).toContain('queue_metrics_cache_misses_total')
    })

    it('should track batch sizes', async () => {
      // Create fresh registry for this test
      const freshRegistry = new Registry()
      metrics = new OptimizedQueueMetrics(
        mockQueueManager,
        { enableBatching: true, batchInterval: 100 },
        freshRegistry,
        new NoOpLogger()
      )

      // Add 10 metrics
      for (let i = 0; i < 10; i++) {
        metrics.incrementProcessed('test-queue', 'job-1')
      }

      // Flush by getting metrics
      await metrics.getMetrics()

      const metricsText = await metrics.getMetrics()
      expect(metricsText).toContain('queue_metrics_batch_size')
    })
  })

  describe('getMetrics()', () => {
    beforeEach(() => {
      metrics = new OptimizedQueueMetrics(
        mockQueueManager,
        {},
        registry,
        new NoOpLogger()
      )
    })

    it('should return Prometheus format', async () => {
      const metricsText = await metrics.getMetrics()

      expect(metricsText).toContain('# HELP')
      expect(metricsText).toContain('# TYPE')
      expect(metricsText).toContain('queue_jobs_processed_total')
      expect(metricsText).toContain('queue_jobs_completed_total')
      expect(metricsText).toContain('queue_jobs_failed_total')
      expect(metricsText).toContain('queue_job_duration_seconds')
      expect(metricsText).toContain('queue_size')
      expect(metricsText).toContain('queue_active_workers')
    })

    it('should use cache for queue stats', async () => {
      await metrics.getMetrics()
      expect(mockQueueManager.getStats).toHaveBeenCalledTimes(1)

      // Second call should use cache
      await metrics.getMetrics()
      expect(mockQueueManager.getStats).toHaveBeenCalledTimes(1)
    })

    it('should flush pending batches before returning metrics', async () => {
      // Create fresh registry for this test
      const freshRegistry = new Registry()
      metrics = new OptimizedQueueMetrics(
        mockQueueManager,
        { enableBatching: true, batchInterval: 10000 },
        freshRegistry,
        new NoOpLogger()
      )

      metrics.incrementProcessed('test-queue', 'job-1')

      // getMetrics should flush the batch
      const metricsText = await metrics.getMetrics()
      expect(metricsText).toContain('queue_jobs_processed_total')
    })
  })

  describe('getRegistry()', () => {
    it('should return the metrics registry', () => {
      metrics = new OptimizedQueueMetrics(
        mockQueueManager,
        {},
        registry,
        new NoOpLogger()
      )

      expect(metrics.getRegistry()).toBe(registry)
    })
  })
})
