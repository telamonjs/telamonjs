/**
 * Queue API Types
 *
 * Interface and types for the Queue Dashboard Adapter Pattern.
 * Any adapter (NestJS, Next.js, custom) must implement QueueApiAdapter.
 */

import type {
  DashboardStats,
  JobInfo,
  JobState,
  RedisMetrics,
  DispatchableJob,
  JobConfig,
  JobConfigWithUser,
  JobHistoryEntry,
  JobConfigUpdateInput,
  SSEConfig,
  HistoryStats,
  QueueHealthResponse,
  FailureGroupsResponse
} from '../types'

// ============================================
// API RESPONSE TYPES
// ============================================

export interface QueueStatsResponse extends DashboardStats {}

export interface RedisMetricsResponse extends RedisMetrics {}

export interface JobsResponse {
  jobs: JobInfo[]
  total?: number
}

export interface JobsAllResponse {
  jobs: JobInfo[]
  total: number
  /**
   * `true` when `total` is a post-filter (search) count rather than an
   * exact aggregate — only set while a `search` filter is active.
   */
  approximate?: boolean
}

export interface HistoryResponse {
  jobs: JobInfo[]
  total?: number
}

export interface HistoryAllResponse {
  jobs: JobInfo[]
  total: number
  /** Aggregated completed/failed counts, filtered the same way as `jobs`. */
  stats?: HistoryStats
  /**
   * `true` when `total` is a post-filter (search/date range) count rather
   * than an exact aggregate — only set while search/startDate/endDate are
   * active. Absent (exact) otherwise.
   */
  approximate?: boolean
}

export interface ActionResponse {
  success: boolean
  message?: string
  removed?: number
  byQueue?: Record<string, number>
  /**
   * Per-queue failure messages (`"queueName: message"`) when the action
   * targets all queues (`queueName: '*'`) and some fail. `success` is only
   * `false` when every targeted queue failed.
   */
  errors?: string[]
}

export interface DispatchResponse {
  jobId: string
  queueName: string
}

export interface BulkOperationResponse {
  success: boolean
  processed: number
  failed: number
  errors?: string[]
}

export interface ClearHistoryResponse {
  totalRemoved: number
  byQueue?: Record<string, number>
  /** `false` only when every targeted queue failed to clean. */
  success?: boolean
  /** Per-queue failure messages (`"queueName: message"`), if any. */
  errors?: string[]
}

// ============================================
// API REQUEST PARAMS
// ============================================

export interface JobsAllParams {
  status?: JobState
  queue?: string
  search?: string
  limit?: number
  offset?: number
}

export interface HistoryAllParams {
  statuses?: ('completed' | 'failed')[]
  queue?: string
  search?: string
  /**
   * ISO 8601 string (or `Date`, serialized to ISO by the caller before
   * reaching the adapter). Backends validate the string and reject with a
   * 400 error when it doesn't parse.
   */
  startDate?: Date | string
  /** ISO 8601 string (or `Date`). Same validation as {@link startDate}. */
  endDate?: Date | string
  limit?: number
  offset?: number
}

export interface QueueActionParams {
  type: 'pause' | 'resume' | 'clean' | 'retry-all' | 'drain'
  /**
   * Target queue name, or `'*'` for all registered queues.
   * `'*'` is only accepted with `type: 'clean'` — every other action
   * targeting `'*'` is rejected by the backend with a 400 error.
   */
  queueName: string
  /** For `clean`: which state to clean. Omit to clean both. */
  status?: 'completed' | 'failed'
}

export interface BulkOperationParams {
  queueName: string
  jobIds: string[]
  operation: 'retry' | 'remove'
}

// ============================================
// QUEUE API ADAPTER INTERFACE
// ============================================

/**
 * Queue API contract.
 * Any adapter (NestJS, Next.js, etc) must implement this interface.
 */
export interface QueueApiAdapter {
  // ============ STATS ============
  /** Fetch statistics for all queues */
  getStats(): Promise<QueueStatsResponse>

  /** Fetch Redis metrics (connections, memory, etc) */
  getRedisMetrics(): Promise<RedisMetricsResponse>

