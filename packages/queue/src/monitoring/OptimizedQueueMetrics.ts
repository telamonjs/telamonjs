import type { Registry, Counter, Gauge, Histogram } from 'prom-client'
import { promClient } from './promClient.js'
import type { QueueManager } from '../core/QueueManager.js'
import type { ILogger } from '@telamonjs/logger'
import { NoOpLogger } from '@telamonjs/logger'
import type { QueueStats } from '../core/types.js'
import type { Request, Response } from 'express'

/**
 * Metrics Configuration
 */
export interface MetricsConfig {
  /**
   * Cache TTL for queue stats in milliseconds
   * @default 5000
   */
  cacheTTL?: number

  /**
   * Enable metrics batching
   * @default true
   */
  enableBatching?: boolean

  /**
   * Batch flush interval in milliseconds
   * @default 1000
   */
  batchInterval?: number

  /**
   * Enable sampling (reduces overhead)
   * @default false
   */
  enableSampling?: boolean

  /**
   * Sample rate (0.0 - 1.0)
   * Only used when enableSampling is true
   * @default 0.1 (10%)
   */
  sampleRate?: number

  /**
   * Collection interval for background updates
   * @default 10000
   */
  collectionInterval?: number
}

/**
 * Batched metric update
 */
interface MetricBatch {
  type: 'processed' | 'completed' | 'failed' | 'duration'
  queueName: string
  jobName: string
  value?: number
  errorType?: string
}

/**
 * Optimized Prometheus metrics collector for queue system
 *
 * Features:
 * - Cache layer for queue stats (reduces Redis calls)
 * - Metrics batching (reduces prom-client overhead)
 * - Sampling support (reduces overhead for high-throughput)
 * - Lazy updates (only when needed)
 */
export class OptimizedQueueMetrics {
  private registry: Registry
  private queueManager: QueueManager
  private logger: ILogger
  private config: Required<MetricsConfig>

  // Cache
  private statsCache: Record<string, QueueStats> | null = null
  private lastCacheUpdate: number = 0

  // Batching
  private metricsBatch: MetricBatch[] = []
  private batchTimer: NodeJS.Timeout | null = null

  // Collection
  private collectionTimer: NodeJS.Timeout | null = null

  // Metrics
  private jobsProcessed: Counter
  private jobsCompleted: Counter
  private jobsFailed: Counter
  private jobDuration: Histogram
  private queueSize: Gauge
  private activeWorkers: Gauge

  // Performance metrics
  private cacheHits: Counter
  private cacheMisses: Counter
  private batchSize: Histogram

