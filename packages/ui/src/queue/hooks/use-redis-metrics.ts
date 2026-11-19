'use client'

/**
 * Hook to fetch Redis metrics
 */

import { useQuery } from '@tanstack/react-query'
import { useQueueApi } from '../api/provider'
import { usePageVisibility } from '../../hooks/usePageVisibility'
import type { RedisMetrics } from '../types'
import { LIB_QUERY_META } from '../../utils/query-meta'

/**
 * Hook to fetch Redis metrics (connection pool)
 *
 * Features:
 * - Auto-polling every 10s
 * - Pauses polling when page is hidden (saves resources)
 * - Refetch on window focus
 * - 5s cache
 *
 * @example
 * ```tsx
 * const { data: metrics, isLoading, error } = useRedisMetrics()
 * console.log(metrics.connected_clients, metrics.utilization_percent)
 * ```
 */
export function useRedisMetrics() {
  const api = useQueueApi()
  const isVisible = usePageVisibility()

  return useQuery<RedisMetrics>({
    meta: LIB_QUERY_META,
    queryKey: ['redis', 'metrics'],
    queryFn: () => api.getRedisMetrics(),
    staleTime: 5_000,
    // Pause polling when page is hidden
    refetchInterval: isVisible ? 10_000 : false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3,
  })
}
