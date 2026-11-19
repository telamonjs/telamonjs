/**
 * @telamonjs/queue/monitoring
 *
 * Monitoring, metrics, and health checks
 */

export { QueueMetrics, createMetricsEndpoint } from './metrics.js'

export {
  OptimizedQueueMetrics,
  createOptimizedMetricsEndpoint,
} from './OptimizedQueueMetrics.js'

export type { MetricsConfig } from './OptimizedQueueMetrics.js'

export {
  performHealthCheck,
  createHealthEndpoint,
  createReadinessEndpoint,
  createLivenessEndpoint,
} from './health.js'

export { getRedisConnectionMetrics } from './redisMetrics.js'
export type { RedisConnectionMetrics } from './redisMetrics.js'
