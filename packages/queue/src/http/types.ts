/**
 * DTO shapes for the queue HTTP layer.
 *
 * These are hand-mirrored (not imported) from the contract this subpath
 * exists to satisfy: `packages/ui/src/queue/api/types.ts` +
 * `packages/ui/src/queue/api/adapters/nestjs-adapter.ts`. `packages/queue`
 * must never depend on `packages/ui` (wrong direction in the dependency
 * graph), so the shapes are duplicated here deliberately — any drift is a
 * contract break to catch via the UI package's own adapter tests, not a
 * shared-type import.
 */
import type { Queue as BullQueue } from 'bullmq'
import type { ILogger } from '@telamonjs/logger'
import type { QueueStats } from '../core/types.js'
import type { JobConfigStore } from '../job-config/JobConfigStore.js'
import type { JobConfig } from '../job-config/types.js'
import type { JobContractRegistry } from '../contracts/index.js'
import type { SSEBroadcaster } from '../events/SSEBroadcaster.js'

/**
 * Minimal queue access the HTTP handlers need. Lets an API process serve the
 * dashboard from a shared-connection `QueueRegistry` instead of a full
 * `QueueManager` with every job class registered in-process — see
 * `queueSourceFromRegistry`/`queueSourceFromManager` in `./queue-source.js`.
 */
export interface QueueSource {
  /** Raw BullMQ queue for a job name, or `undefined` when unknown. */
  getQueue(jobName: string): BullQueue | undefined
  /** Per-queue counters keyed by job name. */
  getStats(): Promise<Record<string, QueueStats>>
}

export interface QueueHttpDeps {
  /**
   * Where the handlers read queues from. Prefer `queueSourceFromRegistry`
   * (one shared Redis connection; an API process split from its worker can
   * serve the dashboard without registering every job class). A process
   * that already owns a `QueueManager` can pass `queueSourceFromManager(qm)`.
   */
  queues: QueueSource
  jobConfigStore: JobConfigStore
  contracts: JobContractRegistry
  eventBroadcaster?: SSEBroadcaster
  /**
   * Optional. When provided, orphan-queue warnings (a queue with no
   * matching job contract — see `handleGetStats`) and per-queue failures
   * during a `'*'` action are logged here. Silently dropped otherwise.
   */
  logger?: ILogger
}

/**
 * Thrown by every handler instead of a framework exception — handlers stay
 * framework-agnostic (no Nest/Express import in `./http`). The `./nestjs`
 * shell maps `status` to the matching Nest `HttpException`.
 */
export class QueueHttpError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 404 | 409 | 422 = 400
  ) {
    super(message)
    this.name = 'QueueHttpError'
  }
}

export type JobState = 'waiting' | 'active' | 'delayed' | 'completed' | 'failed'

export interface QueueStatsEntry {
  name: string
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

export interface QueueStatsResponse {
  totalWaiting: number
  totalActive: number
  totalCompleted: number
  totalFailed: number
  totalDelayed: number
  queues: QueueStatsEntry[]
}

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

export interface HistoryStats {
  completed?: number
  failed?: number
}

export interface JobsResponse {
  jobs: JobInfo[]
  total?: number
}

export interface JobsAllResponse {
  jobs: JobInfo[]
  total: number
  approximate?: boolean
}

export interface HistoryResponse {
  jobs: JobInfo[]
  total?: number
}

export interface HistoryAllResponse {
  jobs: JobInfo[]
  total: number
  stats?: HistoryStats
  approximate?: boolean
}

export interface ActionResponse {
  success: boolean
  message?: string
  removed?: number
  byQueue?: Record<string, number>
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

export interface DispatchableJob {
  name: string
  displayName: string
  module: string
  description: string
  dispatchable: boolean
}

export interface JobConfigWithUser extends JobConfig {
  updatedByUser?: { name: string | null; email: string } | null
}

export interface JobHistoryEntry {
  id: string
  action: string
  changedBy: string | null
  changedByUser: { name: string | null; email: string } | null
  before: unknown
  after: unknown
  reason: string | null
  createdAt: string
}

export interface JobConfigUpdateInput {
  description?: string | null
  cronPattern?: string | null
  priority?: number
  concurrency?: number | null
  timeout?: number | null
}

// ============ Request bodies / query params ============

export interface DispatchRequestBody {
  queueName: string
  data?: Record<string, unknown>
}

export type QueueActionType = 'pause' | 'resume' | 'clean' | 'retry-all' | 'drain' | 'obliterate'

export interface PerformActionBody {
  queueName: string
  action: QueueActionType
  status?: 'completed' | 'failed'
}

export interface GetHistoryParams {
  queueName: string
  limit?: number
}

export interface GetHistoryAllParams {
  statuses?: string
  queue?: string
  search?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export interface GetJobsParams {
  queueName: string
  state?: JobState
  limit?: number
}

export interface GetJobsAllParams {
  status?: JobState
  queue?: string
  search?: string
  limit?: number
  offset?: number
}

export interface JobIdBody {
  queueName: string
  jobId: string
}

export interface BulkOperationBody {
  queueName: string
  jobIds: string[]
  operation: 'retry' | 'remove'
}

export type QueueHealthStatus = 'ok' | 'late' | 'failing' | 'paused'

export interface QueueHealthEntry {
  name: string
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
  queues: QueueHealthEntry[]
}

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
  /** Failed jobs in the queue (ZCARD). */
  total: number
  /** Failed jobs actually scanned to build the groups. */
  scanned: number
  groups: FailureGroup[]
}
