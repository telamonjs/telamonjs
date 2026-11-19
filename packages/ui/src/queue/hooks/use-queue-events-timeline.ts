/**
 * useQueueEventsTimeline - Real-time job events for timeline
 *
 * Combines active and recently completed jobs for the events timeline.
 * Optimized: 2 parallel aggregated calls instead of multiple individual calls.
 */

import { useQuery } from '@tanstack/react-query'
import { useQueueApi } from '../api/provider'
import { usePageVisibility } from '../../hooks/usePageVisibility'
import type { TimelineJob } from '../types'
import { LIB_QUERY_META } from '../../utils/query-meta'

export interface TimelineData {
  jobs: TimelineJob[]
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
export function useQueueEventsTimeline() {
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

      // Combine results and tag status
      // Use a Map to guarantee unique IDs (avoids duplicates if a job transitioned from active→completed)
      const jobsMap = new Map<string, TimelineJob>()

      if (activeJobsResp?.jobs) {
        for (const job of activeJobsResp.jobs) {
          jobsMap.set(job.id, {
            id: job.id,
            name: job.name,
            queueName: job.queueName,
            queueDisplayName: job.queueName,
            status: 'active' as const,
            timestamp: job.timestamp,
            processedOn: job.processedOn,
            finishedOn: job.finishedOn,
            attemptsMade: job.attemptsMade,
            failedReason: job.failedReason,
            returnvalue: job.returnvalue,
          })
        }
      }

      if (completedJobsResp?.jobs) {
        for (const job of completedJobsResp.jobs) {
          // Only add if not present ('active' takes precedence over 'completed')
          if (!jobsMap.has(job.id)) {
            jobsMap.set(job.id, {
              id: job.id,
              name: job.name,
              queueName: job.queueName,
              queueDisplayName: job.queueName,
              status: 'completed' as const,
              timestamp: job.timestamp,
              processedOn: job.processedOn,
              finishedOn: job.finishedOn,
              attemptsMade: job.attemptsMade,
              failedReason: job.failedReason,
              returnvalue: job.returnvalue,
            })
          }
        }
      }

      if (failedJobsResp?.jobs) {
        for (const job of failedJobsResp.jobs) {
          // Only add if not present ('active'/'completed' take precedence over 'failed')
          if (!jobsMap.has(job.id)) {
            jobsMap.set(job.id, {
              id: job.id,
              name: job.name,
              queueName: job.queueName,
              queueDisplayName: job.queueName,
              status: 'failed' as const,
              timestamp: job.timestamp,
              processedOn: job.processedOn,
              finishedOn: job.finishedOn,
              attemptsMade: job.attemptsMade,
              failedReason: job.failedReason,
              returnvalue: job.returnvalue,
            })
          }
        }
      }

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
    // Pause polling when page is hidden
    refetchInterval: isVisible ? 2_000 : false,
  })
}