  constructor(
    queueManager: QueueManager,
    config: MetricsConfig = {},
    registry?: Registry,
    logger?: ILogger
  ) {
    const { Registry, Counter, Gauge, Histogram } = promClient()
    this.queueManager = queueManager
    this.registry = registry || new Registry()
    this.logger = logger || new NoOpLogger()

    // Set default config
    this.config = {
      cacheTTL: config.cacheTTL ?? 5000,
      enableBatching: config.enableBatching ?? true,
      batchInterval: config.batchInterval ?? 1000,
      enableSampling: config.enableSampling ?? false,
      sampleRate: config.sampleRate ?? 0.1,
      collectionInterval: config.collectionInterval ?? 10000,
    }

    // Initialize job metrics
    this.jobsProcessed = new Counter({
      name: 'queue_jobs_processed_total',
      help: 'Total number of jobs processed',
      labelNames: ['queue_name', 'job_name'],
      registers: [this.registry],
    })

    this.jobsCompleted = new Counter({
      name: 'queue_jobs_completed_total',
      help: 'Total number of jobs completed successfully',
      labelNames: ['queue_name', 'job_name'],
      registers: [this.registry],
    })

    this.jobsFailed = new Counter({
      name: 'queue_jobs_failed_total',
      help: 'Total number of jobs failed',
      labelNames: ['queue_name', 'job_name', 'error_type'],
      registers: [this.registry],
    })

    this.jobDuration = new Histogram({
      name: 'queue_job_duration_seconds',
      help: 'Job processing duration in seconds',
      labelNames: ['queue_name', 'job_name'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
      registers: [this.registry],
    })

    this.queueSize = new Gauge({
      name: 'queue_size',
      help: 'Current size of queue by state',
      labelNames: ['queue_name', 'state'],
      registers: [this.registry],
    })

    this.activeWorkers = new Gauge({
      name: 'queue_active_workers',
      help: 'Number of active workers',
      labelNames: ['queue_name'],
      registers: [this.registry],
    })

    // Performance metrics
    this.cacheHits = new Counter({
      name: 'queue_metrics_cache_hits_total',
      help: 'Total cache hits for queue stats',
      registers: [this.registry],
    })

    this.cacheMisses = new Counter({
      name: 'queue_metrics_cache_misses_total',
      help: 'Total cache misses for queue stats',
      registers: [this.registry],
    })

    this.batchSize = new Histogram({
      name: 'queue_metrics_batch_size',
      help: 'Size of metrics batches',
      buckets: [1, 5, 10, 25, 50, 100, 250, 500],
      registers: [this.registry],
    })

    this.logger.info('Optimized Prometheus metrics initialized', {
      cacheTTL: this.config.cacheTTL,
      enableBatching: this.config.enableBatching,
      batchInterval: this.config.batchInterval,
      enableSampling: this.config.enableSampling,
      sampleRate: this.config.sampleRate,
    })
  }

  /**
   * Check if we should sample this metric
   */
  private shouldSample(): boolean {
    if (!this.config.enableSampling) {
      return true
    }
    return Math.random() < this.config.sampleRate
  }

  /**
   * Add metric to batch
   */
  private addToBatch(metric: MetricBatch): void {
    if (!this.config.enableBatching) {
      // Apply immediately
      this.applyMetric(metric)
      return
    }

    this.metricsBatch.push(metric)

    // Start batch timer if not running
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushBatch()
      }, this.config.batchInterval)
    }
  }

  /**
   * Apply a single metric
   */
  private applyMetric(metric: MetricBatch): void {
    switch (metric.type) {
      case 'processed':
        this.jobsProcessed.inc({
          queue_name: metric.queueName,
          job_name: metric.jobName,
        })
        break
      case 'completed':
        this.jobsCompleted.inc({
          queue_name: metric.queueName,
          job_name: metric.jobName,
        })
        break
      case 'failed':
        this.jobsFailed.inc({
          queue_name: metric.queueName,
          job_name: metric.jobName,
          error_type: metric.errorType || 'unknown',
        })
        break
      case 'duration':
        if (metric.value !== undefined) {
          this.jobDuration.observe(
            { queue_name: metric.queueName, job_name: metric.jobName },
            metric.value
          )
        }
        break
    }
  }

  /**
   * Flush batched metrics
   */
  private flushBatch(): void {
    if (this.metricsBatch.length === 0) {
      return
    }

    // Record batch size
    this.batchSize.observe(this.metricsBatch.length)

    // Apply all batched metrics
    for (const metric of this.metricsBatch) {
      this.applyMetric(metric)
    }

    this.logger.debug('Flushed metrics batch', {
      size: this.metricsBatch.length,
    })

    // Clear batch
    this.metricsBatch = []
    this.batchTimer = null
  }

  /**
   * Increment jobs processed counter
   */
  incrementProcessed(queueName: string, jobName: string): void {
    if (!this.shouldSample()) return

    this.addToBatch({
      type: 'processed',
      queueName,
      jobName,
    })
  }

  /**
   * Increment jobs completed counter
   */
  incrementCompleted(queueName: string, jobName: string): void {
    if (!this.shouldSample()) return

    this.addToBatch({
      type: 'completed',
      queueName,
      jobName,
    })
  }

  /**
   * Increment jobs failed counter
   */
  incrementFailed(
    queueName: string,
    jobName: string,
    errorType: string = 'unknown'
  ): void {
    if (!this.shouldSample()) return

    this.addToBatch({
      type: 'failed',
      queueName,
      jobName,
      errorType,
    })
  }

  /**
   * Record job duration
   */
  recordDuration(
    queueName: string,
    jobName: string,
    durationSeconds: number
  ): void {
    if (!this.shouldSample()) return

    this.addToBatch({
      type: 'duration',
      queueName,
      jobName,
      value: durationSeconds,
    })
  }

  /**
   * Get cached queue stats or fetch from QueueManager
   */
  private async getQueueStats(): Promise<Record<string, QueueStats>> {
    const now = Date.now()
    const cacheAge = now - this.lastCacheUpdate

    // Return cached if still valid
    if (this.statsCache && cacheAge < this.config.cacheTTL) {
      this.cacheHits.inc()
      return this.statsCache
    }

    // Cache miss - fetch fresh stats
    this.cacheMisses.inc()

    const stats = await this.queueManager.getStats()
    this.statsCache = stats
    this.lastCacheUpdate = now

    this.logger.debug('Queue stats cache updated', {
      cacheAge,
      queues: Object.keys(stats).length,
    })

    return stats
  }

  /**
   * Update queue size metrics
   */
  async updateQueueSizes(): Promise<void> {
    const stats = await this.getQueueStats()

    for (const [queueName, queueStats] of Object.entries(stats)) {
      this.queueSize.set(
        { queue_name: queueName, state: 'waiting' },
        queueStats.waiting
      )
      this.queueSize.set(
        { queue_name: queueName, state: 'active' },
        queueStats.active
      )
      this.queueSize.set(
        { queue_name: queueName, state: 'completed' },
        queueStats.completed
      )
      this.queueSize.set(
        { queue_name: queueName, state: 'failed' },
        queueStats.failed
      )
      this.queueSize.set(
        { queue_name: queueName, state: 'delayed' },
        queueStats.delayed
      )
      this.queueSize.set(
        { queue_name: queueName, state: 'paused' },
        queueStats.paused
      )
    }
  }

  /**
   * Update active workers count
   */
  updateActiveWorkers(queueName: string, count: number): void {
    this.activeWorkers.set({ queue_name: queueName }, count)
  }

  /**
   * Invalidate cache (force refresh on next getMetrics)
   */
  invalidateCache(): void {
    this.statsCache = null
    this.lastCacheUpdate = 0
    this.logger.debug('Metrics cache invalidated')
  }

  /**
   * Get metrics in Prometheus format
   *
   * Uses cached queue stats if available
   */
  async getMetrics(): Promise<string> {
    // Flush any pending batched metrics
    if (this.metricsBatch.length > 0) {
      this.flushBatch()
    }

    // Update queue sizes (uses cache)
    await this.updateQueueSizes()

    return await this.registry.metrics()
  }

  /**
   * Get metrics registry
   */
  getRegistry(): Registry {
    return this.registry
  }

  /**
   * Get current cache stats
   */
  getCacheStats(): {
    cacheHit: boolean
    cacheAge: number
    cacheTTL: number
  } {
    const now = Date.now()
    const cacheAge = now - this.lastCacheUpdate

    return {
      cacheHit: this.statsCache !== null && cacheAge < this.config.cacheTTL,
      cacheAge,
      cacheTTL: this.config.cacheTTL,
    }
  }

  /**
   * Start metrics collection interval
   *
   * @param intervalMs - Collection interval in milliseconds (uses config.collectionInterval if not provided)
   */
  startCollection(intervalMs?: number): NodeJS.Timeout {
    const interval = intervalMs ?? this.config.collectionInterval

    this.collectionTimer = setInterval(async () => {
      try {
        // Invalidate cache to force fresh fetch
        this.invalidateCache()
        await this.updateQueueSizes()
      } catch (error) {
        this.logger.error('Error collecting metrics', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }, interval)

    this.logger.info('Metrics collection started', { intervalMs: interval })
    return this.collectionTimer
  }

  /**
   * Stop metrics collection
   */
  stopCollection(): void {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer)
      this.collectionTimer = null
      this.logger.info('Metrics collection stopped')
    }

    // Flush any pending batches
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.flushBatch()
    }
  }

  /**
   * Get configuration
   */
  getConfig(): Required<MetricsConfig> {
    return { ...this.config }
  }
}

/**
 * Create optimized metrics endpoint for Prometheus scraping
 *
 * @example
 * ```ts
 * import express from 'express'
 * import { createOptimizedMetricsEndpoint } from '@telamonjs/queue/monitoring'
 *
 * const app = express()
 * app.get('/metrics', createOptimizedMetricsEndpoint(queueMetrics))
 * ```
 */
export function createOptimizedMetricsEndpoint(metrics: OptimizedQueueMetrics) {
  return async (_req: Request, res: Response) => {
    try {
      res.set('Content-Type', metrics.getRegistry().contentType)
      const metricsData = await metrics.getMetrics()
      res.end(metricsData)
    } catch (error) {
      res.status(500).end(error)
    }
  }
}