  // ============ JOBS ============
  /** Fetch jobs from a specific queue */
  getJobs(
    queueName: string,
    state: JobState,
    limit?: number
  ): Promise<JobsResponse>

  /** Fetch jobs from all queues with filters */
  getJobsAll(params: URLSearchParams): Promise<JobsAllResponse>

  /** Fetch a queue's history */
  getHistory(queueName: string, limit?: number): Promise<HistoryResponse>

  /**
   * Fetch history from all queues with advanced filters.
   * Accepts `startDate`/`endDate` (ISO 8601) via `params` — backends that
   * support the validation reject with 400 when the date is not parseable.
   */
  getHistoryAll(params: URLSearchParams): Promise<HistoryAllResponse>

  /**
   * Clear history (completed + failed) across all queues.
   * `statuses` with a single value clears only that state; with two (or any
   * other combination) the status is omitted in the underlying call and the
   * backend clears completed + failed.
   */
  clearHistory(statuses: string): Promise<ClearHistoryResponse>

  // ============ ACTIONS ============
  /**
   * Perform an action on a queue (pause, resume, clean, retry-all, drain).
   * `queueName: '*'` (all queues) is only accepted with `type: 'clean'`.
   */
  performAction(params: QueueActionParams): Promise<ActionResponse>

  /** Retry a specific job */
  retryJob(params: { queueName: string; jobId: string }): Promise<void>

  /** Remove a specific job */
  removeJob(params: { queueName: string; jobId: string }): Promise<void>

  /** Promote a delayed job to waiting */
  promoteJob(params: { queueName: string; jobId: string }): Promise<void>

  /** Bulk operations (retry/remove multiple jobs) */
  bulkOperation(params: BulkOperationParams): Promise<BulkOperationResponse>

  // ============ DISPATCH ============
  /** List jobs that can be dispatched manually */
  getDispatchableJobs(): Promise<DispatchableJob[]>

  /** Dispatch a job manually */
  dispatchJob(params: {
    queueName: string
    data: Record<string, unknown>
  }): Promise<DispatchResponse>
}

// ============================================
// QUEUE CONFIG API ADAPTER (extends base)
// ============================================

/**
 * Extended adapter with job configuration methods.
 * Backward-compatible: it is a superset of QueueApiAdapter.
 */
export interface QueueConfigApiAdapter extends QueueApiAdapter {
  // ============ JOB CONFIG ============
  /** Fetch all job configurations */
  getJobConfigs(): Promise<JobConfig[]>

  /** Fetch a specific job's configuration */
  getJobConfig(jobName: string): Promise<JobConfigWithUser>

  /** Update a job's configuration */
  updateJobConfig(
    jobName: string,
    updates: JobConfigUpdateInput
  ): Promise<JobConfigWithUser>

  /** Toggle a job's enabled/disabled state */
  toggleJobConfig(
    jobName: string,
    enabled: boolean
  ): Promise<JobConfigWithUser>

  /** Toggle enabled/disabled for every job in a module */
  toggleModuleJobConfigs(
    module: string,
    enabled: boolean
  ): Promise<{ updated: number }>

  /** Fetch a job's configuration change history */
  getJobConfigHistory(
    jobName: string,
    limit?: number
  ): Promise<JobHistoryEntry[]>

  // ============ SSE ============
  /**
   * Get the SSE configuration (URL + token).
   * The endpoint (`GET /v1/queue/events`) requires the `jobs.execute`
   * permission on the reference backend — the authenticated user needs it or
   * the SSE connection is rejected.
   */
  getSSEConfig?(): Promise<SSEConfig>

  // ============ HEALTH (optional) ============
  /**
   * Per-queue health (`GET /v1/queue/health`, telamonjs-queue >= 3.3).
   * Optional: without it the dashboard renders the plain counts table.
   */
  getHealth?(): Promise<QueueHealthResponse>

  /**
   * Failed jobs of a queue grouped by normalized reason
   * (`GET /v1/queue/failures?queueName=`). Optional: without it, clicking the
   * failed count opens the plain failed-jobs list.
   */
  getFailureGroups?(queueName: string): Promise<FailureGroupsResponse>
}
