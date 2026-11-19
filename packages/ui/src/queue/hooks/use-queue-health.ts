'use client'

/**
 * Queue health hooks — both endpoints are optional on the adapter
 * (`getHealth` / `getFailureGroups`); without them the queries stay disabled.
 */

import { useQuery } from '@tanstack/react-query'
import { useQueueApi } from '../api/provider'
import { usePageVisibility } from '../../hooks/usePageVisibility'
import type { QueueApiAdapter, QueueConfigApiAdapter } from '../api/types'
import type { FailureGroupsResponse, QueueHealth } from '../types'
import { LIB_QUERY_META } from '../../utils/query-meta'

type HealthApi = QueueApiAdapter &
  Pick<QueueConfigApiAdapter, 'getHealth' | 'getFailureGroups'>

/**
 * Per-queue health, polled every 15s (paused while the page is hidden).
 * Returns `Map<queueName, QueueHealth>`; `data` stays `undefined` when the
 * adapter has no `getHealth` (older backends) — the query never runs.
 *
 * @example
 * ```tsx
 * const { data: health } = useQueueHealth()
 * <QueuesTable queues={stats.queues} health={health} />
 * ```
 */
export function useQueueHealth(pollInterval: number | undefined = 15_000) {
  // Both methods are optional members of the adapter contract; reading them off the base type is safe.
  const api = useQueueApi() as HealthApi
  const isVisible = usePageVisibility()

  return useQuery<Map<string, QueueHealth>>({
    meta: LIB_QUERY_META,
    queryKey: ['queue', 'health'],
    queryFn: async () => {
      const data = await api.getHealth!()
      return new Map(data.queues.map(q => [q.name, q]))
    },
    enabled: typeof api.getHealth === 'function',
    refetchInterval: isVisible ? pollInterval : false,
    retry: 1,
  })
}

/**
 * Failed jobs of `queueName` grouped by normalized reason. Disabled while
 * `queueName` is null or the adapter has no `getFailureGroups`.
 */
export function useFailureGroups(queueName: string | null | undefined) {
  const api = useQueueApi() as HealthApi

  return useQuery<FailureGroupsResponse>({
    meta: LIB_QUERY_META,
    queryKey: ['queue', 'failures', queueName],
    queryFn: () => api.getFailureGroups!(queueName!),
    enabled: !!queueName && typeof api.getFailureGroups === 'function',
  })
}
