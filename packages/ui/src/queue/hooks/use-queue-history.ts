'use client'

/**
 * Hooks to fetch job history
 */

import { useQuery } from '@tanstack/react-query'
import { useQueueApi } from '../api/provider'
import type { HistoryAllResponse } from '../api'
import { LIB_QUERY_META } from '../../utils/query-meta'

/**
 * Hook to fetch a specific queue's history
 *
 * @param queueName - Queue name
 * @param limit - Maximum number of jobs
 *
 * @example
 * ```tsx
 * const { data: history } = useQueueHistory('gateway_processar-dados', 100)
 * ```
 */
export function useQueueHistory(
  queueName: string | null | undefined,
  limit = 50
) {
  const api = useQueueApi()

  return useQuery({
    meta: LIB_QUERY_META,
    queryKey: ['queue', 'history', queueName, limit],
    queryFn: () => api.getHistory(queueName!, limit),
    enabled: !!queueName,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook to fetch history from all queues with advanced filters
 *
 * Features:
 * - Filters by status (completed, failed, all)
 * - Search by ID, name, data, error
 * - Date filter (startDate, endDate)
 * - Pagination (limit, offset)
 * - 10s cache
 *
 * @param params - URLSearchParams with filters
 *
 * @example
 * ```tsx
 * const params = new URLSearchParams({
 *   statuses: 'completed,failed',
 *   search: 'error',
 *   startDate: '2026-01-01',
 *   limit: '50',
 *   offset: '0'
 * })
 * const { data, isLoading } = useQueueHistoryAll(params)
 * ```
 */
export function useQueueHistoryAll(params: URLSearchParams) {
  const api = useQueueApi()

  return useQuery<HistoryAllResponse>({
    meta: LIB_QUERY_META,
    queryKey: ['queue', 'history-all', params.toString()],
    queryFn: () => api.getHistoryAll(params),
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    retry: 2,
  })
}
