/**
 * Next.js API Routes Adapter
 *
 * Adapter for Next.js projects that implement the Queue routes locally.
 */

import type {
  QueueApiAdapter,
  QueueStatsResponse,
  RedisMetricsResponse,
  JobsResponse,
  JobsAllResponse,
  HistoryResponse,
  HistoryAllResponse,
  ClearHistoryResponse,
  ActionResponse,
  BulkOperationResponse,
  DispatchResponse,
  QueueActionParams,
  BulkOperationParams
} from '../types'
import type { JobState, DispatchableJob } from '../../types'

export interface NextJSAdapterConfig {
  /** Route prefix (default: '/api/queue') */
  routePrefix?: string

  /** Custom headers */
  headers?: Record<string, string>
}

/**
 * Creates an adapter for Next.js API Routes.
 *
 * Requires the following routes to be implemented in the project:
 * - GET  /api/queue/stats
 * - GET  /api/queue/redis-metrics
 * - GET  /api/queue/jobs
 * - GET  /api/queue/jobs/all (accepts `search`; may respond `approximate: true`
 *   when `total` is a post-filter count instead of exact)
 * - GET  /api/queue/history
 * - GET  /api/queue/history/all (accepts `startDate`/`endDate` ISO 8601 besides
 *   `search`; response may include `stats: { completed, failed }` — same
 *   filters as the listing — and `approximate: true` when `total` is not exact)
 * - POST /api/queue/actions (accepts `queueName: '*'` only with `action: 'clean'`;
 *   response may include `errors?: string[]` with per-queue failures — `success`
 *   is only `false` when all queues failed)
 * - POST /api/queue/jobs/retry
 * - POST /api/queue/jobs/remove
 * - POST /api/queue/jobs/promote
 * - POST /api/queue/jobs/bulk
 * - GET  /api/queue/dispatch
 * - POST /api/queue/dispatch
 *
 * This adapter exposes neither SSE nor the job config endpoints — use
 * {@link createNestJSAdapter} (via `QueueConfigApiAdapter`) when the backend
 * needs those features.
 *
 * @example
 * ```tsx
 * const adapter = createNextJSAdapter({
 *   routePrefix: '/api/queue'
 * })
 * ```
 */
export function createNextJSAdapter(
  config: NextJSAdapterConfig = {}
): QueueApiAdapter {
  const { routePrefix = '/api/queue', headers: customHeaders = {} } = config

  async function request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${routePrefix}${endpoint}`

    const res = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...customHeaders
      },
      ...options
    })

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error')
      throw new Error(`Queue API error: ${res.status} - ${errorText}`)
    }

    return res.json() as Promise<T>
  }

  return {
    // ============ STATS ============
    getStats: () => request<QueueStatsResponse>('/stats'),

    getRedisMetrics: () => request<RedisMetricsResponse>('/redis-metrics'),

    // ============ JOBS ============
    getJobs: (queueName: string, state: JobState, limit = 50) => {
      const params = new URLSearchParams({
        queueName,
        state,
        limit: limit.toString()
      })
      return request<JobsResponse>(`/jobs?${params}`)
    },

    getJobsAll: (params: URLSearchParams) =>
      request<JobsAllResponse>(`/jobs/all?${params}`),

    getHistory: (queueName: string, limit = 50) => {
      const params = new URLSearchParams({
        queueName,
        limit: limit.toString()
      })
      return request<HistoryResponse>(`/history?${params}`)
    },

    getHistoryAll: (params: URLSearchParams) =>
      request<HistoryAllResponse>(`/history/all?${params}`),

    clearHistory: (statuses: string) =>
      request<ClearHistoryResponse>('/history/clear', {
        method: 'POST',
        body: JSON.stringify({ statuses })
      }),

    // ============ ACTIONS ============
    performAction: (params: QueueActionParams) =>
      request<ActionResponse>('/actions', {
        method: 'POST',
        body: JSON.stringify(params)
      }),

    retryJob: (params) =>
      request<void>('/jobs/retry', {
        method: 'POST',
        body: JSON.stringify(params)
      }),

    removeJob: (params) =>
      request<void>('/jobs/remove', {
        method: 'POST',
        body: JSON.stringify(params)
      }),

    promoteJob: (params) =>
      request<void>('/jobs/promote', {
        method: 'POST',
        body: JSON.stringify(params)
      }),

    bulkOperation: (params: BulkOperationParams) =>
      request<BulkOperationResponse>('/jobs/bulk', {
        method: 'POST',
        body: JSON.stringify(params)
      }),

    // ============ DISPATCH ============
    getDispatchableJobs: () => request<DispatchableJob[]>('/dispatch'),

    dispatchJob: (params) =>
      request<DispatchResponse>('/dispatch', {
        method: 'POST',
        body: JSON.stringify(params)
      })
  }
}
