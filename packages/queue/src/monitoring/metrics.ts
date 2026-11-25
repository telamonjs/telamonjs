import type { Registry, Counter, Gauge, Histogram } from 'prom-client'
import { promClient } from './promClient.js'
import type { QueueManager } from '../core/QueueManager.js'
import type { ILogger } from '@telamonjs/logger'
import { NoOpLogger } from '@telamonjs/logger'
import type { Request, Response } from 'express'

/**
 * Prometheus metrics collector for queue system
 */
export class QueueMetrics {
  private registry: Registry
  private queueManager: QueueManager
  private logger: ILogger

  // Metrics
  private jobsProcessed: Counter
  private jobsCompleted: Counter
  private jobsFailed: Counter
  private jobDuration: Histogram
  private queueSize: Gauge
  private activeWorkers: Gauge

  private enablePrometheus: boolean
  private defaultCollectionIntervalMs: number

  constructor(
    queueManager: QueueManager,
    options: {
      registry?: Registry
      logger?: ILogger
      collectionInterval?: number
      enablePrometheus?: boolean
    } = {}
  ) {
    const { Registry, Counter, Gauge, Histogram } = promClient()
    this.queueManager = queueManager
    this.registry = options.registry || new Registry()
    this.logger = options.logger || new NoOpLogger()
    this.enablePrometheus = options.enablePrometheus !== false
    this.defaultCollectionIntervalMs = options.collectionInterval ?? 10000

    // Initialize metrics
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

    this.logger.info('Prometheus metrics initialized')
  }

  /**
   * Increment jobs processed counter
   */
  incrementProcessed(queueName: string, jobName: string): void {
    this.jobsProcessed.inc({ queue_name: queueName, job_name: jobName })
  }

  /**
   * Increment jobs completed counter
   */
  incrementCompleted(queueName: string, jobName: string): void {
    this.jobsCompleted.inc({ queue_name: queueName, job_name: jobName })
  }

  /**
   * Increment jobs failed counter
   */
  incrementFailed(
    queueName: string,
    jobName: string,
    errorType: string = 'unknown'
  ): void {
    this.jobsFailed.inc({
      queue_name: queueName,
      job_name: jobName,
      error_type: errorType,
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
    this.jobDuration.observe(
      { queue_name: queueName, job_name: jobName },
      durationSeconds
    )
  }

  /**
   * Update queue size metrics
   */
  async updateQueueSizes(): Promise<void> {
    const stats = await this.queueManager.getStats()

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
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    if (!this.enablePrometheus) {
      return ''
    }
    // Update queue sizes before returning metrics
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
   * Start metrics collection interval
   *
   * @param intervalMs - Collection interval in milliseconds (default: 10000)
   */
  startCollection(
    intervalMs: number = this.defaultCollectionIntervalMs
  ): NodeJS.Timeout {
    const interval = setInterval(async () => {
      try {
        await this.updateQueueSizes()
      } catch (error) {
        this.logger.error('Error collecting metrics', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }, intervalMs)

    this.logger.info('Metrics collection started', { intervalMs })
    return interval
  }

  /**
   * Stop metrics collection
   */
  stopCollection(interval: NodeJS.Timeout): void {
    clearInterval(interval)
    this.logger.info('Metrics collection stopped')
  }
}

/**
 * Create metrics endpoint for Prometheus scraping
 *
 * @example
 * ```ts
 * import express from 'express'
 * import { createMetricsEndpoint } from '@telamonjs/queue/monitoring'
 *
 * const app = express()
 * app.get('/metrics', createMetricsEndpoint(queueMetrics))
 * ```
 */
export function createMetricsEndpoint(metrics: QueueMetrics) {
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
