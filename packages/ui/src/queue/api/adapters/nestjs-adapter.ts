/**
 * NestJS API Adapter
 *
 * Adapter for separate NestJS backends.
 * Supports authentication via Bearer token and cookies.
 */

import type {
  QueueConfigApiAdapter,
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
  BulkOperationParams,
} from '../types'
import type {
  JobState,
  DispatchableJob,
  JobConfig,
  JobConfigWithUser,
  JobConfigUpdateInput,
  JobHistoryEntry,
  SSEConfig,
  QueueHealthResponse,
  FailureGroupsResponse,
} from '../../types'

/** How long a resolved auth token is reused before asking again. */
const TOKEN_TTL_MS = 60_000

export interface NestJSAdapterConfig {
  /**
   * API origin, WITHOUT `/v1` (e.g. https://api.example.com) — every endpoint
   * is already prefixed with `/v1`.
   */
  baseUrl: string

  /** Function to obtain the authentication token */
  getAuthToken?: () => Promise<string | null>

  /** Custom headers */
  headers?: Record<string, string>

  /**
   * Custom response parser. Use when the API wraps responses (e.g. SuperJSON).
   * Default: `res.json()`
   *
   * @example
   * ```ts
   * import superjson from 'superjson'
   * parseResponse: async (res) => {
   *   const text = await res.text()
   *   return superjson.parse(text)
   * }
   * ```
   */
  parseResponse?: (res: Response) => Promise<unknown>

  /**
   * Enables `getHealth`/`getFailureGroups` (`GET /v1/queue/health` and
   * `GET /v1/queue/failures`). Turn it on only when the backend serves those
   * routes — `QueueHttpModule` from `@telamonjs/queue` >= 3.3.0 does;
   * hand-written controllers usually don't. Off, the dashboard behaves as in 7.2
   * (no health columns, clicking the failed count opens the jobs list).
   * @default false
   */
  health?: boolean
}

/**
 * Creates an adapter for a NestJS API.
 *
 * @example
 * ```tsx
 * const adapter = createNestJSAdapter({
 *   baseUrl: 'https://api.example.com',
 *   getAuthToken: async () => {
 *     const session = await getSession()
 *     return session?.user?.accessToken ?? null
 *   }
 * })
 * ```
 */
