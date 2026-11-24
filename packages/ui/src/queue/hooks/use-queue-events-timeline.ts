/**
 * useQueueEventsTimeline - Real-time job events for timeline
 *
 * Combines active and recently completed jobs for the events timeline.
 * Optimized: 2 parallel aggregated calls instead of multiple individual calls.
 */

import { useQuery } from '@tanstack/react-query'
import { useQueueApi } from '../api/provider'
import { usePageVisibility } from '../../hooks/usePageVisibility'
import type { JobInfo, TimelineJob } from '../types'
import { LIB_QUERY_META } from '../../utils/query-meta'

export interface TimelineData {
  jobs: TimelineJob[]
}

const SSE_SAFETY_NET_INTERVAL = 30_000
const DEFAULT_POLL_INTERVAL = 2_000

export interface QueueEventsTimelineOptions {
  /** SSE stream is live (it already pushes events into this query's cache) */
  sseConnected?: boolean
  /** The view showing the timeline is the active one (default: true) */
  active?: boolean
  /** Poll interval in ms while SSE is down (default: 2000) */
  pollInterval?: number
}

/**
 * A job scheduler / repeatable iteration: BullMQ sets `opts.repeatJobKey`
 * (job schedulers) or `opts.repeat` (legacy repeatables) and ids them
 * `repeat:<key>:<millis>`.
 */
export function isRepeatJob(job: Pick<JobInfo, 'id' | 'opts'>): boolean {
  return Boolean(job.opts?.repeatJobKey || job.opts?.repeat) || job.id.startsWith('repeat:')
}

/**
 * Poll interval for the timeline: none while hidden or on another tab, a
 * 30s safety net while SSE is live, otherwise `pollInterval` (2s default).
 */
export function timelinePollInterval({
  isVisible,
  active,
  sseConnected,
  pollInterval = DEFAULT_POLL_INTERVAL,
}: {
  isVisible: boolean
  active: boolean
  sseConnected: boolean
  pollInterval?: number
}): number | false {
  if (!isVisible || !active) return false
  return sseConnected ? SSE_SAFETY_NET_INTERVAL : pollInterval
}

/**
 * Hook for real-time job timeline events.
 *
 * API call optimization:
 * - Before: ~11 calls (1 stats + 5 queues × 2 calls)
 * - After: 2 aggregated parallel calls
 *
 * @example
 * ```tsx
 * const { data: jobs } = useQueueEventsTimeline()
 * ```
 */
export function useQueueEventsTimeline({
  sseConnected = false,
  active = true,
  pollInterval,
}: QueueEventsTimelineOptions = {}) {
  const api = useQueueApi()
  const isVisible = usePageVisibility()

  return useQuery<TimelineData>({
    meta: LIB_QUERY_META,
    queryKey: ['queue', 'events-timeline'],
    queryFn: async (): Promise<TimelineData> => {
      // Aggregated parallel calls - OPTIMIZED
      // Removed the per-queue loop, using the aggregated endpoint
      const [activeJobsResp, completedJobsResp, failedJobsResp] =
        await Promise.all([
          api.getJobsAll(
            new URLSearchParams({
              status: 'active',
              limit: '50',
            })
          ),
          api.getJobsAll(
            new URLSearchParams({
              status: 'completed',
              limit: '30',
            })
          ),
          api.getJobsAll(
            new URLSearchParams({
              status: 'failed',
              limit: '30',
            })
          ),
        ])

      // Combine results and tag status. A Map keeps IDs unique: a job seen
      // in several states (it moved on between the calls) keeps the first
      // one - 'active' over 'completed' over 'failed'.
      const jobsMap = new Map<string, TimelineJob>()
      const add = (jobs: JobInfo[] | undefined, status: TimelineJob['status']) => {
        for (const job of jobs ?? []) {
          if (jobsMap.has(job.id)) continue
          jobsMap.set(job.id, {
            id: job.id,
            name: job.name,
            queueName: job.queueName,
            queueDisplayName: job.queueName,
            status,
            timestamp: job.timestamp,
            processedOn: job.processedOn,
            finishedOn: job.finishedOn,
            attemptsMade: job.attemptsMade,
            failedReason: job.failedReason,
            returnvalue: job.returnvalue,
            repeat: isRepeatJob(job),
          })
        }
      }
      add(activeJobsResp?.jobs, 'active')
      add(completedJobsResp?.jobs, 'completed')
      add(failedJobsResp?.jobs, 'failed')

      // Convert Map to array and sort by most recent timestamp
      const allJobs = Array.from(jobsMap.values())
      return {
        jobs: allJobs.sort(
          (a, b) =>
            ((b.timestamp as number) || 0) - ((a.timestamp as number) || 0)
        ),
      }
    },
    staleTime: 1_000,
    refetchInterval: timelinePollInterval({
      isVisible,
      active,
      sseConnected,
      pollInterval,
    }),
  })
}
