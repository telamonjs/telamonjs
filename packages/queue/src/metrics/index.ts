/**
 * @telamonjs/queue/metrics
 *
 * Prometheus metrics collectors. prom-client is loaded when one of them is
 * constructed, never by importing an entry point.
 */

export { QueueMetrics } from '../monitoring/metrics.js'
export { OptimizedQueueMetrics } from '../monitoring/OptimizedQueueMetrics.js'
export type { MetricsConfig } from '../monitoring/OptimizedQueueMetrics.js'