export function createNestJSAdapter(
  config: NestJSAdapterConfig
): QueueConfigApiAdapter {
  const {
    baseUrl,
    getAuthToken,
    headers: customHeaders = {},
    parseResponse,
    health = false,
  } = config

  // Token cache: getAuthToken is typically next-auth's getSession(), which
  // costs an /api/auth/session round-trip; the dashboard polls every ~2s.
  // Cache the in-flight promise for a short TTL; invalidated on 401.
  let tokenCache: { promise: Promise<string | null>; at: number } | null = null
  const getToken = (): Promise<string | null> => {
    if (!getAuthToken) return Promise.resolve(null)
    if (tokenCache && Date.now() - tokenCache.at < TOKEN_TTL_MS) {
      return tokenCache.promise
    }
    const entry = { promise: getAuthToken(), at: Date.now() }
    tokenCache = entry
    // Never keep failures or empty tokens (e.g. user logs in later).
    entry.promise
      .then(t => {
        if (!t && tokenCache === entry) tokenCache = null
      })
      .catch(() => {
        if (tokenCache === entry) tokenCache = null
      })
    return entry.promise
  }

  async function request<T>(
    endpoint: string,
    options?: RequestInit,
    retried = false
  ): Promise<T> {
    const url = `${baseUrl}${endpoint}`

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    }

    // Add token if available
    const token = await getToken()
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(url, {
      credentials: 'include',
      ...options,
      headers: {
        ...requestHeaders,
        ...(options?.headers as Record<string, string>),
      },
    })

    if (res.status === 401 && getAuthToken && !retried) {
      // Stale cached token: drop it and retry once with a fresh session.
      tokenCache = null
      return request<T>(endpoint, options, true)
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error')
      throw new Error(
        `Queue API error: ${res.status} ${res.statusText} - ${errorText}`
      )
    }

    if (parseResponse) {
      return parseResponse(res) as Promise<T>
    }
    return res.json() as Promise<T>
  }

  return {
    // ============ STATS ============
    getStats: () => request<QueueStatsResponse>('/v1/queue/stats'),

    getRedisMetrics: () =>
      request<RedisMetricsResponse>('/v1/admin/metrics/redis'),

    // ============ JOBS ============
    getJobs: (queueName: string, state: JobState, limit = 50) => {
      const params = new URLSearchParams({
        queueName,
        state,
        limit: limit.toString(),
      })
      return request<JobsResponse>(`/v1/queue/jobs?${params}`)
    },

    /**
     * @param params Response includes `approximate: true` when `total` is
     * a post-filter count (active search), not exact.
     */
    getJobsAll: (params: URLSearchParams) =>
      request<JobsAllResponse>(`/v1/queue/jobs/all?${params}`),

    getHistory: (queueName: string, limit = 50) => {
      const params = new URLSearchParams({
        queueName,
        limit: limit.toString(),
      })
      return request<HistoryResponse>(`/v1/queue/history?${params}`)
    },

    /**
     * @param params Accepts `startDate`/`endDate` (ISO 8601) — the reference
     * backend validates and responds 400 when the string is not parseable.
     * The response includes `stats` (completed/failed, filtered by the same
     * criteria as the listing) and `approximate: true` when `total` is a
     * post-filter count (search/date), not exact.
     */
    getHistoryAll: (params: URLSearchParams) =>
      request<HistoryAllResponse>(`/v1/queue/history/all?${params}`),

    /**
     * Clears completed + failed across all queues (`queueName: '*'`).
     * A single status in `statuses` clears only that state; two (or any
     * combination != 1) omits `status` from the body — the backend clears
     * completed + failed. Forwards `success`/`removed`/`byQueue`/`errors` from
     * the backend response (`errors` lists queues that failed to clear,
     * `success: false` only when all of them failed).
     */
    clearHistory: async (statuses: string): Promise<ClearHistoryResponse> => {
      const statusList = statuses.split(',').map(s => s.trim())
      const singleStatus =
        statusList.length === 1
          ? (statusList[0] as 'completed' | 'failed')
          : undefined

      const result = await request<ActionResponse>('/v1/queue/actions', {
        method: 'POST',
        body: JSON.stringify({
          queueName: '*',
          action: 'clean',
          ...(singleStatus && { status: singleStatus }),
        }),
      })
      return {
        success: result.success !== false,
        totalRemoved: result.removed || 0,
        byQueue: result.byQueue || {},
        ...(result.errors && { errors: result.errors }),
      }
    },

    // ============ ACTIONS ============
    /**
     * @param params `queueName: '*'` is only accepted with `type: 'clean'` —
     * the reference backend responds 400 for any other action with '*'.
     * `retry-all` is natively supported by `POST /v1/queue/actions`
     * (mapped 1:1, no special fallback).
     *
     * @example
     * ```ts
     * await adapter.performAction({ type: 'clean', queueName: '*' })
     * // -> clears completed+failed across all registered queues
     * ```
     */
    performAction: async (
      params: QueueActionParams
    ): Promise<ActionResponse> => {
      const { type, queueName, status } = params

      // Map frontend action types to NestJS API format
      const actionMap: Record<string, string> = {
        pause: 'pause',
        resume: 'resume',
        clean: 'clean',
        'retry-all': 'retry-all',
        // Waiting jobs only (telamonjs-queue >=3.3.0). Never obliterate: that
        // also kills active jobs, history and cron schedulers.
        drain: 'drain',
      }

      return request<ActionResponse>('/v1/queue/actions', {
        method: 'POST',
        body: JSON.stringify({
          queueName,
          action: actionMap[type],
          ...(status && { status }),
        }),
      })
    },

    retryJob: params =>
      request<void>('/v1/queue/jobs/retry', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    removeJob: params =>
      request<void>('/v1/queue/jobs/remove', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    promoteJob: params =>
      request<void>('/v1/queue/jobs/promote', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    bulkOperation: (params: BulkOperationParams) =>
      request<BulkOperationResponse>('/v1/queue/jobs/bulk', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    // ============ DISPATCH ============
    getDispatchableJobs: () => request<DispatchableJob[]>('/v1/queue/dispatch'),

    dispatchJob: params =>
      request<DispatchResponse>('/v1/queue/dispatch', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    // ============ JOB CONFIG ============
    getJobConfigs: () => request<JobConfig[]>('/v1/queue/config'),

    getJobConfig: (jobName: string) =>
      request<JobConfigWithUser>(
        `/v1/queue/config/${encodeURIComponent(jobName)}`
      ),

    updateJobConfig: (jobName: string, updates: JobConfigUpdateInput) =>
      request<JobConfigWithUser>(
        `/v1/queue/config/${encodeURIComponent(jobName)}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updates),
        }
      ),

    toggleJobConfig: (jobName: string, enabled: boolean) =>
      request<JobConfigWithUser>(
        `/v1/queue/config/${encodeURIComponent(jobName)}/toggle`,
        {
          method: 'POST',
          body: JSON.stringify({ enabled }),
        }
      ),

    toggleModuleJobConfigs: (module: string, enabled: boolean) =>
      request<{ updated: number }>(
        `/v1/queue/config/modules/${encodeURIComponent(module)}/toggle`,
        {
          method: 'POST',
          body: JSON.stringify({ enabled }),
        }
      ),

    getJobConfigHistory: (jobName: string, limit = 50) => {
      const params = new URLSearchParams({ limit: limit.toString() })
      return request<JobHistoryEntry[]>(
        `/v1/queue/config/${encodeURIComponent(jobName)}/history?${params}`
      )
    },

    // ============ HEALTH (opt-in: only for backends that serve the routes) ============
    ...(health
      ? {
          getHealth: () => request<QueueHealthResponse>('/v1/queue/health'),
          getFailureGroups: (queueName: string) =>
            request<FailureGroupsResponse>(
              `/v1/queue/failures?${new URLSearchParams({ queueName })}`
            ),
        }
      : {}),

    // ============ SSE ============
    /**
     * `GET /v1/queue/events` requires the `jobs.execute` permission on the
     * reference backend (previously a valid JWT was enough) — the returned
     * token must belong to a user with that permission or the SSE connection fails.
     */
    getSSEConfig: async (): Promise<SSEConfig> => {
      const url = `${baseUrl}/v1/queue/events`
      const token = await getToken()
      return { url, token }
    },
  }
}
