'use client'

/**
 * Hooks to fetch queue jobs
 */

import { useQuery } from '@tanstack/react-query'
import { useQueueApi } from '../api/provider'
import type { JobState } from '../types'
import type { JobsAllResponse } from '../api'
import { LIB_QUERY_META } from '../../utils/query-meta'

/**
 * Hook to fetch jobs from a specific queue
 *
 * @param queueName - Queue name
 * @param state - Job state (waiting, active, delayed, completed, failed)
 * @param limit - Maximum number of jobs
 *
 * @example
 * ```tsx
 * const { data } = useQueueJobs('gateway_processar-dados', 'waiting', 50)
 * console.log(data?.jobs)
 * ```
 */
export function useQueueJobs(
  queueName: string | null | undefined,
  state: JobState = 'waiting',
  limit = 50
) {
  const api = useQueueApi()

  return useQuery({
    meta: LIB_QUERY_META,
    queryKey: ['queue', 'jobs', queueName, state, limit],
    queryFn: () => api.getJobs(queueName!, state, limit),
    enabled: !!queueName,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook to fetch jobs from all queues with filters
 *
 * Features:
 * - Filter by status (waiting, active, delayed, completed, failed)
 * - Filter by specific queue (optional)
 * - Search by ID, name, data, error
 * - Pagination (limit, offset)
 * - 5s cache
 *
 * @param params - URLSearchParams with filters
 *
 * @example
 * ```tsx
 * const params = new URLSearchParams({
 *   status: 'failed',
 *   queue: 'gateway_processar-dados',
 *   search: 'timeout',
 *   limit: '100'
 * })
 * const { data, isLoading } = useQueueJobsAll(params)
 * ```
 */
export function useQueueJobsAll(params: URLSearchParams | null) {
  const api = useQueueApi()

  return useQuery<JobsAllResponse>({
    meta: LIB_QUERY_META,
    queryKey: ['queue', 'jobs-all', params?.toString() ?? 'empty'],
    queryFn: () => {
      if (!params) {
        return Promise.resolve({ jobs: [], total: 0 })
      }
      return api.getJobsAll(params)
    },
    staleTime: 5_000,
    refetchOnWindowFocus: true,
    retry: 2,
    enabled: !!params,
  })
}
