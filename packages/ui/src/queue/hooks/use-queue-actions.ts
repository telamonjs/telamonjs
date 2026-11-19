'use client'

/**
 * Mutation hooks for queue actions
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useQueueApi } from '../api/provider'
import type { DashboardStats } from '../types'
import type { QueueActionParams } from '../api/types'
import { LIB_QUERY_META } from '../../utils/query-meta'

/**
 * Hook to perform actions on queues
 *
 * Supported actions:
 * - pause: Pause queue
 * - resume: Resume queue
 * - clean: Clear completed/failed jobs
 * - retry-all: Retry all failed jobs
 * - drain: Remove all jobs
 *
 * Features:
 * - Automatic stats cache invalidation
 * - Optimistic update (paused state)
 *
 * @example
 * ```tsx
 * const queueAction = useQueueAction()
 * await queueAction.mutateAsync({
 *   type: 'pause',
 *   queueName: 'gateway_processar-dados'
 * })
 * ```
 */
export function useQueueAction() {
  const api = useQueueApi()
  const queryClient = useQueryClient()

  return useMutation({
    meta: LIB_QUERY_META,
    mutationKey: ['queue-action'],
    mutationFn: (params: QueueActionParams) => api.performAction(params),

    // Optimistic update for pause/resume
    onMutate: async params => {
      if (params.type === 'pause' || params.type === 'resume') {
        await queryClient.cancelQueries({ queryKey: ['queue', 'stats'] })
        const previous = queryClient.getQueryData<DashboardStats>([
          'queue',
          'stats',
        ])

        if (previous) {
          queryClient.setQueryData<DashboardStats>(['queue', 'stats'], {
            ...previous,
            queues: previous.queues.map(q =>
              q.name === params.queueName
                ? { ...q, paused: params.type === 'pause' }
                : q
            ),
          })
        }

        return { previous }
      }
      return undefined
    },

    // Rollback on error
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['queue', 'stats'], context.previous)
      }
    },

    // Always refetch after an action
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['queue', 'jobs'] })
      queryClient.invalidateQueries({ queryKey: ['queue', 'history'] })
    },
  })
}

/**
 * Hook for bulk actions grouped by queue
 *
 * Features:
 * - Groups jobs by queueName automatically
 * - Executes operations in parallel per queue
 * - Automatic cache invalidation
 *
 * @example
 * ```tsx
 * const bulkAction = useBulkJobAction()
 * await bulkAction.mutateAsync({
 *   action: 'retry',
 *   jobs: [
 *     { id: '1', queueName: 'gateway_processar-dados' },
 *     { id: '2', queueName: 'gateway_selecionar-ids' }
 *   ]
 * })
 * ```
 */
export function useBulkJobAction() {
  const api = useQueueApi()
  const queryClient = useQueryClient()

  return useMutation({
    meta: LIB_QUERY_META,
    mutationFn: async ({
      action,
      jobs,
    }: {
      action: 'retry' | 'remove' | 'promote'
      jobs: Array<{ id: string; queueName: string }>
    }) => {
      // Group by queue
      const grouped = jobs.reduce(
        (acc, job) => {
          if (!acc[job.queueName]) acc[job.queueName] = []
          acc[job.queueName].push(job.id)
          return acc
        },
        {} as Record<string, string[]>
      )

      // Execute per-queue bulk operations
      const results = await Promise.all(
        Object.entries(grouped).map(([queueName, jobIds]) =>
          api.bulkOperation({
            queueName,
            jobIds,
            operation: action as 'retry' | 'remove',
          })
        )
      )

      return { results, count: jobs.length, action }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', 'jobs'] })
      queryClient.invalidateQueries({ queryKey: ['queue', 'history'] })
      queryClient.invalidateQueries({ queryKey: ['queue', 'stats'] })
    },
  })
}
