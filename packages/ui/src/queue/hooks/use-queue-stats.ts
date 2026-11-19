'use client'

/**
 * Hook to fetch queue statistics
 */

import { useQuery } from '@tanstack/react-query'
import { useQueueApi } from '../api/provider'
import { usePageVisibility } from '../../hooks/usePageVisibility'
import type { DashboardStats } from '../types'
import { LIB_QUERY_META } from '../../utils/query-meta'

/**
 * Hook to fetch statistics for all queues
 *
 * Features:
 * - Configurable auto-polling (default: 10s)
 * - Pauses polling when page is hidden (saves resources)
 * - Refetch on window focus
 * - 5s cache
 *
 * @param pollInterval - Polling interval in ms (default: 10000). Use undefined to disable.
 *
 * @example
 * ```tsx
 * const { data: stats, isLoading, isRefetching, refetch } = useQueueStats()
 * console.log(stats.totalWaiting, stats.queues)
 * ```
 */
export function useQueueStats(pollInterval: number | undefined = 10_000) {
  const api = useQueueApi()
  const isVisible = usePageVisibility()

  return useQuery<DashboardStats>({
    meta: LIB_QUERY_META,
    queryKey: ['queue', 'stats'],
    queryFn: () => api.getStats(),
    staleTime: 5_000,
    // Pause polling when page is hidden
    refetchInterval: isVisible ? pollInterval : false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3,
  })
}
