'use client'

/**
 * Hook to fetch dispatchable jobs
 */

import { useQuery } from '@tanstack/react-query'
import { useQueueApi } from '../api/provider'
import type { DispatchableJob } from '../types'
import { LIB_QUERY_META } from '../../utils/query-meta'

/**
 * Hook to fetch dispatchable jobs
 *
 * @example
 * ```tsx
 * const { data: dispatchableJobs } = useDispatchableJobs()
 * ```
 */
export function useDispatchableJobs() {
  const api = useQueueApi()

  return useQuery<DispatchableJob[]>({
    meta: LIB_QUERY_META,
    queryKey: ['queue', 'dispatchable'],
    queryFn: () => api.getDispatchableJobs(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}
