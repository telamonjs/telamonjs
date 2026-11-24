/**
 * Queue Dashboard Types
 *
 * Types for the Queue monitoring module (BullMQ)
 */

// ============================================
// JOB STATES
// ============================================

export type JobState = 'waiting' | 'active' | 'delayed' | 'completed' | 'failed'

// ============================================
// QUEUE STATS
// ============================================

export interface QueueStats {
  name: string
  /** Served by the API: contract `label` → contract `description` → `name`. */
  displayName: string
  module: string
  description: string
  dispatchable: boolean
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  paused: boolean
}

export interface DashboardStats {
  totalWaiting: number
  totalActive: number
  totalCompleted: number
  totalFailed: number
  totalDelayed: number
  queues: QueueStats[]
}

// ============================================
// JOB INFO
// ============================================

export interface JobInfo {
  id: string
  name: string
  queueName: string
  data: Record<string, unknown>
  opts?: Record<string, unknown>
  progress: number
  attemptsMade: number
  attemptsMax: number
  failedReason?: string
  stacktrace?: string[]
  returnvalue?: unknown
  timestamp: number
  processedOn?: number
  finishedOn?: number
  delay?: number
  status: JobState | string
}

// ============================================
// QUEUE HEALTH (GET /v1/queue/health)
// ============================================

/**
 * Derived queue status. Precedence: paused > late > failing > ok.
 * - late: a scheduler's next iteration is overdue (workers down/stuck).
 * - failing: something failed in the last hour and the latest outcome is a failure.
 */
export type QueueHealthStatus = 'ok' | 'late' | 'failing' | 'paused'

/** Per-queue health — mirrors `QueueHealthEntry` from `@telamonjs/queue`. */
export interface QueueHealth {
  name: string
  /** Served by the API: contract `label` → contract `description` → `name`. */
  displayName: string
  module: string
  dispatchable: boolean
  /** `false` → retry is owned by the job itself; the UI hides retry actions. */
  manualRetry: boolean
  paused: boolean
  /** Cron pattern (or `every Nms`) of the queue's scheduler, if any. */
  schedule: string | null
  /** Earliest next scheduled iteration (ms epoch), if any. */
  nextRunAt: number | null
  lastCompletedAt: number | null
  lastFailedAt: number | null
  completedLastHour: number
  failedLastHour: number
  waiting: number
  active: number
  status: QueueHealthStatus
}

export interface QueueHealthResponse {
  generatedAt: number
  queues: QueueHealth[]
}

// ============================================
// FAILURE GROUPS (GET /v1/queue/failures)
// ============================================

export interface FailureGroup {
  /** Normalized first line of `failedReason` (ids/numbers collapsed). */
  reason: string
  /** Full `failedReason` of the newest job in the group. */
  sample: string
  count: number
  firstAt: number
  lastAt: number
  jobIds: string[]
}

export interface FailureGroupsResponse {
  queueName: string
  manualRetry: boolean
  /** Failed jobs in the queue. */
  total: number
  /** Failed jobs actually scanned to build the groups (`< total` → groups are a sample). */
  scanned: number
  groups: FailureGroup[]
}

// ============================================
// HISTORY STATS
// ============================================

/**
 * Aggregated completed/failed counts for a history query.
 *
 * Reflects the SAME filters (search, date range) as the accompanying job
 * listing — when filters are active, counts are computed from the filtered
 * set (not global queue totals), so badges match what the list shows.
 *
 * Fields stay optional (matching the pre-existing inline shape) so
 * `data?.stats ?? {}` fallbacks used by consumers keep type-checking.
 */
export interface HistoryStats {
  completed?: number
  failed?: number
}

// ============================================
// JOB EVENTS (Timeline)
// ============================================

export type JobEventType =
  | 'job:started'
  | 'job:progress'
  | 'job:completed'
  | 'job:failed'
  | 'job:retrying'

export interface JobEvent {
  type: JobEventType
  jobId: string
  jobName: string
  timestamp: string
  progress?: number
  error?: string
  result?: unknown
  data?: unknown
}

// ============================================
// TIMELINE JOB (for JobEventTimeline)
// ============================================

export interface TimelineJob {
  id: string
  name: string
  queueName: string
  queueDisplayName?: string
  status: 'active' | 'completed' | 'failed'
  timestamp?: number
  processedOn?: number
  finishedOn?: number
  attemptsMade?: number
  failedReason?: string
  returnvalue?: unknown
  /** Iteration of a job scheduler / repeatable (BullMQ `opts.repeatJobKey`) */
  repeat?: boolean
}

// ============================================
// REDIS METRICS
// ============================================

export interface RedisMetrics {
  connected_clients: number
  max_clients: number
  utilization_percent: number
  rejected_connections: number
  total_connections_received: number
  timestamp: string
}

// ============================================
// JOB CONFIG (Configuration Management)
// ============================================

export interface JobConfig {
  jobName: string
  module: string
  description?: string
  enabled: boolean
  orphan: boolean
  cronPattern?: string
  timezone: string
  priority: number
  concurrency?: number
  timeout?: number
  updatedAt?: string
  updatedBy?: string
}

export type JobConfigWithUser = JobConfig & {
  updatedByUser?: {
    name: string | null
    email: string
  } | null
}

export type JobHistoryEntry = {
  id: string
  action: string
  changedBy: string | null
  changedByUser: {
    name: string | null
    email: string
  } | null
  before: unknown
  after: unknown
  reason: string | null
  createdAt: string
}

export type JobConfigUpdateInput = {
  description?: string | null
  cronPattern?: string | null
  priority?: number
  concurrency?: number | null
  timeout?: number | null
}

// ============================================
// SSE (Server-Sent Events)
// ============================================

export type SSEStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface SSEConfig {
  url: string
  token: string | null
}

export interface TimelineData {
  jobs: TimelineJob[]
}

// ============================================
// DISPATCHABLE JOBS
// ============================================

export interface DispatchableJob {
  name: string
  /** Served by the API: contract `label` → contract `description` → `name`. */
  displayName: string
  module: string
  description: string
  dispatchable: boolean
}

// ============================================
// STATUS CONFIG (UI)
// ============================================

export interface StatusConfig {
  icon: React.ReactNode
  label: string
  color: string
  bgColor: string
  borderColor?: string
}

// `statusConfigs` (a Record<JobState, StatusConfig> const) lived here until
// Fase A3 (2026-08): zero consumers, not exported from queue/index.ts, and a
// byte-for-byte duplicate of job-shared.tsx's `statusConfig`. Deleted. The
// `StatusConfig` type above stays — it IS exported from queue/index.ts.
