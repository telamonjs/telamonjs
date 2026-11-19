/**
 * Queue Hooks
 *
 * React Query hooks for the queue system.
 */

// Stats
export { useQueueStats } from './use-queue-stats'

// Jobs
export { useQueueJobs, useQueueJobsAll } from './use-queue-jobs'

// History
export { useQueueHistory, useQueueHistoryAll } from './use-queue-history'

// Actions
export {
  useQueueAction,
  useBulkJobAction
} from './use-queue-actions'

// Health
export { useQueueHealth, useFailureGroups } from './use-queue-health'

// Redis
export { useRedisMetrics } from './use-redis-metrics'

// Events Timeline
export { useQueueEventsTimeline } from './use-queue-events-timeline'

// Dispatchable
export { useDispatchableJobs } from './use-dispatchable-jobs'

// SSE
export { useQueueSSE } from './use-queue-sse'

// Job Config
export {
  useAllJobs,
  useJobDetails,
  useJobHistory,
  useToggleJobEnabled,
  useUpdateJobConfig,
  useToggleModuleJobs
} from './use-job-config'

// Clipboard
export { useCopyToClipboard } from './use-copy-to-clipboard'
