/**
 * @telamonjs/queue/http
 *
 * Framework-agnostic HTTP handlers for the queue dashboard's ~18 REST
 * routes (`/v1/queue/*`) — the backend half of the contract
 * `packages/ui/src/queue/api/adapters/nestjs-adapter.ts` expects. Each
 * handler takes `QueueHttpDeps` + already-parsed payload (+ actor where
 * relevant) and returns a plain DTO — no `Request`/`Response`, no
 * decorator, no framework import. `./nestjs` is the Nest binding; an
 * Express (or any other) binding can wrap these directly.
 */
export type {
  QueueHttpDeps,
  QueueSource,
  JobState,
  QueueStatsEntry,
  QueueStatsResponse,
  JobInfo,
  HistoryStats,
  JobsResponse,
  JobsAllResponse,
  HistoryResponse,
  HistoryAllResponse,
  ActionResponse,
  DispatchResponse,
  BulkOperationResponse,
  DispatchableJob,
  JobConfigWithUser,
  JobHistoryEntry,
  JobConfigUpdateInput,
  DispatchRequestBody,
  QueueActionType,
  PerformActionBody,
  GetHistoryParams,
  GetHistoryAllParams,
  GetJobsParams,
  GetJobsAllParams,
  JobIdBody,
  BulkOperationBody,
  QueueHealthStatus,
  QueueHealthEntry,
  QueueHealthResponse,
  FailureGroup,
  FailureGroupsResponse,
} from './types.js'
export { QueueHttpError } from './types.js'
export { queueSourceFromManager, queueSourceFromRegistry } from './queue-source.js'

export { handleGetStats } from './stats.js'
export { handleGetDispatchableJobs, handleDispatch } from './dispatch.js'
export { handlePerformAction } from './actions.js'
export {
  handleGetJobs,
  handleGetJobsAll,
  handleRetryJob,
  handleRemoveJob,
  handlePromoteJob,
  handleBulkOperation,
} from './jobs.js'
export { handleGetHistory, handleGetHistoryAll } from './history.js'
export {
  handleGetHealth,
  handleGetFailureGroups,
  renderHealthMetrics,
  deriveHealthStatus,
  normalizeFailureReason,
} from './health.js'
export {
  handleGetJobConfigs,
  handleGetJobConfig,
  handleUpdateJobConfig,
  handleToggleJobConfig,
  handleToggleModuleJobConfigs,
  handleGetJobConfigHistory,
} from './config.js'
