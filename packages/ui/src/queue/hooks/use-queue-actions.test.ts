/**
 * useQueueAction unit test — focused on the changed behavior:
 *
 * "useQueueAction now sets mutationKey: ['queue-action']" — this is what
 * lets useQueueSSE's stats handler check `queryClient.isMutating({
 * mutationKey: ['queue-action'] })` to skip writing stale SSE stats frames
 * while a pause/resume/etc. mutation is in flight (see use-queue-sse.ts).
 * If the mutationKey regresses, that skip-check silently stops working.
 *
 * Only the mutationKey wiring is covered here (cheap, load-bearing). Full
 * onMutate/onError/onSettled coverage for every action hook in this file is
 * out of scope — queue/ has ~0% historical coverage and raising everything
 * isn't the goal of this task.
 *
 * Source of truth (read, not altered):
 *   src/queue/hooks/use-queue-actions.ts
 */

import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useQueueAction } from './use-queue-actions'
import { QueueApiProvider } from '../api/provider'
import type { QueueApiAdapter } from '../api/types'

function makeMockAdapter(overrides: Partial<QueueApiAdapter> = {}): QueueApiAdapter {
  return {
    getStats: vi.fn().mockResolvedValue({ totalWaiting: 0, totalActive: 0, totalCompleted: 0, totalFailed: 0, totalDelayed: 0, queues: [] }),
    getRedisMetrics: vi.fn().mockResolvedValue({}),
    getJobs: vi.fn().mockResolvedValue({ jobs: [], total: 0 }),
    getJobsAll: vi.fn().mockResolvedValue({ jobs: [], total: 0 }),
    getHistory: vi.fn().mockResolvedValue({ jobs: [] }),
    getHistoryAll: vi.fn().mockResolvedValue({ jobs: [], total: 0 }),
    clearHistory: vi.fn().mockResolvedValue({ totalRemoved: 0 }),
    performAction: vi.fn().mockResolvedValue({ success: true }),
    retryJob: vi.fn().mockResolvedValue(undefined),
    removeJob: vi.fn().mockResolvedValue(undefined),
    promoteJob: vi.fn().mockResolvedValue(undefined),
    bulkOperation: vi.fn().mockResolvedValue({ success: true, processed: 0, failed: 0 }),
    getDispatchableJobs: vi.fn().mockResolvedValue([]),
    dispatchJob: vi.fn().mockResolvedValue({ jobId: 'x', queueName: 'y' }),
    ...overrides,
  }
}

function wrapper(queryClient: QueryClient, adapter: QueueApiAdapter) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(QueueApiProvider, { adapter }, children)
    )
  }
}

describe('useQueueAction', () => {
  describe('State Management', () => {
    it('registers the mutation under mutationKey ["queue-action"] (queryClient.isMutating can see it)', async () => {
      const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      let resolvePerformAction: (value: { success: boolean }) => void = () => {}
      const pending = new Promise<{ success: boolean }>(resolve => {
        resolvePerformAction = resolve
      })
      const adapter = makeMockAdapter({ performAction: vi.fn().mockReturnValue(pending) })

      const { result } = renderHook(() => useQueueAction(), {
        wrapper: wrapper(queryClient, adapter),
      })

      expect(queryClient.isMutating({ mutationKey: ['queue-action'] })).toBe(0)

      act(() => {
        result.current.mutate({ type: 'pause', queueName: 'gateway_q' })
      })

      await waitFor(() => {
        expect(queryClient.isMutating({ mutationKey: ['queue-action'] })).toBe(1)
      })

      resolvePerformAction({ success: true })
      await waitFor(() => {
        expect(queryClient.isMutating({ mutationKey: ['queue-action'] })).toBe(0)
      })
    })
  })
})
